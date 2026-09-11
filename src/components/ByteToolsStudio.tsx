import React, { useState } from 'react';
import { CppByteTools } from '../utils/cppEngine';
import { ArrowRightLeft, Cpu, Sparkles, Hash, Binary as BinaryIcon } from 'lucide-react';

export const ByteToolsStudio: React.FC = () => {
  // Hex byte stream representing memory buffer (default 16 bytes)
  const [hexInput, setHexInput] = useState<string>('42 F6 80 00 12 34 56 78 9A BC DE F0 00 00 80 3F');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [customShort, setCustomShort] = useState<number>(0x1234);
  const [customFloat, setCustomFloat] = useState<number>(123.456);

  // Parse byte array safely
  const byteArray: number[] = React.useMemo(() => {
    const cleaned = hexInput.replace(/[^0-9a-fA-F]/g, ' ');
    const parts = cleaned.trim().split(/\s+/).filter(Boolean);
    const bytes: number[] = [];
    for (const p of parts) {
      if (p.length === 1) {
        bytes.push(parseInt(p, 16));
      } else {
        // chunk in pairs of 2 if length > 2
        for (let i = 0; i < p.length; i += 2) {
          const byteHex = p.substring(i, i + 2);
          bytes.push(parseInt(byteHex, 16) & 0xff);
        }
      }
    }
    return bytes.length > 0 ? bytes : [0, 0, 0, 0];
  }, [hexInput]);

  const maxIndex = Math.max(0, byteArray.length - 4);
  const safeIndex = Math.min(selectedIndex, maxIndex);

  // C++ function outputs
  const shortVal = CppByteTools.get_short(byteArray, safeIndex);
  const swapedShortVal = CppByteTools.get_swaped_short(byteArray, safeIndex);
  const intVal = CppByteTools.get_int(byteArray, safeIndex);
  const floatVal = CppByteTools.get_float(byteArray, safeIndex);

  // Swapped standalone values
  const standaloneSwappedShort = CppByteTools.swapShort(customShort);
  const standaloneSwappedFloat = CppByteTools.swapFloat(customFloat);

  // Float dissection
  const floatAnalysis = CppByteTools.analyzeFloat(floatVal);
  const customFloatAnalysis = CppByteTools.analyzeFloat(customFloat);
  const swappedFloatAnalysis = CppByteTools.analyzeFloat(standaloneSwappedFloat);

  // Preset buffers
  const loadPreset = (name: string) => {
    switch (name) {
      case 'float_pi':
        // Pi 3.14159265 in IEEE-754: 0x40490FDB
        setHexInput('40 49 0F DB 00 00 80 3F 42 F6 E9 79 12 34 56 78');
        setSelectedIndex(0);
        break;
      case 'float_one':
        // 1.0f in IEEE 754: 0x3F800000
        setHexInput('3F 80 00 00 40 00 00 00 C0 00 00 00 00 00 00 00');
        setSelectedIndex(0);
        break;
      case 'integers':
        setHexInput('78 56 34 12 EF CD AB 89 01 00 00 00 FF FF FF FF');
        setSelectedIndex(0);
        break;
      case 'game_coords':
        // Typical camera floats (X, Y, Z, Rot)
        setHexInput('43 48 00 00 43 96 00 00 42 C8 00 00 3F 80 00 00');
        setSelectedIndex(0);
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>C++ Function Evaluator (bytes-tools.cpp)</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Live Byte Buffer & Endianness Workbench</h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Inspect memory bytes, execute bitwise index extractions, and evaluate IEEE-754 float unions in real-time.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Presets:</span>
            <button
              onClick={() => loadPreset('float_pi')}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            >
              Float π (3.14159)
            </button>
            <button
              onClick={() => loadPreset('float_one')}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            >
              Float 1.0 / Powers
            </button>
            <button
              onClick={() => loadPreset('integers')}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            >
              0x12345678 Ints
            </button>
            <button
              onClick={() => loadPreset('game_coords')}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            >
              Camera Vec4
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Buffer Input & Interactive Array Grid */}
        <div className="lg:col-span-7 space-y-6">
          {/* Buffer Hex Editor */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <Hash className="w-4 h-4 text-blue-400" />
                <span>Memory Buffer (Hex Byte Stream: `char arr[]`)</span>
              </label>
              <span className="text-xs text-slate-400 font-mono">{byteArray.length} bytes loaded</span>
            </div>

            <textarea
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              rows={3}
              placeholder="e.g. 42 F6 80 00 12 34 56 78"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-cyan-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 tracking-wider resize-none"
            />

            {/* Interactive Byte Visualizer Grid */}
            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-400 mb-2">Click a byte offset to set inspection index:</div>
              <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 overflow-x-auto">
                {byteArray.map((byte, idx) => {
                  const isBase = idx === safeIndex;
                  const isIn4ByteRange = idx >= safeIndex && idx < safeIndex + 4;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedIndex(idx)}
                      className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-center transition-all ${
                        isBase
                          ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-500/20 scale-105 z-10'
                          : isIn4ByteRange
                          ? 'bg-blue-950/60 border-blue-700/60 text-blue-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-[10px] font-mono opacity-60">+{idx}</span>
                      <span className="text-xs font-mono font-bold">
                        {byte.toString(16).toUpperCase().padStart(2, '0')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Index Slider & Details */}
            <div className="mt-4 flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-semibold text-slate-300">Target Index:</span>
                <input
                  type="number"
                  min={0}
                  max={Math.max(0, byteArray.length - 1)}
                  value={safeIndex}
                  onChange={(e) => setSelectedIndex(parseInt(e.target.value) || 0)}
                  className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-center text-blue-400 font-bold focus:outline-none"
                />
              </div>

              <div className="text-xs font-mono text-slate-400">
                Operating on: <span className="text-blue-400 font-semibold font-mono">arr[{safeIndex}]</span> ..{' '}
                <span className="text-blue-400 font-semibold font-mono">arr[{safeIndex + 3}]</span>
              </div>
            </div>
          </div>

          {/* C++ Extracted Functions Results */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-200 flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>Extracted Values at `index = {safeIndex}`</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* get_short */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-cyan-400 font-mono">get_short(arr, {safeIndex})</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
                    uint16 LE
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-slate-100">{shortVal}</div>
                <div className="text-xs font-mono text-slate-400 mt-1">
                  Hex: 0x{shortVal.toString(16).toUpperCase().padStart(4, '0')}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-900">
                  ((arr[{safeIndex + 1}] &lt;&lt; 8) & 0xff00) | (arr[{safeIndex}] & 0x00ff)
                </div>
              </div>

              {/* get_swaped_short */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-indigo-400 font-mono">
                    get_swaped_short(arr, {safeIndex})
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-indigo-950 text-indigo-400 border border-indigo-800 rounded">
                    uint16 BE
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-slate-100">{swapedShortVal}</div>
                <div className="text-xs font-mono text-slate-400 mt-1">
                  Hex: 0x{swapedShortVal.toString(16).toUpperCase().padStart(4, '0')}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-900">
                  ((arr[{safeIndex}] &lt;&lt; 8) & 0xff00) | (arr[{safeIndex + 1}] & 0x00ff)
                </div>
              </div>

              {/* get_int */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-emerald-400 font-mono">get_int(arr, {safeIndex})</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
                    int32 LE
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-slate-100">{intVal}</div>
                <div className="text-xs font-mono text-slate-400 mt-1">
                  Hex: 0x{(intVal >>> 0).toString(16).toUpperCase().padStart(8, '0')}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-900">
                  b3&lt;&lt;24 | b2&lt;&lt;16 | b1&lt;&lt;8 | b0
                </div>
              </div>

              {/* get_float */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-amber-400 font-mono">get_float(arr, {safeIndex})</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-amber-950 text-amber-400 border border-amber-800 rounded">
                    float (union)
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-amber-300">
                  {isNaN(floatVal) ? 'NaN' : floatVal.toPrecision(7)}
                </div>
                <div className="text-xs font-mono text-slate-400 mt-1">Hex: {floatAnalysis.hex}</div>
                <div className="text-[11px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-900">
                  Float_union f; f.intix = four_bytes; return f.floatix;
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: IEEE-754 Dissection & Standalone Swap Testers */}
        <div className="lg:col-span-5 space-y-6">
          {/* Float Union IEEE-754 Dissector */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <BinaryIcon className="w-4 h-4 text-amber-400" />
                <span>IEEE 754 Float & Union Dissection</span>
              </h2>
              <span className="text-xs text-amber-400 font-mono">32-bit Single Precision</span>
            </div>

            {/* Binary Bitfield Diagram */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center text-[10px] font-mono text-slate-400 justify-between">
                <span>Bit 31 (Sign)</span>
                <span>Bits 30..23 (Exp)</span>
                <span>Bits 22..0 (Mantissa)</span>
              </div>

              {/* Color-coded 32-bit representation */}
              <div className="flex gap-0.5 font-mono text-xs font-bold justify-between">
                {/* Sign Bit */}
                <div className="px-2 py-1 bg-red-950/80 border border-red-700/60 text-red-400 rounded text-center">
                  {floatAnalysis.binaryString[0]}
                </div>
                {/* Exponent 8 bits */}
                <div className="px-2 py-1 bg-blue-950/80 border border-blue-700/60 text-blue-400 rounded text-center flex-1 mx-1 tracking-widest">
                  {floatAnalysis.binaryString.substring(1, 9)}
                </div>
                {/* Mantissa 23 bits */}
                <div className="px-2 py-1 bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 rounded text-center flex-[2] truncate tracking-wider">
                  {floatAnalysis.binaryString.substring(9)}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-900 text-xs">
                <div>
                  <span className="text-slate-500 block">Sign:</span>
                  <span className="font-mono font-bold text-red-400">
                    {floatAnalysis.sign === 0 ? '+ (Positive)' : '- (Negative)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Exponent:</span>
                  <span className="font-mono font-bold text-blue-400">
                    {floatAnalysis.exponentRaw} (2^{floatAnalysis.exponentUnbiased})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Mantissa:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {floatAnalysis.mantissaFraction.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Standalone swapShort & swapFloat Testing Cards */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
              <span>Standalone Swap Functions</span>
            </h2>

            {/* swapShort Interactive Card */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 font-mono">Utils_bytes::swapShort()</span>
                <span className="text-[10px] text-slate-500 font-mono">16-bit Int</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 block mb-1">Input Short (Decimal or Hex)</label>
                  <input
                    type="number"
                    value={customShort}
                    onChange={(e) => setCustomShort(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col items-center justify-center pt-4">
                  <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 block mb-1">Swapped Result</label>
                  <div className="bg-indigo-950/50 border border-indigo-800/60 rounded-lg px-3 py-1.5 text-xs font-mono text-indigo-300 font-bold">
                    {standaloneSwappedShort} (0x
                    {(standaloneSwappedShort & 0xffff).toString(16).toUpperCase().padStart(4, '0')})
                  </div>
                </div>
              </div>
            </div>

            {/* swapFloat Interactive Card */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 font-mono">Utils_bytes::swapFloat()</span>
                <span className="text-[10px] text-slate-500 font-mono">32-bit Float</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 block mb-1">Input Float</label>
                  <input
                    type="number"
                    step="any"
                    value={customFloat}
                    onChange={(e) => setCustomFloat(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col items-center justify-center pt-4">
                  <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 block mb-1">Swapped Float</label>
                  <div className="bg-amber-950/50 border border-amber-800/60 rounded-lg px-3 py-1.5 text-xs font-mono text-amber-300 font-bold truncate">
                    {isNaN(standaloneSwappedFloat) ? 'NaN' : standaloneSwappedFloat.toPrecision(6)}
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-900 flex justify-between">
                <span>In: {customFloatAnalysis.hex}</span>
                <span className="text-amber-400">Out: {swappedFloatAnalysis.hex}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
