#include "utils_ram.h"

#include <windows.h>

#include <iostream>
#include <string>
#include <tlhelp32.h>
#include <vector>

using namespace std;

utils_ram::utils_ram()
{
}

utils_ram::~utils_ram()
{
}

HANDLE utils_ram::Open_process(wstring name)
{
    vector<DWORD> pids;
    wstring targetProcessName = name;

    // Take a snapshot containing all processes currently visible to the caller.
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);

    PROCESSENTRY32W entry;
    entry.dwSize = sizeof entry;

    // Start enumerating at the first process in the snapshot.
    if (!Process32FirstW(snap, &entry))
    {
        return 0;
    }

    // Collect the process IDs whose executable name matches the requested name.
    do
    {
        if (wstring(entry.szExeFile) == targetProcessName)
        {
            pids.emplace_back(entry.th32ProcessID);
        }
    }
    while (Process32NextW(snap, &entry));

    // Preserve the original diagnostic output of all matching process IDs.
    for (int i(0); i < pids.size(); ++i)
    {
        cout << pids[i] << endl;
    }

    // Request the permissions needed by the memory-reading/writing utilities.
    DWORD access = PROCESS_VM_READ |
                   PROCESS_QUERY_INFORMATION |
                   PROCESS_VM_WRITE |
                   PROCESS_VM_OPERATION;

    // The original implementation opens the first matching process.
    return OpenProcess(access, FALSE, pids[0]);
}

MEMORY_BASIC_INFORMATION utils_ram::getRegion(HANDLE process)
{
    unsigned char* p = NULL;
    MEMORY_BASIC_INFORMATION info;

    // Walk through the target process address space one virtual-memory region at a time.
    for (p = NULL;
         VirtualQueryEx(process, p, &info, sizeof(info)) == sizeof(info);
         p += info.RegionSize)
    {
        vector<char> buffer;
        DWORD64 base = (DWORD64)info.BaseAddress;

        // Keep the original region-selection criteria. They identify the memory
        // region expected by the application using this legacy utility.
        if (base > 0x15000000 &&
            info.Protect == PAGE_EXECUTE_READWRITE &&
            info.AllocationProtect == PAGE_EXECUTE_READWRITE &&
            info.Type == MEM_PRIVATE &&
            info.State == MEM_COMMIT &&
            info.RegionSize == 0x2000000)
        {
            return info;
        }
    }

    cout << "Cant found the memory Region" << endl;
    return info;
}

void SetBreakpointRotationInAllThreads()
{
    CONTEXT wow64ctxt = {0};

    // Apply the configured debug-register values to every thread handle.
    vector<HANDLE>::iterator it;
    for (it = threads.begin(); it != threads.end(); ++it)
    {
        HANDLE hThread = *it;
        wow64ctxt = getContext(hThread);
        wow64ctxt.Dr0 = adress_cam_rotx;
        wow64ctxt.Dr1 = adress_cam_roty;
        wow64ctxt.Dr2 = adress_cam_rotz;
        wow64ctxt.Dr3 = (DWORD64)0x300423506;
        wow64ctxt.Dr6 = (DWORD64)0x00000000;
        wow64ctxt.Dr7 = (DWORD64)0x1DDD0455;
        SetThreadContext(hThread, &wow64ctxt);

        ResumeThread(hThread);
    }
}

void RemoveBreakpointInAllThreads()
{
    printf("RemoveBreakpointInAllThreads \n");
    CONTEXT wow64ctxt = {0};

    // Clear the debug registers previously configured on each thread.
    vector<HANDLE>::iterator it;
    for (it = threads.begin(); it != threads.end(); ++it)
    {
        HANDLE hThread = *it;
        wow64ctxt = getContext(hThread);
        wow64ctxt.Dr0 = (DWORD)0x00000000;
        wow64ctxt.Dr6 = (DWORD)0x00000000;
        wow64ctxt.Dr7 = (DWORD)0x00000000;
        SetThreadContext(hThread, &wow64ctxt);

        ResumeThread(hThread);
    }
}

DWORD64 utils_ram::Search_ram(
    HANDLE h,
    unsigned char to_find[],
    DWORD64 start_adress,
    DWORD64 end_adress,
    int len,
    int decallage)
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
    int lenMoinsUn = len - 1;

    // Scan the requested address range in fixed 10 KiB chunks.
    while (adress < end_adress)
    {
        ReadProcessMemory(h, (void*)adress, (void*)&buf, sizeof(buf), NULL);
        base = 0;
        i = 0;

        // Search the current chunk for the requested byte pattern.
        for (base; base < 10240 - len; base++)
        {
            for (i = 0; i <= len; i++)
            {
                // 0xFF is retained as the original wildcard marker.
                if (buf[base + i] == to_find[i] ||
                    to_find[i] == (unsigned char)0xff)
                {
                    if (i == lenMoinsUn)
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

        // Advance by the portion of the chunk that was actually searched.
        adress += 10240 - len;
    }

    return (DWORD64)0;
}
