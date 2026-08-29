#include "utils_ram.h"
#include <iostream>
#include <string>
#include <tlhelp32.h>
#include <vector>
#include <windows.h>

using namespace std;

utils_ram::utils_ram()
{
}

utils_ram::~utils_ram()
{
}

/**
 * @brief Finds a process by executable name using Windows Toolhelp snapshot and opens a handle to it.
 *
 * @param name The target executable name (e.g. L"pcsx2.exe" or L"ePSXe.exe").
 * @return HANDLE Open process handle with VM read/write and query permissions, or NULL (0) if not found/failed.
 */
HANDLE utils_ram::Open_process(wstring name)
{
    std::vector<DWORD> pids;
    std::wstring targetProcessName = name; // L"pcsx2.exe"; // L"ePSXe.exe";

    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0); // Snapshot all processes

    PROCESSENTRY32W entry; // Current process entry
    entry.dwSize = sizeof entry;

    if (!Process32FirstW(snap, &entry))
    { // Start with the first process in snapshot
        return 0;
    }

    do
    {
        if (std::wstring(entry.szExeFile) == targetProcessName)
        {
            pids.emplace_back(entry.th32ProcessID); // Name matches; add PID to list
        }
    } while (Process32NextW(snap, &entry)); // Keep going until end of snapshot

    for (size_t i = 0; i < pids.size(); ++i)
    {
        std::cout << pids[i] << std::endl;
    }

    DWORD access = PROCESS_VM_READ |
                   PROCESS_QUERY_INFORMATION |
                   PROCESS_VM_WRITE |
                   PROCESS_VM_OPERATION;

    return OpenProcess(access, FALSE, pids[0]);
}

/**
 * @brief Queries virtual memory regions of a target process to locate a specific committed RAM region.
 *
 * @param process Handle to the target process.
 * @return MEMORY_BASIC_INFORMATION Information structure describing the located memory region.
 */
MEMORY_BASIC_INFORMATION utils_ram::getRegion(HANDLE process)
{
    unsigned char *p = NULL;
    MEMORY_BASIC_INFORMATION info;

    for (p = NULL;
         VirtualQueryEx(process, p, &info, sizeof(info)) == sizeof(info);
         p += info.RegionSize)
    {
        std::vector<char> buffer;
        DWORD64 base = (DWORD64)info.BaseAddress;
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

    std::cout << "Cant found the memory Region" << std::endl;
    return info;
}

/**
 * @brief Sets hardware breakpoints for camera rotation across all target threads by configuring debug registers (Dr0-Dr7).
 */
void SetBreakpointRotationInAllThreads()
{
    CONTEXT wow64ctxt = {0};

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
        wow64ctxt.Dr7 = (DWORD64)0x1DDD0455; // 0x10001;
        SetThreadContext(hThread, &wow64ctxt);

        ResumeThread(hThread);
    }
}

/**
 * @brief Clears hardware breakpoints across all target threads by resetting debug registers.
 */
void RemoveBreakpointInAllThreads()
{
    printf("RemoveBreakpointInAllThreads \n");
    CONTEXT wow64ctxt = {0};

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

/**
 * @brief Searches a memory range in a target process for a specific byte pattern.
 *
 * @param h Handle to target process.
 * @param to_find Array of bytes to search for. 0xFF acts as a wildcard byte.
 * @param start_adress Starting address of the RAM search range.
 * @param end_adress Ending address of the RAM search range.
 * @param len Length of the byte pattern in bytes.
 * @param decallage Offset added to matched address.
 * @return DWORD64 The memory address where the pattern was found, or 0 if not found.
 */
DWORD64 utils_ram::Search_ram(HANDLE h, unsigned char to_find[], DWORD64 start_adress, DWORD64 end_adress, int len, int decallage)
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

    while (adress < end_adress)
    {
        ReadProcessMemory(h, (void *)adress, (void *)&buf, sizeof(buf), NULL);
        base = 0;
        i = 0;

        for (base = 0; base < 10240 - len; base++)
        {
            for (i = 0; i <= len; i++)
            {
                if (buf[base + i] == to_find[i] || to_find[i] == (unsigned char)0xff)
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
        adress += 10240 - len;
    }
    return (DWORD64)0;
}
