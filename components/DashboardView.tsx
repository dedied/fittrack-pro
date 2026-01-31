
import React, { useState, useMemo, useCallback } from 'react';
import ProgressChart from './ProgressChart';
import { WorkoutLog, ExerciseDefinition, ExerciseType, UnitSystem } from '../types';
import { toDisplayDistance, toDisplayWeight, isDistanceExercise, getUnitLabel, getWeightUnit } from '../utils/units';

interface DashboardViewProps {
  logs: WorkoutLog[];
  maxStats: any[];
  activeExercises: ExerciseDefinition[];
  setViewingHistory: (id: ExerciseType) => void;
  unitSystem: UnitSystem;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  logs,
  maxStats,
  activeExercises,
  setViewingHistory,
  unitSystem
}) => {
  // State to track the currently visible date range on the graph
  const [visibleRange, setVisibleRange] = useState<{start: Date, end: Date} | null>(null);

  // Memoize the handler to prevent infinite update loops in child component
  const handleRangeChange = useCallback((start: Date, end: Date) => {
    setVisibleRange(prev => {
        if (prev && prev.start.getTime() === start.getTime() && prev.end.getTime() === end.getTime()) {
            return prev;
        }
        return { start, end };
    });
  }, []);

  // Calculate stats dynamically based on the Visible Range from the chart
  const filteredStats = useMemo(() => {
    if (!visibleRange) return activeExercises.map(ex => ({ ...ex, totalReps: 0 }));

    return activeExercises.map(ex => {
      const totalRaw = logs.filter(l => {
        if (l.type !== ex.id) return false;
        const d = new Date(l.date);
        d.setHours(0,0,0,0);
        const start = new Date(visibleRange.start); start.setHours(0,0,0,0);
        const end = new Date(visibleRange.end); end.setHours(23,59,59,999);
        return d >= start && d <= end;
      }).reduce((a, c) => a + c.reps, 0);

      // Convert total if it's a distance
      const displayTotal = isDistanceExercise(ex.id) 
        ? toDisplayDistance(totalRaw, unitSystem)
        : totalRaw;
      
      return { 
        ...ex, 
        totalReps: displayTotal 
      };
    });
  }, [logs, visibleRange, activeExercises, unitSystem]);

  // Convert Max Stats (Records)
  const displayMaxStats = useMemo(() => {
    return maxStats.map(stat => ({
      ...stat,
      maxRep: isDistanceExercise(stat.id) ? toDisplayDistance(stat.maxRep, unitSystem) : stat.maxRep,
      maxWeight: stat.maxWeight ? toDisplayWeight(stat.maxWeight, unitSystem) : 0
    }));
  }, [maxStats, unitSystem]);

  const formatDateRange = () => {
      if (!visibleRange) return "Select a range";
      const s = visibleRange.start;
      const e = visibleRange.end;
      const sameYear = s.getFullYear() === e.getFullYear();
      return (
        <span className="flex items-center gap-2">
            <span>{s.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: sameYear ? undefined : '2-digit' })}</span>
            <span className="text-slate-300">→</span>
            <span>{e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}</span>
        </span>
      );
  };

  const formatCompactNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    // For small integers, show as is. For small floats (like 5.2 km), show 1 decimal
    return Number.isInteger(num) ? num.toLocaleString() : num.toFixed(1);
  };

  return (
    <div className="space-y-8">
      {/* Chart Section */}
      <section className="w-full">
        <h2 className="text-xl font-black text-slate-800 mb-4 px-2">Progress</h2>
        <ProgressChart 
            logs={logs}
            activeExercises={activeExercises}
            onRangeChange={handleRangeChange} 
            unitSystem={unitSystem}
        />
      </section>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Period Totals (Controlled by Graph) */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between ml-2 gap-1">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Period Totals</h2>
            {/* Display the active range text */}
            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                {formatDateRange()}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredStats.map(ex => (
              <div 
                key={ex.id} 
                onClick={() => setViewingHistory(ex.id)}
                className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center cursor-pointer active:scale-95 transition-all hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5 group"
              >
                <div className="mb-3 transform scale-125 transition-transform group-hover:scale-110">{ex.icon}</div>
                <span className="text-[10px] text-slate-400 font-bold uppercase text-center tracking-wider truncate w-full px-2">{ex.label}</span>
                <div className="text-center mt-1 w-full overflow-hidden">
                  <span className="text-2xl font-black text-slate-800 truncate block">
                    {formatCompactNumber(ex.totalReps)}
                  </span>
                  <span className="text-[10px] text-slate-300 font-bold uppercase block -mt-1">
                    {getUnitLabel(ex.id, unitSystem)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] text-slate-300 italic">
              Scroll or zoom the chart above to change these totals
          </p>
        </section>

        {/* Personal Bests (All Time) */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-2">🏆 All-Time Bests</h2>
          <div className="grid grid-cols-1 gap-4">
            {displayMaxStats.map(ex => (
              <div key={ex.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between group hover:border-indigo-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${ex.color} bg-opacity-10 group-hover:scale-110 transition-transform`}>{ex.icon}</div>
                  <div>
                    <p className="font-black text-slate-800 text-lg leading-tight line-clamp-1">{ex.label}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{ex.targetMuscle}</p>
                  </div>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="text-right flex flex-col items-end">
                     <p className="text-2xl font-black text-indigo-600 leading-none">{formatCompactNumber(ex.maxRep)}</p>
                     <p className="text-[8px] text-slate-400 uppercase font-bold mt-1 tracking-widest">{getUnitLabel(ex.id, unitSystem)}</p>
                  </div>
                  {ex.isWeighted && (
                     <div className="text-right border-l border-slate-100 pl-4 flex flex-col items-end">
                       <p className="text-2xl font-black text-emerald-600 leading-none">{formatCompactNumber(ex.maxWeight)}{getWeightUnit(unitSystem)}</p>
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
