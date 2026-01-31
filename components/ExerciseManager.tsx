
import React, { useState, useMemo } from 'react';
import { EXERCISES, ExerciseType } from '../types';

interface ExerciseManagerProps {
  activeIds: ExerciseType[];
  onToggle: (id: ExerciseType) => void;
  onUpdate: (ids: ExerciseType[]) => void;
  onClose: () => void;
}

const ExerciseManager: React.FC<ExerciseManagerProps> = ({ activeIds, onToggle, onUpdate, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | string>('ALL');

  const categories = useMemo(() => {
    const cats = new Set<string>();
    EXERCISES.forEach(ex => {
      if (ex.categories) {
        ex.categories.forEach(c => cats.add(c));
      }
    });
    return Array.from(cats).sort();
  }, []);

  const filteredExercises = useMemo(() => {
    return EXERCISES.filter(ex => {
      const matchesSearch = ex.label.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesFilter = true;
      if (filter === 'ACTIVE') {
        matchesFilter = activeIds.includes(ex.id);
      } else if (filter !== 'ALL') {
        matchesFilter = ex.categories?.includes(filter) || false;
      }
      
      return matchesSearch && matchesFilter;
    });
  }, [searchTerm, filter, activeIds]);

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col">
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center gap-4 shadow-sm flex-shrink-0 safe-top">
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Manage Exercises</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeIds.length} Active</p>
        </div>
      </div>

      <div className="p-4 bg-white border-b border-slate-100 space-y-4 flex-shrink-0">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search exercises..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-10 pr-4 font-semibold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <button onClick={() => setFilter('ALL')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${filter === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200'}`}>All</button>
          <button onClick={() => setFilter('ACTIVE')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${filter === 'ACTIVE' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200'}`}>Selected ({activeIds.length})</button>
          {categories.map(cat => (<button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${filter === cat ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200'}`}>{cat}</button>))}
        </div>

        <div className="flex justify-end gap-3 pt-1 border-t border-slate-50">
           <button onClick={() => onUpdate(EXERCISES.map(e => e.id))} className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 px-2 py-1 rounded transition-colors">Select All</button>
           <button onClick={() => onUpdate([])} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:bg-slate-100 px-2 py-1 rounded transition-colors">Deselect All</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-1 gap-3">
          {filteredExercises.map(ex => {
            const isActive = activeIds.includes(ex.id);
            return (
              <button 
                key={ex.id}
                onClick={() => onToggle(ex.id)}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left relative overflow-hidden group hover:bg-white hover:border-slate-200
                    ${isActive ? 'bg-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-50 border-transparent'}
                `}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${isActive ? 'bg-indigo-50 grayscale-0 scale-110' : 'bg-slate-200 grayscale scale-100'}`}>{ex.icon}</div>
                <div className="flex-1">
                  <h3 className={`font-black text-base transition-colors ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>{ex.label}</h3>
                  <div className="flex gap-2">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{ex.targetMuscle}</p>
                     {ex.categories && ex.categories.includes('Gym') && (<span className="text-[9px] bg-slate-100 px-1.5 rounded text-slate-500 font-bold self-center">GYM</span>)}
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isActive ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                  {isActive && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                </div>
              </button>
            )
          })}
        </div>
        <div className="h-20" />
      </div>

      <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0 safe-bottom">
        <button onClick={onClose} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-[0.98] transition-all">Done</button>
      </div>
    </div>
  );
};

export default ExerciseManager;
