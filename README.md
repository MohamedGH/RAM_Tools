# Bytes and RAM Tools

This repository provides utility functions in C++ for binary byte manipulation, endianness conversion, target process memory management, memory searching, and thread debug context manipulation (hardware breakpoints) for Windows platform analysis (e.g., emulator memory inspection).

## Features

### Byte Utility Tools (`bytes-tools.cpp`)
- **Integer & Short Conversions**: Extracts 16-bit shorts and 32-bit integers from raw byte arrays in little-endian or big-endian orders.
- **Endianness Swapping**: Reverses byte order for 16-bit short integers and 32-bit floating-point numbers using type punning unions (`Float_union`).
- **Float Extraction**: Converts multi-byte raw buffer slices into single-precision floating-point numbers.

### RAM Utility Tools (`ram-tools.cpp`)
- **Process Enumeration & Handle Opening (`Open_process`)**: Uses Windows Tool Help Snapshots (`CreateToolhelp32Snapshot`, `Process32FirstW`/`Process32NextW`) to locate target executable processes by process name and obtain process handles with VM read/write permissions.
- **Memory Region Querying (`getRegion`)**: Uses `VirtualQueryEx` to inspect target process memory blocks and identify specific committed memory regions (e.g., PS2/PS1 emulator RAM buffers).
- **RAM Pattern Searching (`Search_ram`)**: Performs buffer scanning across process memory ranges using `ReadProcessMemory` to locate sequence byte patterns, supporting wildcard matching (`0xFF`).
- **Hardware Breakpoints (`SetBreakpointRotationInAllThreads` & `RemoveBreakpointInAllThreads`)**: Configures x86/x64 debug registers (`Dr0`-`Dr7`) on thread contexts to set or clear hardware execution/read/write breakpoints.

## Codebase Structure

```
├── bytes-tools.cpp    # Implementation of byte extraction and endianness conversion functions
└── ram-tools.cpp      # Implementation of Windows RAM scanning and hardware breakpoint context utilities
```

## Requirements & Building

- **Target OS**: Windows (requires `<windows.h>`, `<tlhelp32.h>`).
- **Compiler**: Visual C++ (MSVC) or MinGW g++ with C++11 or later support.

Example build using MinGW:
```bash
g++ -c bytes-tools.cpp -o bytes-tools.o
g++ -c ram-tools.cpp -o ram-tools.o
```
