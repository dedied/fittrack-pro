
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { 
  LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush 
} from 'recharts';
import { WorkoutLog, ExerciseDefinition, UnitSystem } from '../types';
import { toDisplayDistance, toDisplayWeight, isDistanceExercise, getUnitLabel, getWeightUnit } from '../utils/units';

interface ProgressChartProps {
  logs: WorkoutLog[];
  activeExercises: ExerciseDefinition[];
  onRangeChange: (start: Date, end: Date) => void;
  unitSystem: UnitSystem;
}

type RangeOption = 'W' | 'M' | 'Y' | 'ALL';
type ChartMode = 'performance' | 'volume';

const ProgressChart: React.FC<ProgressChartProps> = ({ logs, activeExercises, onRangeChange, unitSystem }) => {
  // performance = Max Weight (or Max Reps for bodyweight)
  // volume = Total Reps / Distance
  const [mode, setMode] = useState<ChartMode>(() => 
    (localStorage.getItem('fit_chart_mode') as ChartMode) || 'performance'
  );
  
  const [activeSeries, setActiveSeries] = useState<string[]>([]);
  const [rangeOption, setRangeOption] = useState<RangeOption>('M');
  
  const [brushRange, setBrushRange] = useState<{startIndex: number, endIndex: number} | null>(null);
  const lastEmittedRange = useRef<{start: number, end: number} | null>(null);
  const onRangeChangeRef = useRef(onRangeChange);
  
  useEffect(() => {
    onRangeChangeRef.current = onRangeChange;
  }, [onRangeChange]);

  const handleModeChange = (newMode: ChartMode) => {
    setMode(newMode);
    localStorage.setItem('fit_chart_mode', newMode);
  };

  // 1. Prepare Data: Fill gaps so we have a continuous timeline
  const chartData = useMemo(() => {
    if (logs.length === 0) return [];
    const validLogs = logs.filter(l => !isNaN(new Date(l.date).getTime()));
    if (validLogs.length === 0) return [];
    
    // Sort logs
    const sortedLogs = [...validLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Determine boundaries
    const firstLogDate = new Date(sortedLogs[0].date);
    const today = new Date();
    firstLogDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    // Group logs by day
    const logMap = new Map<string, WorkoutLog[]>();
    sortedLogs.forEach(l => {
      const d = new Date(l.date);
      d.setHours(0,0,0,0);
      const dStr = d.getTime().toString(); 
      if (!logMap.has(dStr)) logMap.set(dStr, []);
      logMap.get(dStr)?.push(l);
    });

    const dataPoints = [];
    // Ensure we start at least 30 days ago if data is sparse, or from first log
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);
    const startLoop = new Date(firstLogDate < startDate ? firstLogDate : startDate);

    while (startLoop <= today) {
        const lookupKey = startLoop.getTime().toString();
        const dayLogs = logMap.get(lookupKey) || [];
        
        const point: any = {
            date: startLoop.getTime(), 
            fullDate: new Date(startLoop),
        };

        activeExercises.forEach(ex => {
            const relevantLogs = dayLogs.filter(l => l.type === ex.id);
            
            if (relevantLogs.length === 0) {
               point[ex.id] = null; // Gap in data for Line chart connectivity
               return;
            }

            if (mode === 'volume') {
                // Volume = Sum of Reps (or Distance)
                const sum = relevantLogs.reduce((acc, curr) => acc + curr.reps, 0);
                const displaySum = isDistanceExercise(ex.id) ? toDisplayDistance(sum, unitSystem) : sum;
                point[ex.id] = displaySum; 
            } else {
                // Performance = Max Weight (if weighted) OR Max Reps (if bodyweight)
                if (ex.isWeighted) {
                    const maxW = Math.max(0, ...relevantLogs.map(l => l.weight || 0));
                    point[ex.id] = toDisplayWeight(maxW, unitSystem);
                } else {
                    // For bodyweight/cardio, "Performance" is the best single set/run
                    const maxR = Math.max(0, ...relevantLogs.map(l => l.reps));
                    const displayMaxR = isDistanceExercise(ex.id) ? toDisplayDistance(maxR, unitSystem) : maxR;
                    point[ex.id] = displayMaxR;
                }
            }
        });

        dataPoints.push(point);
        startLoop.setDate(startLoop.getDate() + 1);
    }
    return dataPoints;
  }, [logs, mode, activeExercises, unitSystem]);

  // Brush / Range Logic
  const applyRangeFilter = useCallback((option: RangeOption) => {
    setRangeOption(option);
    if (chartData.length === 0) return;
    const endIdx = chartData.length - 1;
    let startIdx = 0;
    
    // Calculate days based on option
    if (option === 'W') startIdx = Math.max(0, endIdx - 6); // Last 7 days
    else if (option === 'M') startIdx = Math.max(0, endIdx - 30);
    else if (option === 'Y') startIdx = Math.max(0, endIdx - 365);
    else startIdx = 0; // ALL
    
    setBrushRange({ startIndex: startIdx, endIndex: endIdx });
  }, [chartData.length]);

  // Initialize range on load
  useEffect(() => {
    if (chartData.length > 0) {
        if (!brushRange || brushRange.endIndex >= chartData.length) {
            applyRangeFilter('M');
        }
    }
  }, [chartData.length, applyRangeFilter]);

  const handleBrushChange = useCallback((e: any) => {
    if (!e || e.startIndex === undefined || e.endIndex === undefined) return;
    setBrushRange(prev => {
        if (prev && prev.startIndex === e.startIndex && prev.endIndex === e.endIndex) return prev;
        return { startIndex: e.startIndex, endIndex: e.endIndex };
    });
  }, []);

  // Emit range changes to parent (dashboard)
  useEffect(() => {
    if (chartData.length > 0 && brushRange) {
         const startItem = chartData[brushRange.startIndex];
         const endItem = chartData[brushRange.endIndex];
         if (startItem && endItem) {
             const startTs = startItem.date;
             const endTs = endItem.date;
             if (!lastEmittedRange.current || lastEmittedRange.current.start !== startTs || lastEmittedRange.current.end !== endTs) {
                 lastEmittedRange.current = { start: startTs, end: endTs };
                 onRangeChangeRef.current(startItem.fullDate, endItem.fullDate);
             }
         }
    }
  }, [brushRange, chartData]);

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-slate-100 text-xs">
          <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2">
            {new Date(label).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <div className="space-y-1.5">
            {payload.map((entry: any) => {
              const ex = activeExercises.find(e => e.id === entry.dataKey);
              if (!ex) return null;
              
              // Determine unit suffix
              let unit = '';
              if (mode === 'volume') {
                 unit = isDistanceExercise(ex.id) ? getUnitLabel(ex.id, unitSystem) : 'reps';
              } else {
                 if (ex.isWeighted) unit = getWeightUnit(unitSystem);
                 else if (isDistanceExercise(ex.id)) unit = getUnitLabel(ex.id, unitSystem);
                 else unit = 'reps';
              }

              return (
                <div key={entry.dataKey} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-500 font-medium">{entry.name}</span>
                  </div>
                  <span className="font-black text-slate-800">
                    {entry.value} <span className="text-[9px] text-slate-400 uppercase font-bold">{unit}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const handleToggleSeries = (id: string) => {
    setActiveSeries(prev => {
        if (prev.includes(id)) {
            return prev.filter(item => item !== id);
        } else {
            return [...prev, id];
        }
    });
  };

  return (
    <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col space-y-6">
      
      {/* Header Controls */}
      <div className="flex flex-col gap-4">
         <div className="flex justify-between items-center">
             {/* Chart Type Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl flex">
                <button
                    onClick={() => handleModeChange('performance')}
                    className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-2 ${mode === 'performance' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <span>📈</span> Performance
                </button>
                <button
                    onClick={() => handleModeChange('volume')}
                    className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-2 ${mode === 'volume' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <span>📊</span> Volume
                </button>
            </div>
         </div>
         
         {/* Time Range */}
         <div className="flex justify-between items-center border-t border-slate-50 pt-4">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest pl-2">Range</span>
            <div className="flex gap-1">
                {(['W', 'M', 'Y', 'ALL'] as RangeOption[]).map(opt => (
                    <button
                        key={opt}
                        onClick={() => applyRangeFilter(opt)}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                            rangeOption === opt ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-transparent text-slate-400 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
         </div>
      </div>

      <div className="w-full h-64 select-none relative z-0">
         {logs.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-3xl">
                 <span className="text-4xl mb-2">📉</span>
                 <p className="text-xs font-bold uppercase tracking-widest">No data logged yet</p>
             </div>
         ) : (
            <ResponsiveContainer width="100%" height="100%">
               {mode === 'performance' ? (
                   <LineChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(tick) => new Date(tick).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} minTickGap={30} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={30} />
                        <Tooltip content={<CustomTooltip />} />
                        {activeExercises.map(ex => {
                            // Only show if active series is empty (all) or includes this id
                            if (activeSeries.length > 0 && !activeSeries.includes(ex.id)) return null;
                            return (
                                <Line 
                                    key={ex.id} 
                                    type="monotone" 
                                    connectNulls
                                    dataKey={ex.id} 
                                    name={ex.label} 
                                    stroke={ex.chartColor} 
                                    strokeWidth={3}
                                    dot={{ r: 3, fill: ex.chartColor, strokeWidth: 0 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            );
                        })}
                        <Brush dataKey="date" height={30} stroke="#cbd5e1" travellerWidth={10} startIndex={brushRange?.startIndex} endIndex={brushRange?.endIndex} onChange={handleBrushChange} tickFormatter={() => ''} alwaysShowText={false} fill="#f8fafc" />
                   </LineChart>
               ) : (
                   <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(tick) => new Date(tick).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} minTickGap={30} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={30} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                        {activeExercises.map(ex => {
                             if (activeSeries.length > 0 && !activeSeries.includes(ex.id)) return null;
                            return (
                                <Bar 
                                    key={ex.id} 
                                    dataKey={ex.id} 
                                    name={ex.label} 
                                    fill={ex.chartColor} 
                                    radius={[4, 4, 0, 0]}
                                    stackId="a" // Stack bars to avoid clutter, or remove to group them
                                />
                            );
                        })}
                        <Brush dataKey="date" height={30} stroke="#cbd5e1" travellerWidth={10} startIndex={brushRange?.startIndex} endIndex={brushRange?.endIndex} onChange={handleBrushChange} tickFormatter={() => ''} alwaysShowText={false} fill="#f8fafc" />
                   </BarChart>
               )}
            </ResponsiveContainer>
         )}
      </div>

      {/* Series Toggles (Legend) */}
      <div className="flex overflow-x-auto pb-2 custom-scrollbar items-center gap-3 border-t border-slate-50 pt-4">
          <button
             onClick={() => setActiveSeries([])}
             className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap border ${activeSeries.length === 0 ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200'}`}
          >
             All
          </button>
          {activeExercises.map(ex => {
            const isSelected = activeSeries.includes(ex.id);
            // Dim if we have a selection but this specific one is not selected
            const isDimmed = activeSeries.length > 0 && !isSelected;

            return (
              <button
                key={ex.id}
                onClick={() => handleToggleSeries(ex.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                    isDimmed ? 'opacity-30' : 'opacity-100'
                } ${isSelected ? 'ring-2 ring-offset-1' : ''}`}
                style={{ 
                    backgroundColor: `${ex.chartColor}15`, // very light background
                    color: ex.chartColor, 
                    borderColor: 'transparent',
                    ['--tw-ring-color' as any]: ex.chartColor 
                }}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ex.chartColor }} />
                {ex.label}
              </button>
            );
          })}
      </div>
      
      {/* Help Text */}
      <div className="text-center">
        <p className="text-[10px] text-slate-400 font-medium">
            {mode === 'performance' 
                ? "Showing your best set (Max Weight or Max Reps) per day." 
                : "Showing total accumulated work (Sum of Reps/Distance) per day."}
        </p>
      </div>
    </div>
  );
};

export default ProgressChart;
