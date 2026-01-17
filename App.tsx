import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout, { TabType } from './components/Layout';
import ProgressChart from './components/ProgressChart';
import { WorkoutLog, EXERCISES, ExerciseType } from './types';

export type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('daily');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>(() => {
    try {
      const saved = localStorage.getItem('fit_logs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load logs from localStorage", e);
      return [];
    }
  });

  const [newEntry, setNewEntry] = useState<{ type: ExerciseType; reps: string; weight: string }>({
    type: 'pushups',
    reps: '',
    weight: ''
  });

  useEffect(() => {
    localStorage.setItem('fit_logs', JSON.stringify(logs));
  }, [logs]);

  // Calculate Max Stats for each exercise
  const maxStats = useMemo(() => {
    return EXERCISES.map(ex => {
      const exerciseLogs = logs.filter(log => log.type === ex.id);
      const maxRep = exerciseLogs.length > 0 
        ? Math.max(...exerciseLogs.map(l => l.reps)) 
        : 0;
      const maxWeight = exerciseLogs.length > 0 
        ? Math.max(...exerciseLogs.map(l => l.weight || 0)) 
        : 0;
      return { ...ex, maxRep, maxWeight };
    });
  }, [logs]);

  // Calculate filtered totals based on the selected timeframe
  const filteredStats = useMemo(() => {
    const now = new Date();
    
    return EXERCISES.map(ex => {
      const filteredLogs = logs.filter(log => {
        if (log.type !== ex.id) return false;
        const logDate = new Date(log.date);
        
        switch (timeFrame) {
          case 'daily':
            return logDate.toDateString() === now.toDateString();
          case 'weekly':
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            return logDate >= weekAgo;
          case 'monthly':
            return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
          case 'yearly':
            return logDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
      
      const totalReps = filteredLogs.reduce((acc, curr) => acc + curr.reps, 0);
      const maxWeightPeriod = filteredLogs.length > 0 
        ? Math.max(...filteredLogs.map(l => l.weight || 0)) 
        : 0;
      return { ...ex, totalReps, maxWeightPeriod };
    });
  }, [logs, timeFrame]);

  const handleAddLog = () => {
    const repsNum = parseInt(newEntry.reps);
    if (isNaN(repsNum) || repsNum <= 0) return;

    const weightNum = parseFloat(newEntry.weight);

    const log: WorkoutLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      type: newEntry.type,
      reps: repsNum,
      weight: !isNaN(weightNum) ? weightNum : undefined
    };

    setLogs(prevLogs => [log, ...prevLogs]);
    setNewEntry({ type: newEntry.type, reps: '', weight: '' });
    setActiveTab('dashboard');
  };

  const deleteLog = (id: string) => {
    setLogs(prevLogs => prevLogs.filter(l => l.id !== id));
  };

  const clearAllData = () => {
    if (window.confirm("Are you sure you want to delete all workout history? This cannot be undone.")) {
      setLogs([]);
      localStorage.removeItem('fit_logs');
      setActiveTab('dashboard');
    }
  };

  const exportToCSV = () => {
    if (logs.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = ['Date', 'Time', 'Exercise', 'Reps', 'Weight'];
    const rows = logs.map(log => {
      const d = new Date(log.date);
      const exerciseLabel = EXERCISES.find(e => e.id === log.type)?.label || log.type;
      return [
        d.toLocaleDateString(),
        d.toLocaleTimeString(),
        exerciseLabel,
        log.reps,
        log.weight || 0
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `fit_track_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const lines = content.split('\n');
      const newLogs: WorkoutLog[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        if (parts.length < 4) continue;

        const [dateStr, timeStr, exerciseLabel, repsStr, weightStr] = parts;
        const reps = parseInt(repsStr);
        const weight = weightStr ? parseFloat(weightStr) : undefined;
        
        const exercise = EXERCISES.find(ex => ex.label === exerciseLabel);
        const type = exercise ? exercise.id : (exerciseLabel.toLowerCase().replace(' ', '_') as ExerciseType);
        const dateObj = new Date(`${dateStr} ${timeStr}`);
        
        if (!isNaN(dateObj.getTime()) && !isNaN(reps)) {
          newLogs.push({
            id: crypto.randomUUID(),
            date: dateObj.toISOString(),
            type,
            reps,
            weight: weight && !isNaN(weight) ? weight : undefined
          });
        }
      }

      if (newLogs.length > 0) {
        if (window.confirm(`Found ${newLogs.length} logs. Do you want to merge them with your current history?`)) {
          setLogs(prev => [...newLogs, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          alert("Import successful!");
        }
      } else {
        alert("No valid data found in the CSV file.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <section>
            <ProgressChart logs={logs} timeFrame={timeFrame} setTimeFrame={setTimeFrame} />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <span role="img" aria-label="trophy">🏆</span> Personal Bests
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {maxStats.map(ex => (
                <div key={`pb-${ex.id}`} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ex.color} bg-opacity-10`}>
                      {ex.icon}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{ex.label}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{ex.targetMuscle}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <p className="text-xl font-black text-indigo-600">{ex.maxRep}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Max Reps</p>
                    </div>
                    {ex.isWeighted && (
                      <div className="text-right border-l border-slate-100 pl-4">
                        <p className="text-xl font-black text-emerald-600">{ex.maxWeight}<span className="text-[10px] font-normal ml-0.5">kg</span></p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Max Weight</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Active Stats</h2>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50 shadow-inner">
                {(['daily', 'weekly', 'monthly', 'yearly'] as TimeFrame[]).map((tf) => (
                  <button
                    key={`summary-filter-${tf}`}
                    onClick={() => setTimeFrame(tf)}
                    className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-md transition-all ${
                      timeFrame === tf 
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {tf.charAt(0)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {filteredStats.map(ex => (
                <div key={`total-${ex.id}`} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                  <div className="flex items-center justify-center mb-2">
                    {ex.icon}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight text-center">{ex.label}</span>
                  <span className="text-xl font-bold text-slate-800">{ex.totalReps}</span>
                  {ex.isWeighted && (
                    <span className="text-[9px] font-bold text-emerald-600">Peak: {ex.maxWeightPeriod}kg</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'add' && (
        <div className="space-y-8 py-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800">New Session</h2>
            <p className="text-slate-500 text-sm mt-1">Record your progress today.</p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 ml-1">Exercise Type</label>
            <div className="grid grid-cols-1 gap-3">
              {EXERCISES.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => setNewEntry({ ...newEntry, type: ex.id })}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                    newEntry.type === ex.id 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md scale-[1.02]' 
                    : 'border-slate-100 bg-white text-slate-600'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center p-2 ${ex.color} bg-opacity-10`}>
                    {ex.icon}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg leading-tight">{ex.label}</p>
                    <p className="text-xs opacity-60 uppercase font-bold tracking-wider">{ex.targetMuscle}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 ml-1">Repetitions</label>
              <input 
                type="number" 
                inputMode="numeric"
                value={newEntry.reps}
                onChange={(e) => setNewEntry({ ...newEntry, reps: e.target.value })}
                placeholder="0"
                className="w-full text-2xl font-bold text-center p-5 bg-slate-100 rounded-2xl border-none focus:ring-4 focus:ring-indigo-200 outline-none transition-all placeholder:text-slate-300"
              />
            </div>
            
            <div className={`space-y-2 transition-opacity ${EXERCISES.find(e => e.id === newEntry.type)?.isWeighted ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <label className="block text-sm font-medium text-slate-700 ml-1">Weight (kg)</label>
              <input 
                type="number" 
                inputMode="decimal"
                value={newEntry.weight}
                onChange={(e) => setNewEntry({ ...newEntry, weight: e.target.value })}
                placeholder="0"
                disabled={!EXERCISES.find(e => e.id === newEntry.type)?.isWeighted}
                className="w-full text-2xl font-bold text-center p-5 bg-slate-100 rounded-2xl border-none focus:ring-4 focus:ring-indigo-200 outline-none transition-all placeholder:text-slate-300"
              />
            </div>
          </div>

          <button
            disabled={!newEntry.reps || parseInt(newEntry.reps) <= 0}
            onClick={handleAddLog}
            className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-bold text-lg shadow-lg active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale"
          >
            Log Workout
          </button>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <header className="text-center py-4">
            <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
            <p className="text-slate-500 text-sm">Manage your data and workout history</p>
          </header>

          <section className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Data Management</h3>
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              <button 
                onClick={exportToCSV}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors border-b border-slate-50"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </div>
                  <div className="text-left font-bold text-slate-800">Export as CSV</div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><polyline points="9 18 15 12 9 6"/></svg>
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors border-b border-slate-50"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <div className="text-left font-bold text-slate-800">Import CSV</div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><polyline points="9 18 15 12 9 6"/></svg>
              </button>

              <button 
                onClick={clearAllData}
                className="w-full flex items-center justify-between p-5 hover:bg-red-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-red-50 p-2 rounded-lg text-red-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </div>
                  <div className="text-left font-bold text-red-600">Wipe All Data</div>
                </div>
              </button>
            </div>
          </section>

          <section className="space-y-4 pb-20">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 text-center">Workout History</h3>
            {logs.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border border-slate-100 text-center text-slate-400 text-sm">
                No history found. Start training!
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map(log => {
                  const ex = EXERCISES.find(e => e.id === log.type);
                  return (
                    <div key={log.id} className="bg-white p-4 rounded-xl flex items-center justify-between border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-full">
                          {ex?.icon}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{ex?.label}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {new Date(log.date).toLocaleString(undefined, { 
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-black text-indigo-600 leading-tight">{log.reps} reps</p>
                          {log.weight && <p className="text-[10px] font-bold text-emerald-600">@ {log.weight}kg</p>}
                        </div>
                        <button 
                          onClick={() => deleteLog(log.id)}
                          className="text-slate-200 hover:text-red-500 transition-colors p-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </Layout>
  );
};

export default App;