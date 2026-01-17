
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { WorkoutLog, EXERCISES } from '../types';

interface ProgressChartProps {
  logs: WorkoutLog[];
}

const ProgressChart: React.FC<ProgressChartProps> = ({ logs }) => {
  const chartData = useMemo(() => {
    const dailyData: Record<string, any> = {};
    
    // Sort logs by date
    const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedLogs.forEach(log => {
      const dateKey = new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey };
      }
      // Add or initialize exercise reps for that day
      dailyData[dateKey][log.type] = (dailyData[dateKey][log.type] || 0) + log.reps;
    });

    return Object.values(dailyData).slice(-7); // Last 7 active days
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center bg-slate-100 rounded-xl border border-dashed border-slate-300 text-slate-400 text-sm">
        No workout data to visualize yet.
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 h-64 w-full">
      <h3 className="text-sm font-semibold text-slate-500 mb-4 px-2">Weekly Performance</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
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
          />
          <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '10px' }} />
          {EXERCISES.map(ex => (
            <Line 
              key={ex.id}
              type="monotone" 
              dataKey={ex.id} 
              name={ex.label}
              stroke={ex.id === 'pushups' ? '#3b82f6' : ex.id === 'situps' ? '#6366f1' : '#f43f5e'} 
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProgressChart;
