# RAM_Tools

Small C++/Win32 utilities for inspecting and searching the memory of a running Windows process, with helpers for byte-order and floating-point conversions.

> **Status:** legacy / experimental code. The repository is Windows-specific and currently contains only the implementation files tracked in the repository.

## Overview

The project contains two main utility areas:

- `ram-tools.cpp` — process discovery, process opening, virtual-memory region inspection, byte-pattern searching, and thread debug-register breakpoint helpers.
- `bytes-tools.cpp` — conversion helpers for 16-bit integers, 32-bit integers, and floating-point values, including byte swapping.

## Platform

The code uses the Windows API (`windows.h`, Tool Help snapshots, process memory APIs, and thread contexts), so it is intended for **Windows**.

## Important note about the current repository

The implementation files reference project headers such as `utils_ram.h`, `Camera.h`, and `Float_union.h`. Those headers are not present in the current repository tree, so the repository cannot be considered self-contained or guaranteed to compile from a clean checkout without the missing project files.

## Technical notes

### Process and memory utilities

`ram-tools.cpp` uses the Windows Tool Help API to enumerate processes by executable name and then calls `OpenProcess` with permissions required for reading and writing virtual memory. It also uses `VirtualQueryEx` to locate a memory region matching a set of hard-coded characteristics.

`Search_ram` reads the target process in 10 KiB chunks and searches for a byte pattern. A pattern byte equal to `0xFF` is treated as a wildcard. The function returns the first matching address, adjusted by the supplied offset.

### Thread breakpoints

The breakpoint helpers manipulate x86/x64 debug registers through `CONTEXT` and `SetThreadContext`. They are designed to install or remove hardware breakpoints across a collection of thread handles.

### Byte utilities

`bytes-tools.cpp` provides explicit byte-level conversions. The functions distinguish between little-endian and swapped representations and use `Float_union` to reinterpret four bytes as a `float` without changing the underlying bit representation.

## Code-quality scope of the current cleanup

The maintenance branch is intentionally limited to:

- documentation;
- explanatory comments;
- whitespace and indentation formatting;
- consistent readability improvements.

No intended runtime behavior, algorithms, constants, API calls, or data-flow logic are changed by this cleanup.

## Known technical debt

The existing implementation should be treated as legacy code. Examples include missing null/error handling in some Windows API paths, assumptions about the presence of at least one matching process, hard-coded memory-region characteristics, fixed-size search buffers/results, and architecture-specific thread-context handling. These are documented here rather than changed, because the goal of this branch is documentation and formatting only.

## License

No license file is currently present in the repository. Unless a license is added, the repository should be treated as having no explicit open-source license.
