
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import ProgressChart from './components/ProgressChart';
import AICoach from './components/AICoach';
import { WorkoutLog, EXERCISES, ExerciseType } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'add'>('dashboard');
  const [logs, setLogs] = useState<WorkoutLog[]>(() => {
    const saved = localStorage.getItem('fit_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [newEntry, setNewEntry] = useState<{ type: ExerciseType; reps: string }>({
    type: 'pushups',
    reps: ''
  });

  useEffect(() => {
    localStorage.setItem('fit_logs', JSON.stringify(logs));
  }, [logs]);

  const handleAddLog = () => {
    const repsNum = parseInt(newEntry.reps);
    if (!repsNum || repsNum <= 0) return;

    const log: WorkoutLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      type: newEntry.type,
      reps: repsNum
    };

    setLogs([log, ...logs]);
    setNewEntry({ ...newEntry, reps: '' });
    setActiveTab('dashboard');
  };

  const deleteLog = (id: string) => {
    setLogs(logs.filter(l => l.id !== id));
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Daily Overview</h2>
            <AICoach logs={logs} />
          </section>

          <section>
            <ProgressChart logs={logs} />
          </section>

          <section className="grid grid-cols-3 gap-3">
            {EXERCISES.map(ex => {
              const total = logs
                .filter(l => l.type === ex.id)
                .reduce((acc, curr) => acc + curr.reps, 0);
              
              return (
                <div key={ex.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                  <span className="text-2xl mb-1">{ex.icon}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{ex.label}</span>
                  <span className="text-xl font-bold text-slate-800">{total}</span>
                </div>
              );
            })}
          </section>
        </div>
      )}

      {activeTab === 'add' && (
        <div className="space-y-8 py-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800">Log Activity</h2>
            <p className="text-slate-500 text-sm mt-1">What did you achieve today?</p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">Select Exercise</label>
            <div className="grid grid-cols-1 gap-3">
              {EXERCISES.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => setNewEntry({ ...newEntry, type: ex.id })}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                    newEntry.type === ex.id 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900' 
                    : 'border-slate-100 bg-white text-slate-600'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${ex.color} bg-opacity-10`}>
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

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Reps Accomplished</label>
            <input 
              type="number" 
              inputMode="numeric"
              value={newEntry.reps}
              onChange={(e) => setNewEntry({ ...newEntry, reps: e.target.value })}
              placeholder="e.g. 25"
              className="w-full text-3xl font-bold text-center p-6 bg-slate-100 rounded-2xl border-none focus:ring-4 focus:ring-indigo-200 outline-none transition-all placeholder:text-slate-300"
            />
          </div>

          <button
            disabled={!newEntry.reps || parseInt(newEntry.reps) <= 0}
            onClick={handleAddLog}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-lg shadow-lg active:scale-[0.98] transition-all disabled:opacity-30"
          >
            Save Workout
          </button>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Recent Logs</h2>
          {logs.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4 text-slate-200">📋</div>
              <p className="text-slate-400">Your history is empty.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map(log => {
                const ex = EXERCISES.find(e => e.id === log.type);
                return (
                  <div key={log.id} className="bg-white p-4 rounded-xl flex items-center justify-between border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl w-10 h-10 flex items-center justify-center bg-slate-50 rounded-full">
                        {ex?.icon}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{ex?.label}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {new Date(log.date).toLocaleString(undefined, { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-lg font-black text-indigo-600">{log.reps}</span>
                        <span className="text-[10px] ml-1 text-slate-400 font-bold uppercase tracking-tighter">reps</span>
                      </div>
                      <button 
                        onClick={() => deleteLog(log.id)}
                        className="text-slate-300 hover:text-red-400 p-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default App;
