import { useState } from 'react';
import { Header } from './components/Header';
import { ByteToolsStudio } from './components/ByteToolsStudio';
import { RamToolsStudio } from './components/RamToolsStudio';
import { CodeViewer } from './components/CodeViewer';
import { ApiDocs } from './components/ApiDocs';

export function App() {
  const [activeTab, setActiveTab] = useState<'bytes' | 'ram' | 'code' | 'docs'>('bytes');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-500 selection:text-white">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'bytes' && <ByteToolsStudio />}
        {activeTab === 'ram' && <RamToolsStudio />}
        {activeTab === 'code' && <CodeViewer />}
        {activeTab === 'docs' && <ApiDocs />}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <div>C++ Memory &amp; Byte Tools Workbench • Windows RAM &amp; Endianness Suite</div>
          <div className="mt-2 sm:mt-0 font-mono">bytes-tools.cpp • ram-tools.cpp</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
