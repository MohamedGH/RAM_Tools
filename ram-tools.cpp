// Include utility functions for RAM manipulation
#include "utils_ram.h"
// Include Windows API for process and memory manipulation
#include <windows.h>
// Include string class for wide string support
#include <string>
// Include vector for dynamic arrays
#include <vector>
// Include toolhelp32 for process enumeration
#include <tlhelp32.h>
// Include iostream for console output
#include <iostream>

// Use standard namespace to avoid std:: prefix
using namespace std;


// Constructor for utils_ram class (empty implementation)
utils_ram::utils_ram()
{
}

// Destructor for utils_ram class (empty implementation)
utils_ram::~utils_ram()
{
}

// Open a process by name and return its handle for memory operations
HANDLE utils_ram::Open_process( wstring name)
{
    // Vector to store process IDs of matching processes
    std::vector<DWORD> pids;
    // Store the target process name to search for
    std::wstring targetProcessName = name;//L"pcsx2.exe";//L"ePSXe.exe";

    // Create a snapshot of all running processes
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0); //all processes

    // Structure to hold information about each process in the snapshot
    PROCESSENTRY32W entry; //current process
    // Set the size field of the structure (required by Windows API)
    entry.dwSize = sizeof entry;


    // Attempt to get the first process in the snapshot
    if (!Process32FirstW(snap, &entry))
    { //start with the first in snapshot
        // Return 0 (null handle) if snapshot is empty
        return 0;
    }

    // Iterate through all processes in the snapshot
    do {
        // Check if the current process name matches our target
        if (std::wstring(entry.szExeFile) == targetProcessName)
        {
            // Add this process ID to our list if it matches
            pids.emplace_back(entry.th32ProcessID); //name matches; add to list
        }
    }

    // Continue to next process until end of snapshot
    while (Process32NextW(snap, &entry)); //keep going until end of snapshot

    // Print all found process IDs for debugging
    for (int i(0); i < pids.size(); ++i)
    {
        // Output each process ID to console
        std::cout << pids[i] << std::endl;
    }

    // FIX: Added safety check to prevent accessing empty vector
    if (pids.empty())
    {
        // Return 0 if no matching processes were found
        return 0;
    }

    // Define access rights for opening the process
    DWORD access = PROCESS_VM_READ |           // Permission to read process memory
               PROCESS_QUERY_INFORMATION |     // Permission to query process info
               PROCESS_VM_WRITE |              // Permission to write process memory
               PROCESS_VM_OPERATION;           // Permission for memory operations

    // Open the first matching process with specified access rights and return handle
    return OpenProcess(access, FALSE, pids[0]);
}

// Find a memory region matching specific criteria in the target process
MEMORY_BASIC_INFORMATION utils_ram::getRegion(HANDLE process)
{
    // Pointer to scan through process memory, starting from NULL (address 0)
    unsigned char *p = NULL;
    // Structure to store information about current memory region
    MEMORY_BASIC_INFORMATION info;

    // Loop through all memory regions in the process
    for ( p = NULL;
        // Query the memory region at address p and continue if valid
        VirtualQueryEx(process, p, &info, sizeof(info)) == sizeof(info);
        // Advance to the next memory region
        p += info.RegionSize )
    {
        // Unused buffer vector (consider removing in future cleanup)
        std::vector<char> buffer;
        // Convert the base address of this region to 64-bit format
        DWORD64 base = (DWORD64)info.BaseAddress;
        // Check if this memory region matches our search criteria:
        if (base > 0x15000000 &&                              // Base address above this threshold
            info.Protect == PAGE_EXECUTE_READWRITE &&         // Has execute and read/write permissions
            info.AllocationProtect == PAGE_EXECUTE_READWRITE && // Was allocated with these permissions
            
            info.Type == MEM_PRIVATE  &&                      // Is private (not shared) memory
            info.State == MEM_COMMIT &&                       // Region is committed (not reserved)
            info.RegionSize == 0x2000000 )                    // Region size is exactly 32 MB
        {
            // Return this matching memory region information
            return  info;
        }
    }

    // Print error message if no matching memory region was found
    std::cout << "Cant found the memory Region" << std::endl;
    // Return the last queried region info (even if not a match)
    return info;
}


// Set debug breakpoints on camera rotation addresses in all running threads
void SetBreakpointRotationInAllThreads( )
{
    // Initialize thread context structure to zero
    CONTEXT  wow64ctxt = {0};

    // Iterator for traversing the thread collection
    vector<HANDLE>::iterator it;     
    // Loop through all thread handles in the threads vector
    for( it = threads.begin(); it!= threads.end(); ++it)
    {
        // Dereference iterator to get current thread handle
        HANDLE hThread = *it;
        // Get the current execution context (registers) of the thread
        wow64ctxt = getContext( hThread );
        // Set debug register 0 to camera rotation X address
        wow64ctxt.Dr0 = adress_cam_rotx;
        // Set debug register 1 to camera rotation Y address
        wow64ctxt.Dr1 = adress_cam_roty;
        // Set debug register 2 to camera rotation Z address
        wow64ctxt.Dr2 = adress_cam_rotz;
        // Set debug register 3 (unused breakpoint in this context)
        wow64ctxt.Dr3 = (DWORD64) 0x300423506;
        // Clear debug register 6 (status register)
        wow64ctxt.Dr6 = (DWORD64) 0x00000000;
        // Set debug register 7 (control register) with breakpoint flags
        wow64ctxt.Dr7 = (DWORD64) 0x1DDD0455;//0x10001;
        // Apply the modified context back to the thread
        SetThreadContext ( hThread, &wow64ctxt );

        // Resume thread execution after setting breakpoints
        ResumeThread(hThread);
    }
}

// Remove all debug breakpoints from all running threads
void RemoveBreakpointInAllThreads( )
{
    // Print debug message indicating function execution
    printf("RemoveBreakpointInAllThreads \n");
    // Initialize thread context structure to zero
    CONTEXT  wow64ctxt = {0};

    // Iterator for traversing the thread collection
    vector<HANDLE>::iterator it;    
    // Loop through all thread handles in the threads vector
    for( it = threads.begin(); it!= threads.end(); ++it)
    {
        // Dereference iterator to get current thread handle
        HANDLE hThread = *it;
        // Get the current execution context (registers) of the thread
        wow64ctxt = getContext( hThread );
        // Clear debug register 0 (remove breakpoint on address 0)
        wow64ctxt.Dr0 = (DWORD) 0x00000000;
        // Clear debug register 6 (clear status flags)
        wow64ctxt.Dr6 = (DWORD) 0x00000000;
        // Clear debug register 7 (disable all breakpoints)
        wow64ctxt.Dr7 = (DWORD) 0x00000000;
        // Apply the modified context back to the thread
        SetThreadContext ( hThread, &wow64ctxt );

        // Resume thread execution after removing breakpoints

        ResumeThread(hThread);

    }
}

// Search for a byte pattern in process memory within a specified address range
DWORD64 utils_ram::Search_ram( HANDLE h, unsigned char to_find[], DWORD64 start_adress, DWORD64 end_adress, int len, int decallage  )         // function definition
{
    // Buffer to hold chunks of process memory read during search
    unsigned char buf[10240];
    // Current address being scanned in the process memory
    DWORD64 adress = start_adress;
    // Array to store found match addresses (currently unused)
    DWORD64 results[100];
    // Counter for number of matches found (currently unused)
    int num_result = 0;
    // Offset within the current buffer being checked
    DWORD64 base = 0;
    // Loop counter for pattern matching
    int i = 0;
    // Unused variable for tracking current index
    int current_i;
    // Unused variable for storing test character
    unsigned char test_char;
    // Unused variable for storing valid character
    unsigned char valid_char;
    // Store pattern length minus one to optimize comparison loop
    int lenMoinsUn = len -1;


    // Continue scanning while current address is within search range
    while ( adress < end_adress )
    {
        // Read a chunk of memory from the target process starting at current address
        ReadProcessMemory(h, (void*)adress, (void*)&buf, sizeof(buf), NULL);
        // Reset offset counter for this buffer
        base = 0;
        // Reset pattern match counter
        i = 0;

        // Scan through the entire buffer for pattern matches
        for ( base; base < 10240 - len; base++ )
        {
            // FIX: Changed loop condition from 'i <= len' to 'i < len' to prevent buffer overflow
            // Compare each byte of the pattern with buffer (0xFF is wildcard)
            for ( i = 0 ; i < len; i++)
            {
                // Check if byte matches pattern or pattern byte is wildcard (0xFF)
                if ( buf[ base + i ] == to_find[i] || to_find[ i ] == ( unsigned char )0xff)
                {
                    // Check if we've matched the entire pattern
                    if ( i == lenMoinsUn  )
                    {
                        // Calculate the actual process address of the match
                        DWORD64 result = adress + base + decallage;
                        // Return the matched address immediately
                        return result;
                    }
                }
                else
                {
                    // Pattern mismatch - break inner loop and try next offset
                    break;
                }
            }

        }
        // Move to next chunk of memory (with overlap to catch patterns at boundaries)
        adress += 10240 - len;
    }
    // Return 0 if no pattern match was found
    return ( DWORD64 ) 0;

}
