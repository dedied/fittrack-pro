
import { WorkoutLog, ExerciseType } from '../types';

/**
 * 1-Rep Max Calculation Formulas
 * 
 * We use a composite average of two standard formulas for robustness:
 * 1. Epley Formula: w * (1 + r/30)
 * 2. Brzycki Formula: w * (36 / (37 - r))
 * 
 * These are generally most accurate for rep ranges between 1 and 10.
 */

export const calculateEpley = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  return weight * (1 + (reps / 30));
};

export const calculateBrzycki = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  if (reps >= 37) return weight; // Formula breaks down at high reps
  return weight * (36 / (37 - reps));
};

export const calculateEstimated1RM = (weight: number, reps: number): number => {
  if (!weight || !reps || reps <= 0) return 0;
  if (reps === 1) return weight;

  // Brzycki tends to be conservative, Epley tends to be optimistic.
  // We take the average.
  const epley = calculateEpley(weight, reps);
  const brzycki = calculateBrzycki(weight, reps);
  
  return (epley + brzycki) / 2;
};

export const getTrainingPercentages = (oneRepMax: number) => {
  return [
    { percent: 95, label: 'Power (1-3 reps)', weight: oneRepMax * 0.95 },
    { percent: 90, label: 'Strength (3-5 reps)', weight: oneRepMax * 0.90 },
    { percent: 85, label: 'Strength (5-6 reps)', weight: oneRepMax * 0.85 },
    { percent: 80, label: 'Hypertrophy (6-8 reps)', weight: oneRepMax * 0.80 },
    { percent: 75, label: 'Hypertrophy (8-10 reps)', weight: oneRepMax * 0.75 },
    { percent: 70, label: 'Endurance (10-12 reps)', weight: oneRepMax * 0.70 },
    { percent: 60, label: 'Endurance (15+ reps)', weight: oneRepMax * 0.60 },
    { percent: 50, label: 'Warmup / Recovery', weight: oneRepMax * 0.50 },
  ];
};

/**
 * PROJECTIONS
 */

export interface ProgressionAnalysis {
  historicalPeak1RM: number;
  projectedCurrent1RM: number;
  bestDate: Date;
  daysSinceBest: number;
  dailyRate: number; // kg per day gain/loss
  weeklyRate: number;
  isStale: boolean;
  hasEnoughData: boolean;
  optimalDay: string;
  optimalDayIdx: number; // 0-6
  optimalTime: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Calculate the rate of gain based on history
export const analyzeProgression = (
  logs: WorkoutLog[], 
  exerciseId: ExerciseType,
): ProgressionAnalysis => {
  const relevantLogs = logs
    .filter(l => l.type === exerciseId && l.weight && l.weight > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const now = new Date();
  const historicalPeak1RM = relevantLogs.length > 0 ? Math.max(...relevantLogs.map(l => calculateEstimated1RM(l.weight!, l.reps))) : 0;

  // 1. Basic Data Check
  if (relevantLogs.length < 2) {
    return { 
        historicalPeak1RM,
        projectedCurrent1RM: historicalPeak1RM,
        bestDate: now, 
        daysSinceBest: 0, 
        dailyRate: 0, 
        weeklyRate: 0, 
        isStale: false, 
        hasEnoughData: false,
        optimalDay: 'Any',
        optimalDayIdx: -1,
        optimalTime: 'Anytime'
    };
  }

  const firstLog = relevantLogs[0];
  const lastLog = relevantLogs[relevantLogs.length - 1];
  
  // Find actual best log for Staleness calculation
  let bestLog = relevantLogs[0];
  let maxEst = 0;
  
  // Analytics buckets
  const dayStats = new Array(7).fill(0).map(() => ({ total: 0, count: 0 }));
  const timeStats = { Morning: { total: 0, count: 0 }, Afternoon: { total: 0, count: 0 }, Evening: { total: 0, count: 0 } };

  relevantLogs.forEach(l => {
     if(l.weight) {
       const est = calculateEstimated1RM(l.weight, l.reps);
       if(est > maxEst) { maxEst = est; bestLog = l; }

       const d = new Date(l.date);
       const dayIdx = d.getDay();
       dayStats[dayIdx].total += est;
       dayStats[dayIdx].count++;

       const h = d.getHours();
       let tKey: keyof typeof timeStats = 'Evening';
       if (h >= 4 && h < 12) tKey = 'Morning';
       else if (h >= 12 && h < 18) tKey = 'Afternoon';
       
       timeStats[tKey].total += est;
       timeStats[tKey].count++;
     }
  });

  const firstEst = calculateEstimated1RM(firstLog.weight!, firstLog.reps);
  
  const firstDate = new Date(firstLog.date);
  const bestDate = new Date(bestLog.date);
  const lastDate = new Date(lastLog.date);
  
  const totalSpanDays = Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  const timeToBestDays = Math.floor((bestDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysSinceBest = Math.floor((now.getTime() - bestDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (totalSpanDays < 7) {
     return { 
         historicalPeak1RM,
         projectedCurrent1RM: historicalPeak1RM,
         bestDate, 
         daysSinceBest, 
         dailyRate: 0, 
         weeklyRate: 0, 
         isStale: false, 
         hasEnoughData: false,
         optimalDay: 'Any',
         optimalDayIdx: -1,
         optimalTime: 'Anytime'
    };
  }
  
  let dailyRate = 0;
  if (timeToBestDays > 14 && timeToBestDays > 0) {
      dailyRate = (maxEst - firstEst) / timeToBestDays;
  } else if (totalSpanDays > 0) {
      const lastEst = calculateEstimated1RM(lastLog.weight!, lastLog.reps);
      dailyRate = (lastEst - firstEst) / totalSpanDays;
  }

  if (dailyRate > 0.5) dailyRate = 0.5;
  if (dailyRate < -0.1) dailyRate = -0.1;

  const isStale = daysSinceBest > 30;
  
  // Calculate Projected Current 1RM (The new baseline for predictions)
  let projectedCurrent1RM = maxEst;
  if (dailyRate > 0 && !isStale) {
      // Only project gains forward if the user is NOT stale
      projectedCurrent1RM += dailyRate * daysSinceBest;
  } else if (dailyRate < 0) {
      // Always project decline forward from the peak
      projectedCurrent1RM += dailyRate * daysSinceBest;
  }
  // If stale with a positive rate, we assume maintenance at peak strength (projectedCurrent1RM remains maxEst).

  let bestDayIdx = -1;
  let maxDayAvg = 0;
  dayStats.forEach((s, i) => {
      if(s.count > 0) {
          const avg = s.total / s.count;
          if(avg > maxDayAvg) { maxDayAvg = avg; bestDayIdx = i; }
      }
  });

  let bestTime = 'Anytime';
  let maxTimeAvg = 0;
  (Object.keys(timeStats) as Array<keyof typeof timeStats>).forEach(k => {
      const s = timeStats[k];
      if (s.count > 0) {
          const avg = s.total / s.count;
          if (avg > maxTimeAvg) { maxTimeAvg = avg; bestTime = k; }
      }
  });
  
  return {
    historicalPeak1RM: maxEst,
    projectedCurrent1RM,
    bestDate,
    daysSinceBest,
    dailyRate,
    weeklyRate: dailyRate * 7,
    isStale,
    hasEnoughData: true,
    optimalDay: bestDayIdx > -1 ? DAYS[bestDayIdx] : 'Any Day',
    optimalDayIdx: bestDayIdx,
    optimalTime: bestTime
  };
};

export const predictFutureMax = (baseline1RM: number, weeks: number, analysis: ProgressionAnalysis): number => {
    if (!analysis.hasEnoughData) return baseline1RM;
    const rateMultiplier = analysis.isStale ? 0.5 : 1.0;
    const projectedGain = (analysis.dailyRate * 7 * weeks) * rateMultiplier;
    
    if (analysis.dailyRate > 0 && projectedGain < 0) return baseline1RM;

    return baseline1RM + projectedGain;
};

export const predictNextMilestone = (
    baseline1RM: number, 
    analysis: ProgressionAnalysis, 
    stepInStorageUnits: number = 2.5
): { date: string, target: number } => {
    
    // Find the next "nice number" milestone
    let nextMilestoneTarget = Math.ceil(baseline1RM / stepInStorageUnits) * stepInStorageUnits;
    if (nextMilestoneTarget <= baseline1RM) {
      nextMilestoneTarget += stepInStorageUnits;
    }
    
    if (!analysis.hasEnoughData || analysis.dailyRate <= 0.01) {
        return { date: "Unknown", target: nextMilestoneTarget };
    }

    const diff = nextMilestoneTarget - baseline1RM;
    const effectiveDailyRate = analysis.dailyRate * (analysis.isStale ? 0.5 : 1.0);
    const daysToTargetRaw = diff / effectiveDailyRate;
    
    if (daysToTargetRaw > 365) return { date: "> 1 Year", target: nextMilestoneTarget };
    
    let targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + Math.ceil(daysToTargetRaw));
    
    if (analysis.optimalDayIdx > -1) {
        const currentDay = targetDate.getDay();
        let daysToAdd = (analysis.optimalDayIdx - currentDay + 7) % 7;
        targetDate.setDate(targetDate.getDate() + daysToAdd);
    }
    
    return {
        date: targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        target: nextMilestoneTarget
    };
};
