import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CppRamTools } from '../utils/cppEngine';
import { MemoryRegion, ThreadContext, MemorySearchResult, CodePatchEntry, VisualAsset, PaletteColor } from '../types';
import { Shield, Search, Cpu, Crosshair, CheckCircle, RefreshCw, RotateCcw, Image as ImageIcon, Code2, Layers, Play, Edit3 } from 'lucide-react';

export const RamToolsStudio: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'scanner' | 'patches' | 'assets' | 'threads'>('scanner');
  const [targetProcess, setTargetProcess] = useState<string>('pcsx2.exe');
  const [pid] = useState<number>(4192);

  // Pattern search inputs
  const [patternInput, setPatternInput] = useState<string>('8B 44 24 FF 89 05 FF FF 00 00');
  const [startAddrHex, setStartAddrHex] = useState<string>('0x15000000');
  const [endAddrHex, setEndAddrHex] = useState<string>('0x17000000');
  const [decallage] = useState<number>(4);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [foundAddrHex, setFoundAddrHex] = useState<string | null>(null);

  // Value Scanner state
  const [valueType, setValueType] = useState<'int32' | 'float' | 'int16' | 'byte'>('int32');
  const [comparison, setComparison] = useState<'exact' | 'greater' | 'less' | 'changed' | 'unchanged'>('exact');
  const [searchValueInput, setSearchValueInput] = useState<string>('100');
  const [scanResults, setScanResults] = useState<MemorySearchResult[]>([]);
  const [hasScanned, setHasScanned] = useState<boolean>(false);

  // Default synthetic RAM (64KB sample chunk)
  const [syntheticRam, setSyntheticRam] = useState<Uint8Array>(() => {
    const buf = new Uint8Array(65536);
    // Fill with sample instruction data & variable values
    for (let i = 0; i < buf.length; i++) {
      buf[i] = (i * 37 + (i >> 3)) & 0xff;
    }
    // Inject known signature at offset 0x4200: 8B 44 24 10 89 05 34 12 00 00
    const signature = [0x8b, 0x44, 0x24, 0x10, 0x89, 0x05, 0x34, 0x12, 0x00, 0x00];
    for (let j = 0; j < signature.length; j++) {
      buf[0x4200 + j] = signature[j];
    }
    // Set health/gold values at specific offsets (Base 0x15800000 + offset)
    // Offset 0x1000: Health (100 -> 0x00000064)
    buf[0x1000] = 100; buf[0x1001] = 0; buf[0x1002] = 0; buf[0x1003] = 0;
    // Offset 0x1004: Gold (100 -> 0x00000064)
    buf[0x1004] = 100; buf[0x1005] = 0; buf[0x1006] = 0; buf[0x1007] = 0;
    // Offset 0x1008: Mana (50 -> 0x00000032)
    buf[0x1008] = 50; buf[0x1009] = 0; buf[0x100a] = 0; buf[0x100b] = 0;

    // Inject code assembly at offset 0x0500: Subtraction instruction (e.g. Health decrease: SUB EAX, 05)
    // 2B 44 24 04 -> SUB EAX, [ESP+4]
    buf[0x0500] = 0x2b; buf[0x0501] = 0x44; buf[0x0502] = 0x24; buf[0x0503] = 0x04;
    // Offset 0x0510: Camera rotation write: MOV [ESI+20], XMM0
    buf[0x0510] = 0x0f; buf[0x0511] = 0x11; buf[0x0512] = 0x46; buf[0x0513] = 0x20;

    // Inject sample 8bpp texture data at offset 0x2000 (32x32 pixels)
    for (let py = 0; py < 32; py++) {
      for (let px = 0; px < 32; px++) {
        const palIdx = (Math.floor(px / 4) + Math.floor(py / 4)) % 8;
        buf[0x2000 + py * 32 + px] = palIdx;
      }
    }

    return buf;
  });

  // Code Patches state
  const [patches, setPatches] = useState<CodePatchEntry[]>([
    {
      id: 'patch-1',
      address: '0x15800500',
      addressNum: 0x15800500,
      offset: 0x0500,
      originalBytes: [0x2b, 0x44, 0x24, 0x04], // SUB EAX, [ESP+4]
      patchedBytes: [0x90, 0x90, 0x90, 0x90], // NOP NOP NOP NOP (Infinite Health)
      originalDisasm: 'sub eax, dword ptr [esp+0x4]',
      patchedDisasm: 'nop (4 bytes - Invincibility)',
      description: 'Disable player damage subtraction (God Mode)',
      isPatched: false,
    },
    {
      id: 'patch-2',
      address: '0x15800510',
      addressNum: 0x15800510,
      offset: 0x0510,
      originalBytes: [0x0f, 0x11, 0x46, 0x20], // MOVUPS [ESI+0x20], XMM0
      patchedBytes: [0x90, 0x90, 0x90, 0x90], // NOP
      originalDisasm: 'movups xmmword ptr [esi+0x20], xmm0',
      patchedDisasm: 'nop (4 bytes - Freeze Camera)',
      description: 'Lock camera matrix updates (Free-cam mode)',
      isPatched: false,
    },
  ]);

  // Asset Visualizer state
  const samplePalette: PaletteColor[] = [
    { r: 15, g: 23, b: 42, a: 255 },
    { r: 239, g: 68, b: 68, a: 255 },
    { r: 34, g: 197, b: 94, a: 255 },
    { r: 59, g: 130, b: 246, a: 255 },
    { r: 234, g: 179, b: 8, a: 255 },
    { r: 168, g: 85, b: 247, a: 255 },
    { r: 6, g: 182, b: 212, a: 255 },
    { r: 249, g: 115, b: 22, a: 255 },
  ];

  const [selectedAsset, setSelectedAsset] = useState<VisualAsset>({
    id: 'asset-1',
    name: 'Player Sprite Sheet / UI Icons',
    type: 'sprite',
    address: '0x15802000',
    offset: 0x2000,
    width: 32,
    height: 32,
    bpp: 8,
    palette: samplePalette,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Draw visual asset on canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = CppRamTools.renderAssetPixels(syntheticRam, selectedAsset);

    // Create offscreen canvas to scale up pixel art cleanly
    const offscreen = document.createElement('canvas');
    offscreen.width = selectedAsset.width;
    offscreen.height = selectedAsset.height;
    const offCtx = offscreen.getContext('2d');
    if (offCtx) {
      offCtx.putImageData(imgData, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
    }
  }, [syntheticRam, selectedAsset]);

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

  // Handle Memory Value Scan (First / Next Scan)
  const executeValueScan = (isNextScan: boolean) => {
    const targetVal = parseFloat(searchValueInput);
    const baseAddr = 0x15800000;

    const results = CppRamTools.scanValue(
      syntheticRam,
      baseAddr,
      valueType,
      comparison,
      isNaN(targetVal) ? undefined : targetVal,
      isNextScan ? scanResults : undefined
    );

    setScanResults(results);
    setHasScanned(true);
  };

  // Modify candidate memory address value in RAM
  const updateCandidateValue = (addrNum: number, newValStr: string) => {
    const newVal = parseFloat(newValStr);
    if (isNaN(newVal)) return;

    const offset = addrNum - 0x15800000;
    if (offset < 0 || offset >= syntheticRam.length) return;

    const newRam = new Uint8Array(syntheticRam);
    if (valueType === 'int32') {
      const b0 = newVal & 0xff;
      const b1 = (newVal >> 8) & 0xff;
      const b2 = (newVal >> 16) & 0xff;
      const b3 = (newVal >> 24) & 0xff;
      newRam[offset] = b0;
      newRam[offset + 1] = b1;
      newRam[offset + 2] = b2;
      newRam[offset + 3] = b3;
    } else if (valueType === 'int16') {
      newRam[offset] = newVal & 0xff;
      newRam[offset + 1] = (newVal >> 8) & 0xff;
    } else {
      newRam[offset] = newVal & 0xff;
    }

    setSyntheticRam(newRam);
    setScanResults((prev) =>
      prev.map((item) => (item.addressNum === addrNum ? { ...item, currentValue: newVal } : item))
    );
  };

  // Toggle or restore code patch
  const togglePatch = (patchId: string, apply: boolean) => {
    setPatches((prev) =>
      prev.map((patch) => {
        if (patch.id === patchId) {
          const ramCopy = new Uint8Array(syntheticRam);
          const updatedRam = CppRamTools.applyCodePatch(ramCopy, patch, apply);
          setSyntheticRam(updatedRam);
          return { ...patch, isPatched: apply };
        }
        return patch;
      })
    );
  };

  // Restore all code patches
  const restoreAllPatches = () => {
    let currentRam = new Uint8Array(syntheticRam);
    const updatedPatches = patches.map((patch) => {
      currentRam = new Uint8Array(CppRamTools.applyCodePatch(currentRam, patch, false));
      return { ...patch, isPatched: false };
    });
    setSyntheticRam(currentRam);
    setPatches(updatedPatches);
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
              <span>Windows Memory API Engine &amp; Emulator Workbench</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Process RAM, Code Patch &amp; Asset Studio</h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Scan emulator game memory regions, patch assembly instructions with live code restoration, and extract/visualize graphics assets from process RAM.
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

        {/* Feature Sub-Navigation */}
        <div className="flex items-center space-x-2 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('scanner')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition ${
              activeSubTab === 'scanner'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Memory Scanner</span>
          </button>

          <button
            onClick={() => setActiveSubTab('patches')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition ${
              activeSubTab === 'patches'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code Patch &amp; Restore</span>
          </button>

          <button
            onClick={() => setActiveSubTab('assets')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition ${
              activeSubTab === 'assets'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Asset Visualizer</span>
          </button>

          <button
            onClick={() => setActiveSubTab('threads')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition ${
              activeSubTab === 'threads'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Thread Breakpoints &amp; Regions</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Memory Scanner */}
      {activeSubTab === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Scan Controls */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-200 flex items-center space-x-2">
                <Search className="w-4 h-4 text-blue-400" />
                <span>Emulator Value Scanner</span>
              </h2>
              <span className="text-xs text-blue-400 font-mono">32MB RAM Region</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Value Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['int32', 'int16', 'float', 'byte'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setValueType(t)}
                      className={`py-1.5 text-xs font-mono rounded-lg border transition ${
                        valueType === t
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Scan Comparison Mode</label>
                <select
                  value={comparison}
                  onChange={(e) => setComparison(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none"
                >
                  <option value="exact">Exact Value Match</option>
                  <option value="greater">Greater Than Value</option>
                  <option value="less">Less Than Value</option>
                  <option value="changed">Changed Value (Filter Next Scan)</option>
                  <option value="unchanged">Unchanged Value (Filter Next Scan)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Target Search Value</label>
                <input
                  type="text"
                  value={searchValueInput}
                  onChange={(e) => setSearchValueInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-cyan-400 font-bold focus:outline-none"
                  placeholder="e.g. 100"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => executeValueScan(false)}
                  className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition text-xs"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>First Scan</span>
                </button>
                <button
                  onClick={() => executeValueScan(true)}
                  disabled={!hasScanned || scanResults.length === 0}
                  className="flex-1 flex items-center justify-center space-x-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold py-2.5 rounded-xl transition text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Next Scan</span>
                </button>
              </div>
            </div>

            {/* Pattern Search Section (Search_ram) */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Wildcard Pattern Scanner (Search_ram)</span>
                </h3>
                <span className="text-[10px] text-emerald-400 font-mono">0xFF = Wildcard</span>
              </div>

              <input
                type="text"
                value={patternInput}
                onChange={(e) => setPatternInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 font-bold focus:outline-none"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={startAddrHex}
                  onChange={(e) => setStartAddrHex(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300"
                  placeholder="Start Addr"
                />
                <input
                  type="text"
                  value={endAddrHex}
                  onChange={(e) => setEndAddrHex(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300"
                  placeholder="End Addr"
                />
              </div>

              <button
                onClick={executeRamSearch}
                className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs transition"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search Byte Pattern</span>
              </button>

              {searchStatus && (
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
                  <div>{searchStatus}</div>
                  {foundAddrHex && <div className="text-emerald-400 font-bold mt-1">Found Address: {foundAddrHex}</div>}
                </div>
              )}
            </div>
          </div>

          {/* Found Candidates Table & Live Memory Editor */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-200">Scan Results &amp; Live Address Table</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {hasScanned ? `Found ${scanResults.length} matching memory addresses` : 'Run a scan to discover game variables'}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                    <th className="py-2.5 px-3">Address</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Current Value</th>
                    <th className="py-2.5 px-3">Modify Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {scanResults.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        {hasScanned ? 'No matching addresses found in RAM buffer' : 'Press "First Scan" to search memory addresses'}
                      </td>
                    </tr>
                  ) : (
                    scanResults.map((item) => (
                      <tr key={item.hexAddr} className="hover:bg-slate-900/40 text-slate-300">
                        <td className="py-2.5 px-3 text-cyan-400 font-bold">{item.hexAddr}</td>
                        <td className="py-2.5 px-3 text-slate-400">{item.valueType}</td>
                        <td className="py-2.5 px-3 font-bold text-amber-400">{item.currentValue}</td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            defaultValue={item.currentValue}
                            onBlur={(e) => updateCandidateValue(item.addressNum, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateCandidateValue(item.addressNum, (e.target as HTMLInputElement).value);
                              }
                            }}
                            className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>Quick Memory Pointer: 0x15801000 (Health Value: {syntheticRam[0x1000]})</span>
              <button
                onClick={() => {
                  setScanResults([
                    { addressNum: 0x15801000, hexAddr: '0x15801000', currentValue: syntheticRam[0x1000], valueType: 'int32', label: 'Player Health' },
                    { addressNum: 0x15801004, hexAddr: '0x15801004', currentValue: syntheticRam[0x1004], valueType: 'int32', label: 'Player Gold' },
                  ]);
                  setHasScanned(true);
                }}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                Load Sample Addresses
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Code Patch & Restore Manager */}
      {activeSubTab === 'patches' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <Code2 className="w-5 h-5 text-indigo-400" />
                <span>Emulator Code Patch &amp; Restoration Studio</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Inspect disassembly bytes, apply code modifications (e.g. NOP out instructions), and instantly restore original assembly instructions.
              </p>
            </div>

            <button
              onClick={restoreAllPatches}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-semibold px-4 py-2 rounded-xl text-xs transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restore All Original Code</span>
            </button>
          </div>

          <div className="space-y-4">
            {patches.map((patch) => (
              <div
                key={patch.id}
                className={`p-4 rounded-xl border transition ${
                  patch.isPatched
                    ? 'bg-indigo-950/30 border-indigo-500/50'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 font-mono text-xs">
                      <span className="text-cyan-400 font-bold">{patch.address}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-300 font-semibold">{patch.description}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-2">
                      <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                        <span className="text-slate-500 text-[10px] block mb-0.5">Original Instruction:</span>
                        <div className="text-emerald-400 font-bold">{patch.originalDisasm}</div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Bytes: {patch.originalBytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                        <span className="text-slate-500 text-[10px] block mb-0.5">Patched Instruction:</span>
                        <div className="text-indigo-400 font-bold">{patch.patchedDisasm}</div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Bytes: {patch.patchedBytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {patch.isPatched ? (
                      <button
                        onClick={() => togglePatch(patch.id, false)}
                        className="flex items-center space-x-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/40 px-3.5 py-2 rounded-xl text-xs font-semibold transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore Original</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => togglePatch(patch.id, true)}
                        className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Apply Patch</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Asset Visualizer */}
      {activeSubTab === 'assets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-200 flex items-center space-x-2">
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span>RAM Asset Decoder Settings</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Asset Name</label>
                <input
                  type="text"
                  value={selectedAsset.name}
                  onChange={(e) => setSelectedAsset({ ...selectedAsset, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">RAM Offset Address</label>
                  <input
                    type="text"
                    value={selectedAsset.address}
                    onChange={(e) => {
                      const addrStr = e.target.value;
                      const num = parseInt(addrStr, 16) || 0;
                      setSelectedAsset({ ...selectedAsset, address: addrStr, offset: Math.max(0, num - 0x15800000) });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-400 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Bits Per Pixel (BPP)</label>
                  <select
                    value={selectedAsset.bpp}
                    onChange={(e) => setSelectedAsset({ ...selectedAsset, bpp: parseInt(e.target.value) as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                  >
                    <option value={8}>8 bpp (Indexed 256 colors)</option>
                    <option value={4}>4 bpp (Indexed 16 colors)</option>
                    <option value={32}>32 bpp (RGBA direct)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Width (px)</label>
                  <input
                    type="number"
                    value={selectedAsset.width}
                    onChange={(e) => setSelectedAsset({ ...selectedAsset, width: parseInt(e.target.value) || 16 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Height (px)</label>
                  <input
                    type="number"
                    value={selectedAsset.height}
                    onChange={(e) => setSelectedAsset({ ...selectedAsset, height: parseInt(e.target.value) || 16 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                  />
                </div>
              </div>

              {/* Color Palette Display */}
              <div>
                <label className="text-xs text-slate-400 block mb-2">Palette Colors ({selectedAsset.palette.length})</label>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  {selectedAsset.palette.map((c, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded border border-slate-700 shadow-inner"
                      style={{ backgroundColor: `rgb(${c.r}, ${c.g}, ${c.b})` }}
                      title={`Palette #${i}: rgb(${c.r}, ${c.g}, ${c.b})`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center space-y-4">
            <h2 className="text-sm font-semibold text-slate-200 font-mono">Rendered Asset Viewport (Scaled 8x)</h2>
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={256}
                height={256}
                className="w-64 h-64 border border-slate-800 bg-slate-900 image-pixelated rounded-lg shadow-inner"
              />
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Rendered from address {selectedAsset.address} • Size: {selectedAsset.width}x{selectedAsset.height} @ {selectedAsset.bpp}bpp
            </p>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Thread Contexts & VirtualQueryEx Regions */}
      {activeSubTab === 'threads' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* VirtualQueryEx Region Table */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
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
          </div>

          {/* Hardware Breakpoints */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
