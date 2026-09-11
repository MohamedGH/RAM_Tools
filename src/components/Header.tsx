import React from 'react';
import { Cpu, Binary, FileCode, Shield, Terminal } from 'lucide-react';

interface HeaderProps {
  activeTab: 'bytes' | 'ram' | 'code' | 'docs';
  setActiveTab: (tab: 'bytes' | 'ram' | 'code' | 'docs') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-100 tracking-tight">C++ Memory & Byte Tools</span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-slate-400">Process RAM Analysis & Endianness Engine</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('bytes')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'bytes'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Binary className="w-4 h-4" />
              <span>Byte Tools</span>
            </button>

            <button
              onClick={() => setActiveTab('ram')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'ram'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>RAM & Process Scanner</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'code'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>C++ Sources</span>
            </button>

            <button
              onClick={() => setActiveTab('docs')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'docs'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>API Reference</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
