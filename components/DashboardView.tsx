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
    <div className="space-y-8">
      {/* Chart Section - Wide on desktop */}
      <section className="w-full">
        <ProgressChart logs={logs} />
      </section>
      
      {/* Metrics Section - Side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Period Totals */}
        <section className="space-y-4">
          <div className="flex items-center justify-between ml-1">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Period Totals</h2>
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50">
              {(['daily', 'weekly', 'monthly', 'yearly'] as TimeFrame[]).map(tf => (
                <button 
                  key={tf} 
                  onClick={() => setTotalsTimeFrame(tf)} 
                  className={`px-3 py-1 text-[9px] font-bold uppercase rounded-lg transition-all ${totalsTimeFrame === tf ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {tf.charAt(0)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {filteredStats.map(ex => (
              <div 
                key={ex.id} 
                onClick={() => setViewingHistory(ex.id)}
                className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center cursor-pointer active:scale-95 transition-all hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5"
              >
                <div className="mb-3 transform scale-125">{ex.icon}</div>
                <span className="text-[10px] text-slate-400 font-bold uppercase text-center tracking-wider">{ex.label}</span>
                <span className="text-2xl font-black text-slate-800 mt-1">{ex.totalReps}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Personal Bests */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">🏆 Personal Bests</h2>
          <div className="grid grid-cols-1 gap-4">
            {maxStats.map(ex => (
              <div key={ex.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between group hover:border-indigo-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${ex.color} bg-opacity-10 group-hover:scale-110 transition-transform`}>{ex.icon}</div>
                  <div>
                    <p className="font-black text-slate-800 text-lg leading-tight">{ex.label}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{ex.targetMuscle}</p>
                  </div>
                </div>
                <div className="flex gap-6 items-center">
                  <div className="text-right flex flex-col items-end">
                     <p className="text-2xl font-black text-indigo-600 leading-none">{ex.maxRep}</p>
                     <p className="text-[8px] text-slate-400 uppercase font-bold mt-1 tracking-widest">Reps</p>
                  </div>
                  {ex.isWeighted && (
                     <div className="text-right border-l border-slate-100 pl-6 flex flex-col items-end">
                       <p className="text-2xl font-black text-emerald-600 leading-none">{ex.maxWeight}kg</p>
                       <p className="text-[8px] text-slate-400 uppercase font-bold mt-1 tracking-widest">Weight</p>
                     </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardView;