
export type ExerciseType = 'pushups' | 'situps' | 'bicep_curls';

export interface WorkoutLog {
  id: string;
  date: string; // ISO string
  type: ExerciseType;
  reps: number;
}

export interface ExerciseDefinition {
  id: ExerciseType;
  label: string;
  icon: string;
  color: string;
  targetMuscle: string;
}

export const EXERCISES: ExerciseDefinition[] = [
  { id: 'pushups', label: 'Pushups', icon: '💪', color: 'bg-blue-500', targetMuscle: 'Chest & Triceps' },
  { id: 'situps', label: 'Situps', icon: '🧘', color: 'bg-indigo-500', targetMuscle: 'Core' },
  { id: 'bicep_curls', label: 'Bicep Curls', icon: '🏋️‍♂️', color: 'bg-rose-500', targetMuscle: 'Arms' },
];
