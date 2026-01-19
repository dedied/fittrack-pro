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
    <div className="h-full flex flex-col justify-center items-center py-6">
      <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 w-full max-w-xl">
         <div className="text-center mb-10">
           <h2 className="text-3xl font-black text-slate-800">Log Activity</h2>
           <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">What did you crush today?</p>
         </div>

         <div className="grid grid-cols-3 gap-4 mb-8">
           {EXERCISES.map(ex => {
             const isSelected = newEntry.type === ex.id;
             return (
               <button
                 key={ex.id}
                 onClick={() => setNewEntry({ ...newEntry, type: ex.id })}
                 className={`flex flex-col items-center justify-center p-6 rounded-[2rem] transition-all border-2 ${isSelected ? 'border-indigo-600 bg-indigo-50 shadow-inner' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`}
               >
                 <div className={`text-3xl transition-transform ${isSelected ? 'scale-125' : 'grayscale opacity-50'}`}>{ex.icon}</div>
               </button>
             );
           })}
         </div>
         
         <div className="text-center mb-10">
            <span className="text-indigo-600 font-black uppercase text-base tracking-widest border-b-4 border-indigo-100 pb-2">
              {currentEx?.label}
            </span>
         </div>

         <form onSubmit={handleAddLog}>
           <div className="space-y-6">
             <div className="relative group">
               <input 
                  type="datetime-local" 
                  value={toDateTimeLocal(entryDate)}
                  onChange={handleDateChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
               />
               <div className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] py-5 pl-14 pr-6 font-bold text-slate-700 transition-all text-sm flex items-center group-focus-within:border-indigo-500 group-hover:bg-slate-100/50">
                  {formatNiceDate(entryDate)}
               </div>
               <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
               </div>
             </div>

             <div className="flex gap-4">
                <div className="relative flex-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-6 bg-white px-2 z-10">Reps</label>
                   <input 
                     type="number" 
                     inputMode="numeric" 
                     pattern="[0-9]*"
                     placeholder="0" 
                     value={newEntry.reps} 
                     onChange={e => setNewEntry({ ...newEntry, reps: e.target.value })} 
                     enterKeyHint="go"
                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] p-5 text-2xl font-black text-center text-indigo-600 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder-slate-200"
                   />
                </div>
                {currentEx?.isWeighted && (
                   <div className="relative flex-1 animate-fade-in">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-6 bg-white px-2 z-10">Kg</label>
                     <input 
                       type="number" 
                       inputMode="decimal" 
                       placeholder="0" 
                       value={newEntry.weight} 
                       onChange={e => setNewEntry({ ...newEntry, weight: e.target.value })} 
                       enterKeyHint="go"
                       className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] p-5 text-2xl font-black text-center text-emerald-600 outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder-slate-200"
                     />
                   </div>
                )}
             </div>
           </div>

           <button 
             type="submit"
             disabled={!newEntry.reps}
             className="w-full mt-10 bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black text-xl shadow-xl shadow-indigo-200 active:scale-[0.98] transition-all disabled:opacity-40 disabled:shadow-none disabled:active:scale-100 flex items-center justify-center gap-2"
           >
             <span>Finish Entry</span>
           </button>
         </form>
      </div>
    </div>
  );
};

export default AddLogView;