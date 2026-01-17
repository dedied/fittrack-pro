import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { WorkoutLog, EXERCISES } from '../types';
import { TimeFrame } from '../App';

type MetricType = 'reps' | 'weight';

interface ProgressChartProps {
  logs: WorkoutLog[];
}

const ProgressChart: React.FC<ProgressChartProps> = ({ logs }) => {
  const [metric, setMetric] = useState<MetricType>('reps');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('weekly');

  const chartData = useMemo(() => {
    if (logs.length === 0) return [];

    const now = new Date();
    // Sort logs chronologically
    const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Filter logs based on the selected timeframe
    const filteredLogs = sortedLogs.filter(log => {
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

    // If viewing Daily, we show individual sets (timestamps).
    // For Weekly/Monthly/Yearly, we AGGREGATE (sum reps, max weight) by Day or Month.
    if (timeFrame === 'daily') {
       return filteredLogs.map(log => {
         const value = metric === 'reps' ? log.reps : (log.weight || 0);
         return {
           timestamp: new Date(log.date).getTime(),
           [log.type]: value > 0 ? value : null,
           fullDate: new Date(log.date),
           type: log.type
         };
       });
    }

    // Aggregation Logic for Weekly/Monthly/Yearly
    const groups = new Map<string, any>();

    filteredLogs.forEach(log => {
      const d = new Date(log.date);
      let key: string;
      let timestamp: number;

      if (timeFrame === 'yearly') {
        // Group by Month (YYYY-MM)
        key = `${d.getFullYear()}-${d.getMonth()}`;
        timestamp = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      } else {
        // Group by Day (YYYY-MM-DD) for Weekly/Monthly
        key = d.toDateString();
        timestamp = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      }

      if (!groups.has(key)) {
        groups.set(key, {
          timestamp,
          fullDate: new Date(timestamp), // Used for formatting tooltips
          // Initialize values
          pushups: 0,
          situps: 0,
          bicep_curls: 0
        });
      }

      const entry = groups.get(key);
      const val = metric === 'reps' ? log.reps : (log.weight || 0);

      if (metric === 'reps') {
        // Sum reps
        entry[log.type] = (entry[log.type] || 0) + val;
      } else {
        // Max weight (it makes more sense to track PR/Max weight per day than sum of weights)
        entry[log.type] = Math.max((entry[log.type] || 0), val);
      }
    });
    
    const aggregatedData = Array.from(groups.values()).sort((a, b) => a.timestamp - b.timestamp);

    // Post-process to convert 0 values to null so recharts doesn't plot them
    return aggregatedData.map(point => {
      const newPoint = { ...point };
      EXERCISES.forEach(ex => {
        if (newPoint[ex.id] === 0) {
          newPoint[ex.id] = null;
        }
      });
      return newPoint;
    });

  }, [logs, timeFrame, metric]);

  const formatXAxis = (tick: number) => {
    const date = new Date(tick);
    if (timeFrame === 'daily') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } else if (timeFrame === 'weekly') {
      return date.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
    } else if (timeFrame === 'monthly') {
      return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
  };

  const getLineColor = (id: string) => {
    switch (id) {
      case 'pushups': return '#15803d';
      case 'situps': return '#7e22ce';
      case 'bicep_curls': return '#ef4444';
      default: return '#cbd5e1';
    }
  };

  if (logs.length === 0) {
    return (
      <div className="h-72 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm space-y-2">
        <div className="text-3xl opacity-20">📊</div>
        <p>Log a workout to see progress!</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Timeline</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {timeFrame === 'daily' ? 'Individual Sets' : 'Cumulative Progress'}
            </p>
          </div>
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50">
            {(['daily', 'weekly', 'monthly', 'yearly'] as TimeFrame[]).map((tf) => (
              <button
                key={`chart-filter-${tf}`}
                onClick={() => setTimeFrame(tf)}
                className={`px-2 py-1 text-[9px] font-bold uppercase rounded-lg transition-all ${
                  timeFrame === tf 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tf === 'yearly' ? 'Y' : tf.charAt(0)}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-end">
          <div className="flex bg-indigo-50/50 p-1 rounded-xl gap-1 w-28">
            {(['reps', 'weight'] as MetricType[]).map((m) => (
              <button
                key={`metric-filter-${m}`}
                onClick={() => setMetric(m)}
                className={`flex-1 py-1 text-[8px] font-black uppercase rounded-lg transition-all ${
                  metric === m 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-indigo-400 hover:text-indigo-600'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full relative" style={{ height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="timestamp" 
              type="number"
              scale="time"
              domain={['auto', 'auto']}
              tickFormatter={formatXAxis}
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 9, fill: '#94a3b8' }} 
              dy={10}
              padding={{ left: 10, right: 10 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94a3b8' }} 
              width={30}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
              labelClassName="font-bold text-slate-800 mb-1"
              formatter={(value: number, name: string) => [
                value, 
                EXERCISES.find(e => e.id === name)?.label || name
              ]}
              labelFormatter={(label) => {
                const d = new Date(label);
                if (timeFrame === 'daily') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
              }}
            />
            <Legend 
              iconType="circle" 
              verticalAlign="top" 
              align="right" 
              wrapperStyle={{ paddingTop: '0px', paddingBottom: '20px', fontSize: '10px' }} 
            />
            {EXERCISES.map(ex => (
              <Line 
                key={ex.id}
                type="monotone" 
                dataKey={ex.id} 
                name={ex.label}
                stroke={getLineColor(ex.id)} 
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6 }}
                connectNulls={true}
                isAnimationActive={false} // Disable animation to prevent layout thrashing on resize
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProgressChart;