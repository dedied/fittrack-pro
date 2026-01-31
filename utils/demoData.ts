
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
  
  // If a limit is provided (e.g., Free Tier), pick only that many random exercises
  if (limitToExercises && limitToExercises > 0 && limitToExercises < availableExercises.length) {
    availableExercises = availableExercises.sort(() => 0.5 - Math.random()).slice(0, limitToExercises);
  }

  // Iterate through every day for the last 2 years
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    // 40% chance to rest on any given day
    if (Math.random() > 0.6) {
      // Pick 1 to 3 exercises from the available pool for this day
      const numExercises = random(1, Math.min(3, availableExercises.length));
      const shuffled = [...availableExercises].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, numExercises);

      selected.forEach(ex => {
        let reps = 0;
        let weight: number | undefined = undefined;

        // Generate realistic stats based on exercise type
        if (['running_km', 'cycling_km'].includes(ex.id)) {
           // Cardio: Varied distances. 10% chance of a "long run/ride"
           if (Math.random() > 0.9) {
             reps = ex.id === 'cycling_km' ? randomFloat(40, 100) : randomFloat(15, 30);
           } else {
             reps = ex.id === 'cycling_km' ? randomFloat(10, 40) : randomFloat(3, 10);
           }
        } else if (ex.id === 'plank') {
           // Plank: 30s to 180s
           reps = random(30, 180);
        } else if (ex.id === 'rowing_m') {
           // Rowing: 500m to 5000m
           reps = random(500, 5000);
        } else if (ex.isWeighted) {
           // Weighted: Simulate different training styles
           const style = Math.random();
           if (style < 0.2) {
             // Strength Day: High Weight, Low Reps (1-5)
             reps = random(1, 5);
             weight = randomFloat(60, 120); 
           } else if (style < 0.7) {
             // Hypertrophy Day: Med Weight, Med Reps (6-12)
             reps = random(6, 12);
             weight = randomFloat(30, 80);
           } else {
             // Endurance Day: Low Weight, High Reps (13-25+)
             reps = random(13, 30);
             weight = randomFloat(10, 40);
           }
        } else {
           // Bodyweight (Pushups/Situps/Burpees):
           // 10% chance of a "max effort" day
           if (Math.random() > 0.9) {
              reps = random(50, 100);
           } else {
              reps = random(10, 50);
           }
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
