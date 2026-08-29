#include "utils_ram.h"
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
    printf("RemoveBreakpointInAllThreads \n");
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

DWORD64 utils_ram::Search_ram( HANDLE h, unsigned char to_find[], DWORD64 start_adress, DWORD64 end_adress, int len, int decallage  )         // function definition
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

}