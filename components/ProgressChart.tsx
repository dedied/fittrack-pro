import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { WorkoutLog, EXERCISES } from '../types';
import { TimeFrame } from '../App';

interface ProgressChartProps {
  logs: WorkoutLog[];
  timeFrame: TimeFrame;
  setTimeFrame: (tf: TimeFrame) => void;
}

const ProgressChart: React.FC<ProgressChartProps> = ({ logs, timeFrame, setTimeFrame }) => {
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
      aggregated[sortKey][log.type] = (aggregated[sortKey][log.type] || 0) + log.reps;
    });

    return Object.values(aggregated)
      .sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey))
      .slice(-12);
  }, [logs, timeFrame]);

  const getLineColor = (id: string) => {
    switch (id) {
      case 'pushups': return '#15803d'; // Dark Green (Green 700)
      case 'situps': return '#7e22ce'; // Dark Purple
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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Trends</h3>
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50 shadow-inner">
          {(['daily', 'weekly', 'monthly', 'yearly'] as TimeFrame[]).map((tf) => (
            <button
              key={`chart-filter-${tf}`}
              onClick={() => setTimeFrame(tf)}
              className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${
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