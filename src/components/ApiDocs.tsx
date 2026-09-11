import React from 'react';
import { BookOpen, Shield, Binary } from 'lucide-react';

export const ApiDocs: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
          <BookOpen className="w-6 h-6 text-blue-400" />
          <span>API Specification & Implementation Guide</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Complete documentation of memory routines, endianness mechanics, and Windows API wrappers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Byte Tools Reference */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2 text-blue-400 font-semibold text-base border-b border-slate-800 pb-3">
            <Binary className="w-5 h-5" />
            <span>`Utils_bytes` Class Reference</span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <code className="text-cyan-400 font-bold font-mono">
                unsigned short get_short(char arr[], int index)
              </code>
              <p className="text-slate-400 mt-1">
                Reads 2 contiguous bytes starting at <code className="text-slate-300">index</code> and packs them into a 16-bit unsigned short in Little-Endian byte order (<code className="text-slate-300">arr[index+1]&lt;&lt;8 | arr[index]</code>).
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <code className="text-indigo-400 font-bold font-mono">
                unsigned short get_swaped_short(char arr[], int index)
              </code>
              <p className="text-slate-400 mt-1">
                Reads 2 contiguous bytes and packs them in Big-Endian order (<code className="text-slate-300">arr[index]&lt;&lt;8 | arr[index+1]</code>).
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <code className="text-emerald-400 font-bold font-mono">
                short swapShort(short short_value)
              </code>
              <p className="text-slate-400 mt-1">
                Swaps high and low 8-bit bytes of a signed 16-bit integer using bitshifts (<code className="text-slate-300">val&lt;&lt;8 &amp; 0xff00 | val&gt;&gt;8 &amp; 0x00ff</code>).
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <code className="text-amber-400 font-bold font-mono">
                float get_float(char arr[], int index) / swapFloat(float val)
              </code>
              <p className="text-slate-400 mt-1">
                Converts 4 raw memory bytes to single-precision IEEE 754 float using a <code className="text-slate-300">Float_union</code> structure without undefined strict-aliasing penalties.
              </p>
            </div>
          </div>
        </div>

        {/* RAM Tools Reference */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-base border-b border-slate-800 pb-3">
            <Shield className="w-5 h-5" />
            <span>`utils_ram` Class Reference</span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <code className="text-cyan-400 font-bold font-mono">
                HANDLE Open_process(std::wstring name)
              </code>
              <p className="text-slate-400 mt-1">
                Uses <code className="text-slate-300">CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)</code> and <code className="text-slate-300">Process32FirstW/NextW</code> to locate target process by executable name and open a handle with <code className="text-slate-300">PROCESS_VM_READ | PROCESS_VM_WRITE | PROCESS_VM_OPERATION</code> permissions.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <code className="text-emerald-400 font-bold font-mono">
                MEMORY_BASIC_INFORMATION getRegion(HANDLE process)
              </code>
              <p className="text-slate-400 mt-1">
                Queries virtual memory descriptors via <code className="text-slate-300">VirtualQueryEx</code> in a pointer walk loop to identify the primary 32MB (<code className="text-slate-300">0x2000000</code>) memory block allocated with <code className="text-slate-300">PAGE_EXECUTE_READWRITE</code> and <code className="text-slate-300">MEM_COMMIT</code>.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <code className="text-rose-400 font-bold font-mono">
                DWORD64 Search_ram(HANDLE h, unsigned char to_find[], ...)
              </code>
              <p className="text-slate-400 mt-1">
                Streams chunks of 10,240 bytes through <code className="text-slate-300">ReadProcessMemory</code> and applies wildcard byte comparison (<code className="text-slate-300">0xFF</code> represents any byte) to locate instruction needles with an optional pointer displacement offset (<code className="text-slate-300">decallage</code>).
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <code className="text-amber-400 font-bold font-mono">
                SetBreakpointRotationInAllThreads()
              </code>
              <p className="text-slate-400 mt-1">
                Suspends threads, extracts CPU thread context registers (<code className="text-slate-300">GetThreadContext</code>), sets Debug Registers <code className="text-slate-300">Dr0..Dr3</code> to watch camera rotation vectors, sets <code className="text-slate-300">Dr7 = 0x1DDD0455</code>, and calls <code className="text-slate-300">SetThreadContext</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
