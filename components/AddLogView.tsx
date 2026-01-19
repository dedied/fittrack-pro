import React from 'react';
import { EXERCISES, ExerciseType } from '../types';
import { toDateTimeLocal, formatNiceDate } from '../utils/dateUtils';

interface AddLogViewProps {
  newEntry: { type: ExerciseType; reps: string; weight: string };
  setNewEntry: React.Dispatch<React.SetStateAction<{ type: ExerciseType; reps: string; weight: string }>>;
  entryDate: Date;
  handleDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAddLog: (e?: React.FormEvent) => void;
}

const AddLogView: React.FC<AddLogViewProps> = ({
  newEntry,
  setNewEntry,
  entryDate,
  handleDateChange,
  handleAddLog
}) => {
  const currentEx = EXERCISES.find(e => e.id === newEntry.type);

  return (
    <div className="h-full flex flex-col justify-center">
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
         <div className="text-center mb-8">
           <h2 className="text-2xl font-black text-slate-800">New Entry</h2>
           <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Select Exercise & Details</p>
         </div>

         <div className="grid grid-cols-3 gap-3 mb-6">
           {EXERCISES.map(ex => {
             const isSelected = newEntry.type === ex.id;
             return (
               <button
                 key={ex.id}
                 onClick={() => setNewEntry({ ...newEntry, type: ex.id })}
                 className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all border-2 ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`}
               >
                 <div className={`text-2xl mb-2 transition-transform ${isSelected ? 'scale-110' : 'grayscale opacity-50'}`}>{ex.icon}</div>
               </button>
             );
           })}
         </div>
         
         <div className="text-center mb-8">
            <span className="text-indigo-600 font-black uppercase text-sm tracking-widest border-b-2 border-indigo-100 pb-1">
              {currentEx?.label}
            </span>
         </div>

         <form onSubmit={handleAddLog}>
           <div className="space-y-4">
             <div className="relative group">
               <input 
                  type="datetime-local" 
                  value={toDateTimeLocal(entryDate)}
                  onChange={handleDateChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
               />
               <div className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-700 transition-colors text-sm flex items-center group-focus-within:border-indigo-500">
                  {formatNiceDate(entryDate)}
               </div>
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
               </div>
             </div>

             <div className="flex gap-3">
                <div className="relative flex-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-3 bg-white px-1 z-10">Reps</label>
                   <input 
                     type="number" 
                     inputMode="numeric" 
                     pattern="[0-9]*"
                     placeholder="0" 
                     value={newEntry.reps} 
                     onChange={e => setNewEntry({ ...newEntry, reps: e.target.value })} 
                     enterKeyHint="go"
                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xl font-black text-center text-indigo-600 outline-none focus:border-indigo-500 transition-colors placeholder-slate-200"
                   />
                </div>
                {currentEx?.isWeighted && (
                   <div className="relative flex-1 animate-fade-in">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-3 bg-white px-1 z-10">Kg</label>
                     <input 
                       type="number" 
                       inputMode="decimal" 
                       placeholder="0" 
                       value={newEntry.weight} 
                       onChange={e => setNewEntry({ ...newEntry, weight: e.target.value })} 
                       enterKeyHint="go"
                       className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xl font-black text-center text-emerald-600 outline-none focus:border-emerald-500 transition-colors placeholder-slate-200"
                     />
                   </div>
                )}
             </div>
           </div>

           <button 
             type="submit"
             disabled={!newEntry.reps}
             className="w-full mt-8 bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
           >
             <span>Save Entry</span>
           </button>
         </form>
      </div>
    </div>
  );
};

export default AddLogView;