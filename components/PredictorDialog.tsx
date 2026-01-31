
import React, { useState, useEffect, useMemo } from 'react';
import { ExerciseDefinition, UnitSystem, WorkoutLog } from '../types';
import { getWeightUnit, toStorageWeight } from '../utils/units';
import { calculateEstimated1RM, getTrainingPercentages, analyzeProgression, predictFutureMax, predictNextMilestone, ProgressionAnalysis } from '../utils/formulas';
import { toDisplayWeight } from '../utils/units';

interface PredictorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activeExercises: ExerciseDefinition[];
  logs: WorkoutLog[];
  unitSystem: UnitSystem;
}

const PredictorDialog: React.FC<PredictorDialogProps> = ({
  isOpen,
  onClose,
  activeExercises,
  logs,
  unitSystem
}) => {
  const eligibleExercises = useMemo(() => 
    activeExercises.filter(ex => ex.isWeighted), 
  [activeExercises]);

  const [activeTab, setActiveTab] = useState<'current' | 'future'>('current');
  const [selectedExId, setSelectedExId] = useState<string>(''); // Init as empty
  const [reps, setReps] = useState<string>('5');
  const [weight, setWeight] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);
  
  const [analyzedSet, setAnalyzedSet] = useState<{reps: number, weight: number, date: string} | null>(null);

  // Analysis State
  const [progressionData, setProgressionData] = useState<ProgressionAnalysis | null>(null);

  // Effect to select the first eligible exercise if none is selected
  useEffect(() => {
    if (!selectedExId && eligibleExercises.length > 0) {
      setSelectedExId(eligibleExercises[0].id);
    }
    if (selectedExId && !eligibleExercises.some(e => e.id === selectedExId)) {
      setSelectedExId('');
    }
  }, [eligibleExercises, selectedExId]);


  // When exercise or logs change, find the "Best Set" to pre-fill inputs and run analysis
  useEffect(() => {
    if (!selectedExId) {
        setWeight(''); setReps('5'); setAnalyzedSet(null); setProgressionData(null); return;
    }

    const relevantLogs = logs.filter(l => l.type === selectedExId && l.weight && l.weight > 0);
    const analysis = analyzeProgression(logs, selectedExId);
    setProgressionData(analysis);
    
    if (relevantLogs.length > 0) {
        let bestLog = relevantLogs[0];
        let maxEst = 0;
        relevantLogs.forEach(l => {
            const est = calculateEstimated1RM(l.weight!, l.reps);
            if (est > maxEst) { maxEst = est; bestLog = l; }
        });

        if (bestLog && bestLog.weight) {
            const displayWeight = toDisplayWeight(bestLog.weight, unitSystem);
            setWeight(displayWeight.toString());
            setReps(bestLog.reps.toString());
            setAnalyzedSet({ reps: bestLog.reps, weight: displayWeight, date: bestLog.date });
        }
    } else {
        setWeight(''); setReps('5'); setAnalyzedSet(null);
    }
  }, [selectedExId, logs, unitSystem]);

  if (!isOpen) return null;

  const w = parseFloat(weight);
  const r = parseFloat(reps);
  
  // "Current 1RM" Tab: Always reflects the values in the input fields
  const oneRepMaxDisplay = (w && r) ? calculateEstimated1RM(w, r) : 0;
  const zones = getTrainingPercentages(oneRepMaxDisplay);
  const weightUnit = getWeightUnit(unitSystem);

  // "Future Growth" Tab: Uses the dynamic baseline from analysis for all predictions
  const baselineForPrediction = progressionData?.projectedCurrent1RM || 0;
  const baselineForDisplay = toDisplayWeight(baselineForPrediction, unitSystem);

  const future4WeeksStorage = progressionData ? predictFutureMax(baselineForPrediction, 4, progressionData) : 0;
  const future8WeeksStorage = progressionData ? predictFutureMax(baselineForPrediction, 8, progressionData) : 0;
  const future12WeeksStorage = progressionData ? predictFutureMax(baselineForPrediction, 12, progressionData) : 0;

  const future4Weeks = toDisplayWeight(future4WeeksStorage, unitSystem);
  const future8Weeks = toDisplayWeight(future8WeeksStorage, unitSystem);
  const future12Weeks = toDisplayWeight(future12WeeksStorage, unitSystem);
  
  const milestoneStepStorage = unitSystem === 'metric' ? 2.5 : toStorageWeight(5);
  const milestone = progressionData ? predictNextMilestone(baselineForPrediction, progressionData, milestoneStepStorage) : { date: "Unknown", target: 0 };
  const milestoneTargetDisplay = toDisplayWeight(milestone.target, unitSystem);
  const milestoneGainDisplay = milestoneTargetDisplay - baselineForDisplay;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overlay-animate" onClick={handleOverlayClick}>
      <div className="bg-white rounded-[2.5rem] w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden dialog-animate shadow-2xl">
        
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black text-slate-800">Strength Predictor</h2>
            <button onClick={onClose} className="bg-slate-200 text-slate-500 rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-slate-300 transition-colors">✕</button>
          </div>
          
          <div className="flex p-1 bg-slate-200 rounded-xl">
             <button onClick={() => { setActiveTab('current'); setShowExplanation(false); }} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'current' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Current 1RM</button>
             <button onClick={() => { setActiveTab('future'); setShowExplanation(false); }} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'future' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Future Growth</button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
            
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Exercise</label>
                <select value={selectedExId} onChange={(e) => setSelectedExId(e.target.value)} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                    {eligibleExercises.length === 0 && <option disabled>No weighted exercises</option>}
                    {eligibleExercises.map(ex => (<option key={ex.id} value={ex.id}>{ex.label}</option>))}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Weight ({weightUnit})</label>
                    <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 font-black text-xl text-center text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0"/>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Reps</label>
                    <input type="number" value={reps} onChange={e => setReps(e.target.value)} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 font-black text-xl text-center text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0"/>
                </div>
            </div>

            {activeTab === 'current' ? (
                <>
                    {analyzedSet ? (
                        <div className="bg-indigo-50 p-3 rounded-xl flex items-center gap-3 border border-indigo-100">
                            <div className="bg-indigo-100 p-2 rounded-lg text-xl">💡</div>
                            <div className="text-xs text-indigo-800">
                                <span className="font-bold">Based on your best set:</span><br/>
                                {analyzedSet.weight}{weightUnit} x {analyzedSet.reps} on {new Date(analyzedSet.date).toLocaleDateString()}
                            </div>
                        </div>
                    ) : (<div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-400 text-center italic">Enter a set you performed to exhaustion.</div>)}

                    <div className="bg-slate-900 text-white p-6 rounded-2xl text-center shadow-lg shadow-slate-200">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Estimated One Rep Max</p>
                        <div className="text-5xl font-black text-white">{Math.round(oneRepMaxDisplay)}<span className="text-lg text-slate-500 ml-1">{weightUnit}</span></div>
                    </div>

                    {oneRepMaxDisplay > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest ml-1">Training Percentages</h3>
                            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden text-sm">
                                <table className="w-full">
                                    <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400">
                                        <tr>
                                            <th className="py-2 px-4 text-left">Intensity</th>
                                            <th className="py-2 px-4 text-left">Goal</th>
                                            <th className="py-2 px-4 text-right">Weight</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {zones.map((zone) => (
                                            <tr key={zone.percent}>
                                                <td className="py-2 px-4 font-bold text-slate-700">{zone.percent}%</td>
                                                <td className="py-2 px-4 text-xs text-slate-500">{zone.label}</td>
                                                <td className="py-2 px-4 text-right font-bold text-indigo-600">{Math.round(zone.weight)} <span className="text-[9px] text-slate-300">{weightUnit}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    <div className="pt-6 border-t border-slate-50 mt-2">
                        <button onClick={() => setShowExplanation(!showExplanation)} className="w-full text-center text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-500 transition-colors flex items-center justify-center gap-2">
                            <span>{showExplanation ? 'Hide Methodology' : 'How is this calculated?'}</span><span className={`transform transition-transform ${showExplanation ? 'rotate-180' : ''}`}>▼</span>
                        </button>
                        {showExplanation && (
                            <div className="mt-4 bg-slate-50 p-4 rounded-2xl text-xs text-slate-600 space-y-3 leading-relaxed animate-fade-in">
                                <p>We calculate your estimated 1-Rep Max by averaging two industry-standard formulas to ensure balance across different rep ranges:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li><strong className="text-slate-800">Epley Formula:</strong> <code>Weight × (1 + Reps/30)</code><br/>Generally more accurate for lower rep ranges.</li>
                                    <li><strong className="text-slate-800">Brzycki Formula:</strong> <code>Weight × (36 / (37 - Reps))</code><br/>Often better for higher rep ranges.</li>
                                </ul>
                                <p className="italic text-slate-400 pt-1">Note: These are estimates. Actual performance may vary based on fatigue, nutrition, and experience.</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <>
                    {progressionData && progressionData.hasEnoughData ? (
                        <div className="space-y-6 animate-fade-in">
                            {(progressionData.optimalDayIdx > -1) && (
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 items-center">
                                    <div className="bg-white p-2 rounded-full text-lg shadow-sm">🧠</div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-blue-500 tracking-wide">Training Insight</p>
                                        <p className="text-xs text-blue-800 font-bold mt-0.5">Peak Performance Window:<br/><span className="text-sm font-black text-blue-900">{progressionData.optimalDay} {progressionData.optimalTime}s</span></p>
                                    </div>
                                </div>
                            )}
                            {progressionData.isStale && (
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 items-start">
                                    <span className="text-xl">⚠️</span>
                                    <div>
                                        <p className="font-bold text-amber-800 text-sm">Prediction Adjusted</p>
                                        <p className="text-xs text-amber-700 mt-1 leading-relaxed">Your best record was achieved <strong>{Math.floor(progressionData.daysSinceBest)} days ago</strong>. We've dampened the growth rate to account for potential detraining or rebuilding phases.</p>
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex flex-col justify-between">
                                    <p className="text-[10px] font-black uppercase text-emerald-600 tracking-wide">Historical Growth</p>
                                    <div><p className="text-2xl font-black text-emerald-800">{progressionData.weeklyRate > 0 ? '+' : ''}{toDisplayWeight(progressionData.weeklyRate, unitSystem).toFixed(1)}<span className="text-sm ml-1 font-bold text-emerald-600/60">{weightUnit}/wk</span></p></div>
                                </div>
                                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex flex-col justify-between">
                                    <p className="text-[10px] font-black uppercase text-indigo-600 tracking-wide">Next PR: {milestoneTargetDisplay.toFixed(0)}{weightUnit} (+{milestoneGainDisplay.toFixed(1)}{weightUnit})</p>
                                    <div><p className="text-xl font-black text-indigo-800 truncate">{milestone.date}</p><p className="text-[10px] font-bold text-indigo-400">Estimated Date</p></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest ml-1">Projected 1RM Timeline</h3>
                                <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden text-sm">
                                    <div className="flex items-center justify-between p-4 border-b border-slate-50">
                                        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">4w</div><span className="font-bold text-slate-700">1 Month</span></div>
                                        <div className="text-right"><span className="text-lg font-black text-slate-800">{Math.round(future4Weeks)} <span className="text-xs text-slate-400">{weightUnit}</span></span><p className="text-[9px] font-bold text-emerald-500">+{Math.round(future4Weeks - baselineForDisplay)}{weightUnit}</p></div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 border-b border-slate-50">
                                        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">8w</div><span className="font-bold text-slate-700">2 Months</span></div>
                                        <div className="text-right"><span className="text-lg font-black text-slate-800">{Math.round(future8Weeks)} <span className="text-xs text-slate-400">{weightUnit}</span></span><p className="text-[9px] font-bold text-emerald-500">+{Math.round(future8Weeks - baselineForDisplay)}{weightUnit}</p></div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-slate-50/50">
                                        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white text-xs">12w</div><span className="font-bold text-slate-700">3 Months</span></div>
                                        <div className="text-right"><span className="text-xl font-black text-indigo-600">{Math.round(future12Weeks)} <span className="text-xs text-indigo-300">{weightUnit}</span></span><p className="text-[9px] font-bold text-emerald-500">+{Math.round(future12Weeks - baselineForDisplay)}{weightUnit}</p></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                            <span className="text-4xl mb-4">📉</span><h3 className="font-bold text-slate-800">Not Enough Data</h3><p className="text-sm text-slate-500 mt-2">We need more data to reliably calculate your growth rate.</p>
                            <div className="bg-slate-100 p-3 rounded-lg mt-4 text-xs text-slate-600 text-left w-full">
                               <p className="font-bold mb-1">Requirements:</p>
                               <ul className="list-disc pl-4 space-y-1"><li>At least 2 weighted logs for this exercise</li><li>Logs must span at least 7 days</li><li>Try logging a new set today!</li></ul>
                            </div>
                        </div>
                    )}
                    <div className="pt-6 border-t border-slate-50">
                        <button onClick={() => setShowExplanation(!showExplanation)} className="w-full text-center text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-500 transition-colors flex items-center justify-center gap-2">
                            <span>{showExplanation ? 'Hide Methodology' : 'How is this calculated?'}</span><span className={`transform transition-transform ${showExplanation ? 'rotate-180' : ''}`}>▼</span>
                        </button>
                        {showExplanation && (
                            <div className="mt-4 bg-slate-50 p-4 rounded-2xl text-xs text-slate-600 space-y-3 leading-relaxed animate-fade-in">
                                <p><strong className="text-slate-800">Dynamic Baseline:</strong> We estimate your current strength by projecting your historical progress from your last peak to today, accounting for periods of inactivity.</p>
                                <p><strong className="text-slate-800">Growth Rate:</strong> We analyze your history to calculate your average strength gain per week. If your best lift was achieved early in your history, we use your overall long-term trend instead.</p>
                                <p><strong className="text-slate-800">Decay Factor:</strong> If your Personal Record is older than 30 days, we reduce the predicted growth rate by 50% to account for potential detraining.</p>
                                <p><strong className="text-slate-800">Optimal Window:</strong> The "Next PR" date is adjusted to align with the day of the week you historically perform best on.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default PredictorDialog;
