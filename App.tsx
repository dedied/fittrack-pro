
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout, { TabType } from './components/Layout';
import ProgressChart from './components/ProgressChart';
import { WorkoutLog, EXERCISES, ExerciseType } from './types';

export type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [totalsTimeFrame, setTotalsTimeFrame] = useState<TimeFrame>('weekly');
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const [logs, setLogs] = useState<WorkoutLog[]>(() => {
    try {
      const saved = localStorage.getItem('fit_logs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [newEntry, setNewEntry] = useState<{ type: ExerciseType; reps: string; weight: string }>({
    type: 'pushups',
    reps: '',
    weight: ''
  });

  const isIOS = useMemo(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  }, []);

  useEffect(() => {
    localStorage.setItem('fit_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const appInstalledHandler = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', appInstalledHandler);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isInstalled) return;

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowInstallGuide(true);
    } else {
      alert("To install: Tap your browser menu and select 'Add to Home Screen'.");
    }
  };

  const maxStats = useMemo(() => {
    return EXERCISES.map(ex => {
      const exerciseLogs = logs.filter(log => log.type === ex.id);
      const maxRep = exerciseLogs.length > 0 ? Math.max(...exerciseLogs.map(l => l.reps)) : 0;
      const maxWeight = exerciseLogs.length > 0 ? Math.max(...exerciseLogs.map(l => l.weight || 0)) : 0;
      return { ...ex, maxRep, maxWeight };
    });
  }, [logs]);

  const filteredStats = useMemo(() => {
    const now = new Date();
    return EXERCISES.map(ex => {
      const filteredLogs = logs.filter(log => {
        if (log.type !== ex.id) return false;
        const logDate = new Date(log.date);
        switch (totalsTimeFrame) {
          case 'daily': return logDate.toDateString() === now.toDateString();
          case 'weekly':
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            return logDate >= weekAgo;
          case 'monthly': return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
          case 'yearly': return logDate.getFullYear() === now.getFullYear();
          default: return true;
        }
      });
      const totalReps = filteredLogs.reduce((acc, curr) => acc + curr.reps, 0);
      return { ...ex, totalReps };
    });
  }, [logs, totalsTimeFrame]);

  const handleAddLog = (e: React.MouseEvent) => {
    e.stopPropagation();
    const repsNum = parseInt(newEntry.reps);
    if (isNaN(repsNum) || repsNum <= 0) return;
    const weightNum = parseFloat(newEntry.weight);

    const log: WorkoutLog = {
      id: generateId(),
      date: new Date().toISOString(),
      type: newEntry.type,
      reps: repsNum,
      weight: !isNaN(weightNum) ? weightNum : undefined
    };

    setLogs(prevLogs => [log, ...prevLogs]);
    setNewEntry({ type: newEntry.type, reps: '', weight: '' });
    setActiveTab('dashboard');
  };

  const clearAllData = () => {
    if (window.confirm("Delete all workout history?")) {
      setLogs([]);
      localStorage.removeItem('fit_logs');
      setActiveTab('dashboard');
    }
  };

  const exportToCSV = () => {
    if (logs.length === 0) return;
    const headers = ['ID', 'Date_ISO', 'Exercise', 'Reps', 'Weight'];
    const rows = logs.map(log => [log.id, log.date, log.type, log.reps, log.weight || 0]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fittrack_export.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) return;
        const lines = content.split('\n');
        const newLogs: WorkoutLog[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.split(',').map(p => p.trim());
          if (parts.length < 4) continue;
          const [id, dateIso, type, repsStr, weightStr] = parts;
          const reps = parseInt(repsStr);
          const weight = weightStr ? parseFloat(weightStr) : undefined;
          const dateObj = new Date(dateIso);
          if (!isNaN(dateObj.getTime()) && !isNaN(reps)) {
            newLogs.push({ id: id || generateId(), date: dateObj.toISOString(), type: type as ExerciseType, reps, weight: weight !== 0 ? weight : undefined });
          }
        }
        setLogs(prev => {
          const combined = [...newLogs, ...prev];
          const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
          return unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });
        alert("Imported successfully.");
      } catch (err) { alert("Error parsing CSV."); }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <section><ProgressChart logs={logs} /></section>
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">🏆 Personal Bests</h2>
            <div className="grid grid-cols-1 gap-3">
              {maxStats.map(ex => (
                <div key={`pb-${ex.id}`} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ex.color} bg-opacity-10 shrink-0`}>{ex.icon}</div>
                    <div><p className="font-bold text-slate-800">{ex.label}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{ex.targetMuscle}</p></div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-right"><p className="text-xl font-black text-indigo-600">{ex.maxRep}</p><p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Max Reps</p></div>
                    {ex.isWeighted && (
                      <div className="text-right border-l border-slate-100 pl-4"><p className="text-xl font-black text-emerald-600">{ex.maxWeight}<span className="text-[10px] font-normal ml-0.5">kg</span></p><p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Max Weight</p></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="space-y-3">
            <div className="flex items-center justify-between ml-1">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Period Totals</h2>
              <div className="flex bg-slate-100 p-0.5 rounded-xl">
                {(['daily', 'weekly', 'monthly', 'yearly'] as TimeFrame[]).map(tf => (
                  <button key={tf} onClick={() => setTotalsTimeFrame(tf)} className={`px-2 py-1 text-[9px] font-bold uppercase rounded-lg transition-all ${totalsTimeFrame === tf ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{tf.charAt(0)}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {filteredStats.map(ex => (
                <div key={`total-${ex.id}`} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                  <div className="mb-2">{ex.icon}</div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight text-center">{ex.label}</span>
                  <span className="text-xl font-bold text-slate-800">{ex.totalReps}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'add' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
          <div className="text-center"><h2 className="text-2xl font-bold text-slate-800 tracking-tight">Record Set</h2></div>
          <div className="space-y-2">
            {EXERCISES.map(ex => (
              <button key={ex.id} onClick={() => setNewEntry({ ...newEntry, type: ex.id })} className={`flex items-center gap-4 p-4 rounded-2xl border-2 w-full transition-all ${newEntry.type === ex.id ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-slate-100 bg-white'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ex.color} bg-opacity-10 shrink-0`}>{ex.icon}</div>
                <div className="text-left flex-1 font-bold text-slate-800">{ex.label}</div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Reps</label>
              <input type="number" inputMode="numeric" value={newEntry.reps} onChange={(e) => setNewEntry({ ...newEntry, reps: e.target.value })} placeholder="0" className="w-full text-2xl font-bold text-center p-5 bg-white border border-slate-100 rounded-2xl" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Weight (kg)</label>
              <input type="number" inputMode="decimal" value={newEntry.weight} onChange={(e) => setNewEntry({ ...newEntry, weight: e.target.value })} placeholder="0" disabled={!EXERCISES.find(e => e.id === newEntry.type)?.isWeighted} className="w-full text-2xl font-bold text-center p-5 bg-white border border-slate-100 rounded-2xl disabled:opacity-30" />
            </div>
          </div>
          <button onClick={handleAddLog} disabled={!newEntry.reps || parseInt(newEntry.reps) <= 0} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg active:scale-95 disabled:opacity-50">SAVE SET</button>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <header className="text-center"><h2 className="text-2xl font-bold text-slate-800">Settings</h2></header>
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            <button onClick={handleInstallClick} className={`w-full p-6 flex items-center gap-4 hover:bg-slate-50 border-b border-slate-50 transition-all ${isInstalled ? 'text-emerald-600' : 'text-indigo-600'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isInstalled ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                {isInstalled ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
              </div>
              <div className="text-left"><p className="font-bold">{isInstalled ? 'App Installed' : 'Install FitTrack Pro'}</p><p className="text-[10px] text-slate-400 uppercase">{isInstalled ? 'App Mode Active' : 'Add to home screen'}</p></div>
            </button>
            <button onClick={exportToCSV} className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 border-b border-slate-50 text-slate-800">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-600"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
              <div className="text-left"><p className="font-bold">Export History</p><p className="text-[10px] text-slate-400 uppercase">Download .CSV</p></div>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 border-b border-slate-50 text-slate-800">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-600"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>
              <div className="text-left"><p className="font-bold">Import History</p><p className="text-[10px] text-slate-400 uppercase">Restore .CSV</p></div>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
            <button onClick={clearAllData} className="w-full p-6 flex items-center gap-4 hover:bg-red-50 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></div>
              <div className="text-left"><p className="font-bold">Clear Data</p><p className="text-[10px] text-red-400 uppercase">Wipe all history</p></div>
            </button>
          </div>
        </div>
      )}

      {showInstallGuide && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowInstallGuide(false)}>
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div><h3 className="text-2xl font-black text-slate-800">Install FitTrack</h3><p className="text-slate-500 text-sm">Add to home screen for offline use.</p></div>
              <button onClick={() => setShowInstallGuide(false)} className="bg-slate-100 p-2 rounded-full text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
                <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-indigo-600"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></div>
                <p className="text-sm font-bold text-slate-700 flex-1">1. Tap the <span className="text-indigo-600">Share</span> icon in Safari.</p>
              </div>
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
                <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-indigo-600 font-bold text-xl">+</div>
                <p className="text-sm font-bold text-slate-700 flex-1">2. Select <span className="text-indigo-600">"Add to Home Screen"</span>.</p>
              </div>
            </div>
            <button onClick={() => setShowInstallGuide(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-sm">Got it</button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
