import React, { useState } from 'react';
import { Copy, Check, FileCode, Download } from 'lucide-react';

const BYTES_TOOLS_CPP = `#include "Camera.h"
#include "Float_union.h"
#include <iostream>


unsigned short Utils_bytes::get_short( char arr[], int index )
{
    unsigned short short_value = 
        ((  arr[index+1]    <<8)    &0xff00) |
        ((  arr[index])             &0x00ff) ;

    return short_value;
}

unsigned short Utils_bytes::get_swaped_short( char arr[], int index )
{
    // Swap is done using inverting index
    unsigned short short_value = 
        ((  arr[index]  <<8)    &0xff00) | 
        ((  arr[index+1])       &0x00ff) ;

    return short_value;
}

short Utils_bytes::swapShort( short short_value )
{
    short swapped_short =      
                ((  short_value <<8)    &0xff00)|
                ((  short_value >>8)    &0x00ff);

    return swapped_short;
}

int Utils_bytes::get_int( char arr[], int index )
{
    int int_value = 
        ((  arr[index+3]    <<24)   &0xff000000) | 
        ((  arr[index+2]    <<16)   &0x00ff0000) | 
        ((  arr[index+1]    <<8)    &0x0000ff00) | 
        ((  arr[index]      )       &0x000000ff) ;

    return int_value;
}

float Utils_bytes::get_float( char arr[], int index )
{
    // Create a 4 bytes variable from arr
    int four_bytes = 
        ((  arr[index]      <<24)   &0xff000000 ) | 
        ((  arr[index+1]    <<16)   &0x00ff0000 ) | 
        ((  arr[index+2]    <<8)    &0x0000ff00 ) | 
        ((  arr[index+3]    )       &0x000000ff ) ;

    Float_union f;
    // Set the four_bytes to the int union in order to access the float value
    f.intix  = four_bytes;
    return f.floatix;
}

float Utils_bytes::swapFloat( float float_value )
{
    // Use float union in order to get the bytes
    Float_union f;
    f.floatix = float_value;

    // Little endian
    int inverted_four_bytes = 
        ((  f.bytes[0]  <<24)   &0xff000000)   |
        ((  f.bytes[1]  <<16)   &0x00ff0000)   |
        ((  f.bytes[2]  <<8)    &0x0000ff00)   |   
        ((  f.bytes[3]  )       &0x000000ff) ;

    // Use float union in order to get float from the inverted four bytes
    Float_union f2;
    f2.intix  = inverted_four_bytes;
    return f2.floatix;
}`;

const RAM_TOOLS_CPP = `#include "utils_ram.h"
#include <windows.h>
#include <string>
#include <vector>
#include <tlhelp32.h>
#include <iostream>

using namespace std;

utils_ram::utils_ram()
{
}

utils_ram::~utils_ram()
{
}

HANDLE utils_ram::Open_process( wstring name)
{
    std::vector<DWORD> pids;
    std::wstring targetProcessName = name;//L"pcsx2.exe";//L"ePSXe.exe";

    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0); //all processes

    PROCESSENTRY32W entry; //current process
    entry.dwSize = sizeof entry;

    if (!Process32FirstW(snap, &entry))
    { //start with the first in snapshot
        return 0;
    }

    do {
        if (std::wstring(entry.szExeFile) == targetProcessName)
        {
            pids.emplace_back(entry.th32ProcessID); //name matches; add to list
        }
    }
    while (Process32NextW(snap, &entry)); //keep going until end of snapsho

    for (int i(0); i < pids.size(); ++i)
    {
        std::cout << pids[i] << std::endl;
    }

    DWORD access = PROCESS_VM_READ |
               PROCESS_QUERY_INFORMATION |
               PROCESS_VM_WRITE |
               PROCESS_VM_OPERATION;

    return OpenProcess(access, FALSE, pids[0]);
}

MEMORY_BASIC_INFORMATION utils_ram::getRegion(HANDLE process)
{
    unsigned char *p = NULL;
    MEMORY_BASIC_INFORMATION info;

    for ( p = NULL;
        VirtualQueryEx(process, p, &info, sizeof(info)) == sizeof(info);
        p += info.RegionSize )
    {
        std::vector<char> buffer;
        DWORD64 base = (DWORD64)info.BaseAddress;
        if (base > 0x15000000 &&
            info.Protect == PAGE_EXECUTE_READWRITE &&
            info.AllocationProtect == PAGE_EXECUTE_READWRITE &&

            info.Type == MEM_PRIVATE  &&
            info.State == MEM_COMMIT &&
            info.RegionSize == 0x2000000 )
        {
            return  info;
        }
    }

    std::cout << "Cant found the memory Region" << std::endl;
    return info;
}

void SetBreakpointRotationInAllThreads( )
{
    CONTEXT  wow64ctxt = {0};

    vector<HANDLE>::iterator it;     
    for( it = threads.begin(); it!= threads.end(); ++it)
    {
        HANDLE hThread = *it;
        wow64ctxt = getContext( hThread );
        wow64ctxt.Dr0 = adress_cam_rotx;
        wow64ctxt.Dr1 = adress_cam_roty;
        wow64ctxt.Dr2 = adress_cam_rotz;
        wow64ctxt.Dr3 = (DWORD64) 0x300423506;
        wow64ctxt.Dr6 = (DWORD64) 0x00000000;
        wow64ctxt.Dr7 = (DWORD64) 0x1DDD0455;//0x10001;
        SetThreadContext ( hThread, &wow64ctxt );

        ResumeThread(hThread);
    }
}

void RemoveBreakpointInAllThreads( )
{
    printf("RemoveBreakpointInAllThreads \\n");
    CONTEXT  wow64ctxt = {0};

    vector<HANDLE>::iterator it;    
    for( it = threads.begin(); it!= threads.end(); ++it)
    {
        HANDLE hThread = *it;
        wow64ctxt = getContext( hThread );
        wow64ctxt.Dr0 = (DWORD) 0x00000000;
        wow64ctxt.Dr6 = (DWORD) 0x00000000;
        wow64ctxt.Dr7 = (DWORD) 0x00000000;
        SetThreadContext ( hThread, &wow64ctxt );

        ResumeThread(hThread);
    }
}

DWORD64 utils_ram::Search_ram( HANDLE h, unsigned char to_find[], DWORD64 start_adress, DWORD64 end_adress, int len, int decallage  )
{
    unsigned char buf[10240];
    DWORD64 adress = start_adress;
    DWORD64 results[100];
    int num_result = 0;
    DWORD64 base = 0;
    int i = 0;
    int current_i;
    unsigned char test_char;
    unsigned char valid_char;
    int lenMoinsUn = len -1;

    while ( adress < end_adress )
    {
        ReadProcessMemory(h, (void*)adress, (void*)&buf, sizeof(buf), NULL);
        base = 0;
        i = 0;

        for ( base; base < 10240 - len; base++ )
        {
            for ( i = 0 ; i <= len; i++)
            {
                if ( buf[ base + i ] == to_find[i] || to_find[ i ] == ( unsigned char )0xff)
                {
                    if ( i == lenMoinsUn  )
                    {
                        DWORD64 result = adress + base + decallage;
                        return result;
                    }
                }
                else
                {
                    break;
                }
            }
        }
        adress += 10240 - len;
    }
    return ( DWORD64 ) 0;
}`;

const FLOAT_UNION_H = `// Float_union.h
#pragma once

union Float_union {
    int intix;
    float floatix;
    unsigned char bytes[4];
};`;

const UTILS_RAM_H = `// utils_ram.h
#pragma once
#include <windows.h>
#include <string>

class utils_ram {
public:
    utils_ram();
    ~utils_ram();

    static HANDLE Open_process(std::wstring name);
    static MEMORY_BASIC_INFORMATION getRegion(HANDLE process);
    static DWORD64 Search_ram(HANDLE h, unsigned char to_find[], DWORD64 start_adress, DWORD64 end_adress, int len, int decallage);
};`;

export const CodeViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<'bytes' | 'ram' | 'union' | 'ram_h'>('bytes');
  const [copied, setCopied] = useState<boolean>(false);

  const getCode = () => {
    switch (selectedFile) {
      case 'bytes':
        return BYTES_TOOLS_CPP;
      case 'ram':
        return RAM_TOOLS_CPP;
      case 'union':
        return FLOAT_UNION_H;
      case 'ram_h':
        return UTILS_RAM_H;
    }
  };

  const getFilename = () => {
    switch (selectedFile) {
      case 'bytes':
        return 'bytes-tools.cpp';
      case 'ram':
        return 'ram-tools.cpp';
      case 'union':
        return 'Float_union.h';
      case 'ram_h':
        return 'utils_ram.h';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([getCode()], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = getFilename();
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center space-x-2">
          <FileCode className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-slate-100">C++ Source Files & Headers</h2>
        </div>

        {/* File Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setSelectedFile('bytes')}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition ${
              selectedFile === 'bytes'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            bytes-tools.cpp
          </button>
          <button
            onClick={() => setSelectedFile('ram')}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition ${
              selectedFile === 'ram'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            ram-tools.cpp
          </button>
          <button
            onClick={() => setSelectedFile('union')}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition ${
              selectedFile === 'union'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Float_union.h
          </button>
          <button
            onClick={() => setSelectedFile('ram_h')}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition ${
              selectedFile === 'ram_h'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            utils_ram.h
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition shadow-md shadow-blue-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Code Editor / Syntax View */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400 font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
            <span className="ml-2 font-semibold text-slate-200">{getFilename()}</span>
          </div>
          <span>C++20 / MSVC / GCC</span>
        </div>

        <div className="p-4 sm:p-6 overflow-x-auto max-h-[650px] overflow-y-auto">
          <pre className="text-xs sm:text-sm font-mono text-slate-300 leading-relaxed font-mono">
            {getCode()
              .split('\n')
              .map((line, idx) => (
                <div key={idx} className="table-row">
                  <span className="table-cell pr-6 text-slate-600 select-none text-right text-xs">
                    {idx + 1}
                  </span>
                  <span className="table-cell">{line}</span>
                </div>
              ))}
          </pre>
        </div>
      </div>
    </div>
  );
};
