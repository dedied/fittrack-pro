import React, { useState, useEffect } from 'react';
import { WorkoutLog } from '../types';
import { APP_TEST_SUITE, TestDefinition } from '../utils/testSuite';

interface TestDisplayState extends TestDefinition {
  status: 'pending' | 'pass' | 'fail';
  details?: string;
  error?: string;
}

interface TestDashboardProps {
  onClose: () => void;
  logs: WorkoutLog[];
}

const TestDashboard: React.FC<TestDashboardProps> = ({ onClose, logs }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [results, setResults] = useState<TestDisplayState[]>(() => 
    APP_TEST_SUITE.map(t => ({ ...t, status: 'pending' }))
  );

  const runSingleTest = async (testId: string) => {
    setResults(prev => prev.map(r => r.id === testId ? { ...r, status: 'pending', error: undefined, details: undefined } : r));
    
    // Tiny delay for UI feel
    await new Promise(r => setTimeout(r, 300));

    const testDef = APP_TEST_SUITE.find(t => t.id === testId);
    if (!testDef) return;

    try {
      const result = await testDef.run({ logs });
      setResults(prev => prev.map(r => r.id === testId ? { ...r, ...result } : r));
    } catch (e: any) {
      setResults(prev => prev.map(r => r.id === testId ? { ...r, status: 'fail', error: e.message || 'System crash' } : r));
    }
  };

  const runAllTests = async () => {
    // Reset all to pending visually first
    setResults(prev => prev.map(t => ({ ...t, status: 'pending', error: undefined, details: undefined })));
    for (const test of APP_TEST_SUITE) {
      await runSingleTest(test.id);
    }
  };

  useEffect(() => {
    runAllTests();
  }, []);

  const passedCount = results.filter(r => r.status === 'pass').length;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col p-6 animate-fade-in text-white overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black">System Diagnostics</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            {passedCount}/{results.length} Tests Passed
          </p>
        </div>
        <button onClick={onClose} className="p-3 bg-white/10 rounded-full active:scale-90 transition-transform">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="space-y-3 flex-1">
        {results.map(res => {
          const isExpanded = expandedId === res.id;
          return (
            <div 
              key={res.id} 
              onClick={() => setExpandedId(isExpanded ? null : res.id)}
              className={`bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'bg-white/10 ring-1 ring-white/20' : ''}`}
            >
              <div className="p-4 flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    res.status === 'pass' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' :
                    res.status === 'fail' ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]' :
                    'bg-slate-400 animate-pulse'
                  }`} />
                  <span className="font-bold text-sm">{res.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  {res.status !== 'pending' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); runSingleTest(res.id); }}
                      className="text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300 p-1"
                    >
                      Rerun
                    </button>
                  )}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>
              
              {isExpanded && (
                <div className="px-4 pb-4 animate-fade-in border-t border-white/5 pt-3">
                  <p className="text-[11px] text-slate-400 mb-3">{res.description}</p>
                  <div className={`p-3 rounded-xl text-xs font-mono break-all ${res.status === 'fail' ? 'bg-red-500/10 text-red-300' : 'bg-black/20 text-emerald-300'}`}>
                    {res.status === 'pending' ? 'Running test...' : (res.error ? `Error: ${res.error}` : (res.details || 'Test passed successfully.'))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="bg-indigo-600/20 border border-indigo-500/30 p-6 rounded-3xl mt-8">
           <h3 className="font-black text-indigo-300 uppercase text-[10px] mb-4 tracking-widest">Environment Snapshot</h3>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/20 p-3 rounded-2xl text-center">
                 <p className="text-2xl font-black">{logs.length}</p>
                 <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Total Logs</p>
              </div>
              <div className="bg-black/20 p-3 rounded-2xl text-center">
                 <p className="text-lg font-black truncate">{new Blob([JSON.stringify(logs)]).size}</p>
                 <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Payload (bytes)</p>
              </div>
           </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <button 
          onClick={runAllTests}
          className="bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-transform shadow-lg shadow-indigo-500/20"
        >
          Run Full Suite
        </button>
        <button 
          onClick={onClose}
          className="bg-white/10 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-transform"
        >
          Exit
        </button>
      </div>
    </div>
  );
};

export default TestDashboard;