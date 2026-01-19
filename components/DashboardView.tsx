import React from 'react';
import ProgressChart from './ProgressChart';
import { WorkoutLog, EXERCISES, ExerciseType } from '../types';
import { TimeFrame } from '../App';

interface DashboardViewProps {
  logs: WorkoutLog[];
  totalsTimeFrame: TimeFrame;
  setTotalsTimeFrame: (tf: TimeFrame) => void;
  filteredStats: any[];
  maxStats: any[];
  setViewingHistory: (id: ExerciseType) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  logs,
  totalsTimeFrame,
  setTotalsTimeFrame,
  filteredStats,
  maxStats,
  setViewingHistory
}) => {
  return (
    <div className="space-y-6">
      <ProgressChart logs={logs} />
      
      <section className="space-y-3">
        <div className="flex items-center justify-between ml-1">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Period Totals</h2>
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50">
            {(['daily', 'weekly', 'monthly', 'yearly'] as TimeFrame[]).map(tf => (
              <button 
                key={tf} 
                onClick={() => setTotalsTimeFrame(tf)} 
                className={`px-2 py-1 text-[9px] font-bold uppercase rounded-lg ${totalsTimeFrame === tf ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                {tf.charAt(0)}
              </button>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          {filteredStats.map(ex => (
            <div 
              key={ex.id} 
              onClick={() => setViewingHistory(ex.id)}
              className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center cursor-pointer active:scale-95 transition-transform hover:border-indigo-100"
            >
              <div className="mb-2">{ex.icon}</div>
              <span className="text-[10px] text-slate-400 font-bold uppercase text-center">{ex.label}</span>
              <span className="text-xl font-bold text-slate-800">{ex.totalReps}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">🏆 Personal Bests</h2>
        <div className="grid grid-cols-1 gap-3">
          {maxStats.map(ex => (
            <div key={ex.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ex.color} bg-opacity-10`}>{ex.icon}</div>
                <div>
                  <p className="font-bold text-slate-800">{ex.label}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{ex.targetMuscle}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-right flex flex-col items-end">
                   <p className="text-xl font-black text-indigo-600 leading-none">{ex.maxRep}</p>
                   <p className="text-[8px] text-slate-400 uppercase font-bold mt-1">Reps</p>
                   {ex.maxRepDate && <p className="text-[9px] text-slate-400 font-medium mt-0.5 whitespace-nowrap">{new Date(ex.maxRepDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}, {new Date(ex.maxRepDate).toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit', hour12: false})}</p>}
                </div>
                {ex.isWeighted && (
                   <div className="text-right border-l pl-4 flex flex-col items-end">
                     <p className="text-xl font-black text-emerald-600 leading-none">{ex.maxWeight}kg</p>
                     <p className="text-[8px] text-slate-400 uppercase font-bold mt-1">Weight</p>
                     {ex.maxWeightDate && <p className="text-[9px] text-slate-400 font-medium mt-0.5 whitespace-nowrap">{new Date(ex.maxWeightDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}, {new Date(ex.maxWeightDate).toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit', hour12: false})}</p>}
                   </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DashboardView;