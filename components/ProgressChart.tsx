import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { WorkoutLog, EXERCISES, ExerciseType } from '../types';
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

    const aggregated: Record<string, any> = {};
    const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedLogs.forEach(log => {
      const d = new Date(log.date);
      let dateKey = '';
      let sortKey = '';

      if (timeFrame === 'daily') {
        dateKey = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        sortKey = d.toISOString().split('T')[0];
      } else if (timeFrame === 'weekly') {
        const day = d.getDay();
        const diff = d.getDate() - day;
        const startOfWeek = new Date(d.setDate(diff));
        dateKey = `Wk ${startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
        sortKey = startOfWeek.toISOString().split('T')[0];
      } else if (timeFrame === 'monthly') {
        dateKey = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
        sortKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      } else if (timeFrame === 'yearly') {
        dateKey = d.getFullYear().toString();
        sortKey = d.getFullYear().toString();
      }

      if (!aggregated[sortKey]) {
        aggregated[sortKey] = { label: dateKey, sortKey };
      }

      let value = 0;
      if (metric === 'reps') {
        value = log.reps;
      } else if (metric === 'weight') {
        value = log.weight || 0;
      }

      if (metric === 'weight') {
        aggregated[sortKey][log.type] = Math.max(aggregated[sortKey][log.type] || 0, value);
      } else {
        aggregated[sortKey][log.type] = (aggregated[sortKey][log.type] || 0) + value;
      }
    });

    return Object.values(aggregated)
      .sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey))
      .slice(-12);
  }, [logs, timeFrame, metric]);

  const getLineColor = (id: string) => {
    switch (id) {
      case 'pushups': return '#15803d'; // Green 700
      case 'situps': return '#7e22ce'; // Purple
      case 'bicep_curls': return '#ef4444'; // Red
      default: return '#cbd5e1';
    }
  };

  if (logs.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm space-y-2">
        <div className="text-3xl opacity-20">📊</div>
        <p>Log a workout to see progress!</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Analytics</h3>
          {/* Timeframe Filter for Chart */}
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
          {/* Metric Filter */}
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

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="label" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94a3b8' }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94a3b8' }} 
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
              labelClassName="font-bold text-slate-800 mb-1"
            />
            <Legend iconType="circle" verticalAlign="top" align="right" wrapperStyle={{ paddingTop: '0px', paddingBottom: '20px', fontSize: '10px' }} />
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
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProgressChart;