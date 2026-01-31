
import { WorkoutLog, EXERCISES } from '../types';
import { generateId } from './dateUtils';

export const generateDemoData = (limitToExercises?: number): WorkoutLog[] => {
  const logs: WorkoutLog[] = [];
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - 2);

  // Helper to get random number between min and max
  const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  
  // Helper to get random float with 1 decimal
  const randomFloat = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 10) / 10;

  // Determine which exercises to use
  let availableExercises = [...EXERCISES];
  
  // If a limit is provided (e.g., Free Tier), pick specific exercises to ensure quality data
  if (limitToExercises && limitToExercises > 0 && limitToExercises < availableExercises.length) {
    // Separate weighted and non-weighted
    const weighted = availableExercises.filter(e => e.isWeighted);
    
    // GUARANTEE: Pick at least one weighted exercise so the predictor works immediately
    const selectedWeighted = weighted.length > 0 
      ? weighted[Math.floor(Math.random() * weighted.length)] 
      : null;
    
    // Fill the rest of the slots
    let pool = availableExercises.filter(e => e.id !== selectedWeighted?.id);
    // Shuffle pool
    pool = pool.sort(() => 0.5 - Math.random());
    // Slice needed amount
    const needed = limitToExercises - (selectedWeighted ? 1 : 0);
    const rest = pool.slice(0, needed);
    
    availableExercises = selectedWeighted ? [selectedWeighted, ...rest] : rest;
  }

  // Define a "Strength Curve" for weighted exercises to simulate progressive overload
  // This ensures the 1RM predictor sees positive growth
  const strengthCurve: Record<string, { start: number, end: number }> = {};
  
  availableExercises.forEach(ex => {
      if (ex.isWeighted) {
          // Random baseline strength (e.g. 40kg start)
          const start = random(30, 60);
          // End strength is start + 30-60% gain over 2 years
          const gain = 1 + (Math.random() * 0.3 + 0.3); 
          strengthCurve[ex.id] = { start, end: start * gain };
      }
  });

  // CRITICAL: Force logs at the Start and End boundaries for weighted exercises.
  // This guarantees the "At least 2 logs" and "Span > 7 days" requirements are met for the predictor.
  availableExercises.forEach(ex => {
      if (ex.isWeighted && strengthCurve[ex.id]) {
          const curve = strengthCurve[ex.id];
          
          // Force Start Log (2 years ago)
          logs.push({
              id: generateId(),
              date: startDate.toISOString(),
              type: ex.id,
              reps: 8,
              // Start weight, rounded to 2.5
              weight: Math.round(curve.start / 2.5) * 2.5
          });

          // Force End Log (Today)
          logs.push({
              id: generateId(),
              date: endDate.toISOString(),
              type: ex.id,
              reps: 5,
              // End weight, rounded to 2.5
              weight: Math.round(curve.end / 2.5) * 2.5
          });
      }
  });

  const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);

  // Iterate through every day for the last 2 years (using a clone to not mess up startDate reference)
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    // 60% chance to workout
    if (Math.random() > 0.4) {
      
      // Pick 1 to 3 exercises from the available pool for this day
      const numExercises = random(1, Math.min(3, availableExercises.length));
      // Shuffle to randomize order/selection
      const shuffled = [...availableExercises].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, numExercises);

      // Calculate progress factor (0.0 to 1.0) for this date
      const dayOffset = (d.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
      const progress = Math.max(0, Math.min(1, dayOffset / totalDays));

      selected.forEach(ex => {
        let reps = 0;
        let weight: number | undefined = undefined;

        if (['running_km', 'cycling_km'].includes(ex.id)) {
           // Cardio: Varied distances. 10% chance of a "long run/ride"
           if (Math.random() > 0.9) {
             reps = ex.id === 'cycling_km' ? randomFloat(40, 100) : randomFloat(15, 30);
           } else {
             reps = ex.id === 'cycling_km' ? randomFloat(10, 40) : randomFloat(3, 10);
           }
        } else if (ex.id === 'plank') {
           // Plank: 30s to 120s + progression
           reps = random(30, 120) + Math.floor(60 * progress);
        } else if (ex.id === 'rowing_m') {
           // Rowing: 500m to 5000m
           reps = random(500, 5000);
        } else if (ex.isWeighted) {
           // PROGRESSIVE OVERLOAD LOGIC
           const curve = strengthCurve[ex.id];
           if (curve) {
               const currentCapability = curve.start + ((curve.end - curve.start) * progress);
               // Add slight daily fluctuation (+/- 5%) to make it look organic
               const fluctuation = 1 + ((Math.random() * 0.1) - 0.05);
               const effective1RM = currentCapability * fluctuation;

               const style = Math.random();
               let intensity = 0;

               if (style < 0.25) {
                 // Strength (3-5 reps, ~85-90% 1RM)
                 reps = random(3, 5);
                 intensity = randomFloat(0.85, 0.90);
               } else if (style < 0.75) {
                 // Hypertrophy (8-12 reps, ~70-80% 1RM)
                 reps = random(8, 12);
                 intensity = randomFloat(0.70, 0.80);
               } else {
                 // Endurance (15+ reps, ~50-60% 1RM)
                 reps = random(15, 20);
                 intensity = randomFloat(0.50, 0.60);
               }
               
               // Calculate weight derived from intensity and effective 1RM
               let calculatedWeight = effective1RM * intensity;
               // Round to nearest 2.5kg for realism
               weight = Math.round(calculatedWeight / 2.5) * 2.5;
           } else {
               // Fallback if curve missing (shouldn't happen)
               reps = 10;
               weight = 20;
           }
        } else {
           // Bodyweight (Pushups/Situps/Burpees):
           // Add volume progression
           const baseVolume = 20;
           const growth = 30 * progress; // Add up to 30 reps over 2 years
           const dailyNoise = random(-5, 10);
           reps = Math.round(baseVolume + growth + dailyNoise);
           
           if (reps < 5) reps = 5;
        }

        // Add variance to time to not make them all exactly midnight
        const logDate = new Date(d);
        logDate.setHours(random(6, 20), random(0, 59));

        logs.push({
          id: generateId(),
          date: logDate.toISOString(),
          type: ex.id,
          reps: reps,
          weight: weight
        });
      });
    }
  }

  // Sort by date descending
  return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
