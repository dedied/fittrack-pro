
import React, { useState, useEffect } from 'react';
import { getAIInsights } from '../services/geminiService';
import { WorkoutLog } from '../types';

interface AICoachProps {
  logs: WorkoutLog[];
}

const AICoach: React.FC<AICoachProps> = ({ logs }) => {
  const [insight, setInsight] = useState<string>('Analyzing your progress...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsight = async () => {
      setLoading(true);
      const res = await getAIInsights(logs);
      setInsight(res);
      setLoading(false);
    };
    
    fetchInsight();
  }, [logs.length]); // Re-fetch only when log count changes

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-2xl shadow-md text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 p-3 opacity-20">
        <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2Z"/><path d="M12 12 2.1 11.7A10 10 0 0 1 12 2V12Z"/><path d="m21.2 18-9.2-6 9.2-6c.5 1.2.8 2.5.8 4s-.3 2.8-.8 4Z"/></svg>
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Coach AI</span>
        </div>
        <p className={`text-sm leading-relaxed ${loading ? 'animate-pulse text-white/70' : ''}`}>
          {insight}
        </p>
      </div>
    </div>
  );
};

export default AICoach;
