import React from 'react';
import { WorkoutLog, EXERCISES, ExerciseType } from '../types';
import { TimeFrame } from '../App';

interface HistoryViewProps {
  viewingHistory: ExerciseType;
  onClose: () => void;
  totalsTimeFrame: TimeFrame;
  historyLogs: WorkoutLog[];
  onDeleteLog: (id: string) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({
  viewingHistory,
  onClose,
  totalsTimeFrame,
  historyLogs,
  onDeleteLog
}) => {
  const exerciseDef = EXERCISES.find(e => e.id === viewingHistory);

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-slate-50 relative">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 flex items-center gap-4 z-30 shadow-sm sticky top-0">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">{exerciseDef?.label} History</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase">{totalsTimeFrame} Logs</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {historyLogs.length === 0 ? (
          <div className="text-center text-slate-400 py-10">No logs found for this period.</div>
        ) : (
          historyLogs.map(log => (
            <div key={log.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                  <div>
                     <p className="text-sm font-bold text-slate-800">{new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                     <p className="text-[10px] text-slate-400 font-bold">{new Date(log.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-lg font-black text-indigo-600">{log.reps} <span className="text-[10px] text-slate-400 font-bold uppercase">Reps</span></p>
                     {log.weight && <p className="text-xs font-bold text-emerald-600">{log.weight}kg</p>}
                  </div>
              </div>
              <div className="flex justify-end pt-2 border-t border-slate-50">
                  <button onClick={() => onDeleteLog(log.id)} className="text-red-500 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full flex items-center gap-1.5">
                     <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                     <span>Remove</span>
                  </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryView;