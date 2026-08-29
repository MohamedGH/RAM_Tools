import React, { useState, useMemo } from 'react';
import { CppRamTools } from '../utils/cppEngine';
import { MemoryRegion, ThreadContext } from '../types';
import { Shield, Search, Cpu, Crosshair, CheckCircle } from 'lucide-react';

export const RamToolsStudio: React.FC = () => {
  const [targetProcess, setTargetProcess] = useState<string>('pcsx2.exe');
  const [pid] = useState<number>(4192);

  // Pattern search inputs
  const [patternInput, setPatternInput] = useState<string>('8B 44 24 FF 89 05 FF FF 00 00');
  const [startAddrHex, setStartAddrHex] = useState<string>('0x15000000');
  const [endAddrHex, setEndAddrHex] = useState<string>('0x17000000');
  const [decallage, setDecallage] = useState<number>(4);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [foundAddrHex, setFoundAddrHex] = useState<string | null>(null);

  // Breakpoints state
  const [breakpointsActive, setBreakpointsActive] = useState<boolean>(false);
  const [threads, setThreads] = useState<ThreadContext[]>([
    {
      threadId: 10420,
      dr0: '0x00000000',
      dr1: '0x00000000',
      dr2: '0x00000000',
      dr3: '0x00000000',
      dr6: '0x00000000',
      dr7: '0x00000000',
      status: 'Running',
    },
    {
      threadId: 10424,
      dr0: '0x00000000',
      dr1: '0x00000000',
      dr2: '0x00000000',
      dr3: '0x00000000',
      dr6: '0x00000000',
      dr7: '0x00000000',
      status: 'Running',
    },
    {
      threadId: 10428,
      dr0: '0x00000000',
      dr1: '0x00000000',
      dr2: '0x00000000',
      dr3: '0x00000000',
      dr6: '0x00000000',
      dr7: '0x00000000',
      status: 'Running',
    },
  ]);

  // Mock Simulated Memory Map
  const memoryRegions: MemoryRegion[] = useMemo(
    () => [
      {
        baseAddress: '0x00400000',
        baseAddressNum: 0x00400000,
        regionSize: '0x00120000',
        regionSizeNum: 0x00120000,
        protect: 'PAGE_EXECUTE_READ',
        state: 'MEM_COMMIT',
        type: 'MEM_IMAGE',
        matchesCriteria: false,
        notes: 'Main Executable Code Section',
      },
      {
        baseAddress: '0x01200000',
        baseAddressNum: 0x01200000,
        regionSize: '0x00800000',
        regionSizeNum: 0x00800000,
        protect: 'PAGE_READWRITE',
        state: 'MEM_COMMIT',
        type: 'MEM_PRIVATE',
        matchesCriteria: false,
        notes: 'Heap Allocation Area',
      },
      {
        baseAddress: '0x15800000',
        baseAddressNum: 0x15800000,
        regionSize: '0x02000000',
        regionSizeNum: 0x02000000, // 32MB exactly (0x2000000)
        protect: 'PAGE_EXECUTE_READWRITE',
        state: 'MEM_COMMIT',
        type: 'MEM_PRIVATE',
        matchesCriteria: true,
        notes: 'Target Emulator 32MB Main RAM (matches getRegion criteria)',
      },
      {
        baseAddress: '0x18000000',
        baseAddressNum: 0x18000000,
        regionSize: '0x01000000',
        regionSizeNum: 0x01000000,
        protect: 'PAGE_READWRITE',
        state: 'MEM_COMMIT',
        type: 'MEM_MAPPED',
        matchesCriteria: false,
        notes: 'Video RAM Texture Cache',
      },
    ],
    []
  );

  // Synthetic RAM buffer for searching (64KB sample chunk)
  const syntheticRam = useMemo(() => {
    const buf = new Uint8Array(65536);
    // Fill with random instructions & data
    for (let i = 0; i < buf.length; i++) {
      buf[i] = (i * 37 + (i >> 3)) & 0xff;
    }
    // Inject known signature at offset 0x4200: 8B 44 24 10 89 05 34 12 00 00
    const signature = [0x8b, 0x44, 0x24, 0x10, 0x89, 0x05, 0x34, 0x12, 0x00, 0x00];
    for (let j = 0; j < signature.length; j++) {
      buf[0x4200 + j] = signature[j];
    }
    return buf;
  }, []);

  // Handle Search_ram execution
  const executeRamSearch = () => {
    const patternBytes = patternInput
      .replace(/[^0-9a-fA-F]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((hex) => parseInt(hex, 16) & 0xff);

    if (patternBytes.length === 0) {
      setSearchStatus('Invalid pattern');
      return;
    }

    const start = parseInt(startAddrHex, 16) || 0;
    const end = parseInt(endAddrHex, 16) || (start + syntheticRam.length);
    const searchRange = Math.min(syntheticRam.length, Math.max(end - start, 0));

    // Search synthetic RAM
    const result = CppRamTools.searchRam(
      syntheticRam,
      patternBytes,
      0,
      searchRange,
      patternBytes.length,
      decallage
    );

    if (result.foundAddress !== null) {
      const computedAddr = (start + result.foundAddress).toString(16).toUpperCase();
      setFoundAddrHex('0x' + computedAddr);
      setSearchStatus(`Pattern matched at offset +0x${result.foundAddress.toString(16).toUpperCase()} (Decallage applied: +${decallage})`);
    } else {
      setFoundAddrHex(null);
      setSearchStatus(`Pattern not found in scanned ${result.scannedCount} byte offsets`);
    }
  };

  // Toggle hardware breakpoints
  const toggleBreakpoints = (enable: boolean) => {
    setBreakpointsActive(enable);
    setThreads((prev) =>
      prev.map((th) => ({
        ...th,
        dr0: enable ? '0x15802100' : '0x00000000',
        dr1: enable ? '0x15802104' : '0x00000000',
        dr2: enable ? '0x15802108' : '0x00000000',
        dr3: enable ? '0x300423506' : '0x00000000',
        dr6: '0x00000000',
        dr7: enable ? '0x1DDD0455' : '0x00000000',
        status: enable ? 'Breakpoint Hit' : 'Running',
      }))
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Shield className="w-3.5 h-3.5" />
              <span>Windows Memory API Engine (ram-tools.cpp)</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Process RAM & Memory Inspection Studio</h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Simulate `VirtualQueryEx` page scanning, `Search_ram` wildcard pattern matching, and hardware breakpoint thread context inspection.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">Target Process:</span>
            <input
              type="text"
              value={targetProcess}
              onChange={(e) => setTargetProcess(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-cyan-400 font-bold focus:outline-none"
            />
            <span className="text-xs font-mono text-slate-400">PID: {pid}</span>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: VirtualQueryEx & Memory Region Analyzer */}
        <div className="lg:col-span-7 space-y-6">
          {/* VirtualQueryEx Region Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-200 flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  <span>VirtualQueryEx Memory Region Scanner</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Filters for: <code className="text-blue-400 font-mono">base &gt; 0x15000000</code>,{' '}
                  <code className="text-blue-400 font-mono">PAGE_EXECUTE_READWRITE</code>,{' '}
                  <code className="text-blue-400 font-mono">Size == 0x2000000 (32MB)</code>
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                    <th className="py-2.5 px-3">Base Address</th>
                    <th className="py-2.5 px-3">Region Size</th>
                    <th className="py-2.5 px-3">Protect</th>
                    <th className="py-2.5 px-3">State / Type</th>
                    <th className="py-2.5 px-3">Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {memoryRegions.map((region, idx) => (
                    <tr
                      key={idx}
                      className={
                        region.matchesCriteria
                          ? 'bg-blue-950/40 border-l-2 border-l-blue-500 text-slate-200'
                          : 'text-slate-400 hover:bg-slate-950/20'
                      }
                    >
                      <td className="py-3 px-3 font-bold text-slate-200">{region.baseAddress}</td>
                      <td className="py-3 px-3">{region.regionSize}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            region.protect === 'PAGE_EXECUTE_READWRITE'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {region.protect}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {region.state} / {region.type}
                      </td>
                      <td className="py-3 px-3">
                        {region.matchesCriteria ? (
                          <span className="flex items-center space-x-1 text-blue-400 font-bold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Target Region</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">Skip</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between">
              <span>Return Value (`utils_ram::getRegion`):</span>
              <span className="text-blue-400 font-bold">Base: 0x15800000, Size: 0x02000000 (33,554,432 bytes)</span>
            </div>
          </div>

          {/* Pattern Search Simulator (Search_ram) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-200 flex items-center space-x-2">
                <Search className="w-4 h-4 text-emerald-400" />
                <span>Pattern Scanner (`utils_ram::Search_ram`)</span>
              </h2>
              <span className="text-xs text-emerald-400 font-mono">0xFF = Wildcard Byte</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Byte Pattern to Find (Hex with Wildcard 0xFF)</label>
                <input
                  type="text"
                  value={patternInput}
                  onChange={(e) => setPatternInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Start Address</label>
                  <input
                    type="text"
                    value={startAddrHex}
                    onChange={(e) => setStartAddrHex(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">End Address</label>
                  <input
                    type="text"
                    value={endAddrHex}
                    onChange={(e) => setEndAddrHex(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Decallage (Offset)</label>
                  <input
                    type="number"
                    value={decallage}
                    onChange={(e) => setDecallage(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={executeRamSearch}
                className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl shadow-lg shadow-emerald-600/20 transition"
              >
                <Search className="w-4 h-4" />
                <span>Execute Search_ram</span>
              </button>

              {searchStatus && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="text-xs font-mono text-slate-300">{searchStatus}</div>
                  {foundAddrHex && (
                    <div className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/60">
                      Result: {foundAddrHex}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Hardware Breakpoints & Thread Context */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                  <Crosshair className="w-4 h-4 text-rose-400" />
                  <span>Hardware Breakpoints (DR0-DR7)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Thread context manipulation</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleBreakpoints(true)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    breakpointsActive
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Set Breakpoints
                </button>
                <button
                  onClick={() => toggleBreakpoints(false)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    !breakpointsActive
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Remove
                </button>
              </div>
            </div>

            {/* Thread Register Cards */}
            <div className="space-y-3">
              {threads.map((thread) => (
                <div key={thread.threadId} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 font-mono">Thread ID: {thread.threadId}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        thread.status === 'Breakpoint Hit'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      }`}
                    >
                      {thread.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800/80">
                      <span className="text-slate-500 block">Dr0 (RotX):</span>
                      <span className="text-rose-400 font-bold">{thread.dr0}</span>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800/80">
                      <span className="text-slate-500 block">Dr1 (RotY):</span>
                      <span className="text-rose-400 font-bold">{thread.dr1}</span>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800/80">
                      <span className="text-slate-500 block">Dr2 (RotZ):</span>
                      <span className="text-rose-400 font-bold">{thread.dr2}</span>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800/80">
                      <span className="text-slate-500 block">Dr7 (Control):</span>
                      <span className="text-amber-400 font-bold">{thread.dr7}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/50 text-[11px] text-slate-400 space-y-1 font-mono">
              <div>Dr3: 0x300423506 (Camera trigger vector)</div>
              <div>Dr7: 0x1DDD0455 (Local & Global execution flags enabled)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
