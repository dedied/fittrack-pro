
import React from 'react';

export type ExerciseType = string;
export type UnitSystem = 'metric' | 'imperial';

// CONFIGURATION
export const FREE_TIER_LIMIT = 3;

export interface WorkoutLog {
  id: string;
  date: string; // ISO string
  type: ExerciseType;
  reps: number;
  weight?: number; // Optional weight in kg/lbs
  owner_id?: string; // Associated cloud user id (UUID)
}

export interface ExerciseDefinition {
  id: ExerciseType;
  label: string;
  icon: React.ReactNode;
  color: string; // Tailwind class for UI
  chartColor: string; // Hex code for Recharts
  targetMuscle: string;
  categories: string[]; // e.g., 'Gym', 'Weights', 'Cardio', 'Home', 'Calisthenics'
  isWeighted: boolean;
}

export const DEFAULT_EXERCISES = ['pushups', 'situps', 'bicep_curls'];

// Sorted Alphabetically by Label
export const EXERCISES: ExerciseDefinition[] = [
  { 
    id: 'bench_press', 
    label: 'Bench Press', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'bench press' }, '🛌'), 
    color: 'bg-teal-600',
    chartColor: '#0d9488',
    targetMuscle: 'Chest',
    categories: ['Gym', 'Weights'],
    isWeighted: true
  },
  { 
    id: 'bicep_curls', 
    label: 'Bicep Curls', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'bicep curls' }, '💪'), 
    color: 'bg-red-500',
    chartColor: '#ef4444',
    targetMuscle: 'Arms',
    categories: ['Gym', 'Home', 'Weights'],
    isWeighted: true
  },
  { 
    id: 'burpees', 
    label: 'Burpees', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'burpees' }, '🔥'), 
    color: 'bg-rose-600',
    chartColor: '#e11d48',
    targetMuscle: 'Full Body',
    categories: ['Calisthenics', 'Cardio', 'Home'],
    isWeighted: false
  },
  { 
    id: 'cable_fly', 
    label: 'Cable Fly', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'cable fly' }, '🦋'), 
    color: 'bg-pink-600',
    chartColor: '#db2777',
    targetMuscle: 'Chest',
    categories: ['Gym', 'Machines'],
    isWeighted: true
  },
  { 
    id: 'tricep_pushdown', 
    label: 'Cable Pushdown', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'pushdown' }, '👇'), 
    color: 'bg-pink-500',
    chartColor: '#ec4899',
    targetMuscle: 'Triceps',
    categories: ['Gym', 'Machines'],
    isWeighted: true
  },
  { 
    id: 'clean_jerk', 
    label: 'Clean & Jerk', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'clean and jerk' }, '🏋️‍♂️'), 
    color: 'bg-red-700',
    chartColor: '#b91c1c',
    targetMuscle: 'Full Body',
    categories: ['Gym', 'Weights'],
    isWeighted: true
  },
  { 
    id: 'cycling_km', 
    label: 'Cycling', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'cycling' }, '🚴'), 
    color: 'bg-lime-500',
    chartColor: '#84cc16',
    targetMuscle: 'Cardio',
    categories: ['Cardio', 'Gym', 'Home'],
    isWeighted: false
  },
  { 
    id: 'deadlift', 
    label: 'Deadlift', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'deadlift' }, '🏋️'), 
    color: 'bg-stone-600',
    chartColor: '#57534e',
    targetMuscle: 'Back & Legs',
    categories: ['Gym', 'Weights'],
    isWeighted: true
  },
  { 
    id: 'dumbbell_row', 
    label: 'Dumbbell Row', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'dumbbell row' }, '🚣'), 
    color: 'bg-amber-500',
    chartColor: '#f59e0b',
    targetMuscle: 'Back',
    categories: ['Gym', 'Home', 'Weights'],
    isWeighted: true
  },
  { 
    id: 'face_pull', 
    label: 'Face Pulls', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'face pull' }, '🤡'), 
    color: 'bg-orange-600',
    chartColor: '#ea580c',
    targetMuscle: 'Rear Delts',
    categories: ['Gym', 'Machines'],
    isWeighted: true
  },
  { 
    id: 'front_squat', 
    label: 'Front Squat', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'front squat' }, '🏋️‍♀️'), 
    color: 'bg-blue-500',
    chartColor: '#3b82f6',
    targetMuscle: 'Legs',
    categories: ['Gym', 'Weights'],
    isWeighted: true
  },
  { 
    id: 'hamstring_curl', 
    label: 'Hamstring Curl', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'hamstring curl' }, '🎣'), 
    color: 'bg-violet-600',
    chartColor: '#7c3aed',
    targetMuscle: 'Hamstrings',
    categories: ['Gym', 'Machines'],
    isWeighted: true
  },
  { 
    id: 'incline_bench', 
    label: 'Incline Bench', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'incline bench' }, '📐'), 
    color: 'bg-teal-400',
    chartColor: '#2dd4bf',
    targetMuscle: 'Chest',
    categories: ['Gym', 'Weights'],
    isWeighted: true
  },
  { 
    id: 'kettlebell_swing', 
    label: 'Kettlebell Swing', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'kettlebell' }, '🔔'), 
    color: 'bg-yellow-600',
    chartColor: '#ca8a04',
    targetMuscle: 'Full Body',
    categories: ['Gym', 'Home', 'Weights'],
    isWeighted: true
  },
  { 
    id: 'lat_pulldown', 
    label: 'Lat Pulldown', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'lat pulldown' }, '🔽'), 
    color: 'bg-cyan-600',
    chartColor: '#0891b2',
    targetMuscle: 'Back',
    categories: ['Gym', 'Machines'],
    isWeighted: true
  },
  { 
    id: 'lateral_raise', 
    label: 'Lateral Raise', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'lateral raise' }, '🦅'), 
    color: 'bg-orange-400',
    chartColor: '#fb923c',
    targetMuscle: 'Shoulders',
    categories: ['Gym', 'Home', 'Weights'],
    isWeighted: true
  },
  { 
    id: 'leg_extension', 
    label: 'Leg Extension', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'leg extension' }, '🦵'), 
    color: 'bg-violet-500',
    chartColor: '#8b5cf6',
    targetMuscle: 'Quads',
    categories: ['Gym', 'Machines'],
    isWeighted: true
  },
  { 
    id: 'leg_press', 
    label: 'Leg Press', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'leg press' }, '🚂'), 
    color: 'bg-indigo-700',
    chartColor: '#4338ca',
    targetMuscle: 'Legs',
    categories: ['Gym', 'Machines'],
    isWeighted: true
  },
  { 
    id: 'lunges', 
    label: 'Lunges', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'lunges' }, '🚶'), 
    color: 'bg-blue-400',
    chartColor: '#60a5fa',
    targetMuscle: 'Legs',
    categories: ['Gym', 'Home', 'Weights'],
    isWeighted: true
  },
  { 
    id: 'shoulder_press', 
    label: 'Overhead Press', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'shoulder press' }, '🙆'), 
    color: 'bg-orange-500',
    chartColor: '#f97316',
    targetMuscle: 'Shoulders',
    categories: ['Gym', 'Home', 'Weights'],
    isWeighted: true
  },
  { 
    id: 'plank', 
    label: 'Plank (Secs)', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'plank' }, '🪵'), 
    color: 'bg-indigo-400',
    chartColor: '#818cf8',
    targetMuscle: 'Core',
    categories: ['Calisthenics', 'Core', 'Home'],
    isWeighted: false
  },
  { 
    id: 'pullups', 
    label: 'Pullups', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'pullups' }, '🪜'), 
    color: 'bg-amber-600',
    chartColor: '#d97706',
    targetMuscle: 'Back',
    categories: ['Calisthenics', 'Gym', 'Home', 'Strength'],
    isWeighted: true
  },
  { 
    id: 'pushups', 
    label: 'Pushups', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'pushups' }, '⚡'), 
    color: 'bg-green-600',
    chartColor: '#16a34a',
    targetMuscle: 'Chest & Triceps',
    categories: ['Calisthenics', 'Home', 'Strength'],
    isWeighted: false
  },
  { 
    id: 'romanian_deadlift', 
    label: 'RDL', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'rdl' }, '📉'), 
    color: 'bg-stone-500',
    chartColor: '#78716c',
    targetMuscle: 'Hamstrings',
    categories: ['Gym', 'Weights'],
    isWeighted: true
  },
  { 
    id: 'rowing_m', 
    label: 'Rowing (m)', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'rowing' }, '🛶'), 
    color: 'bg-cyan-400',
    chartColor: '#22d3ee',
    targetMuscle: 'Cardio',
    categories: ['Cardio', 'Gym'],
    isWeighted: false
  },
  { 
    id: 'running_km', 
    label: 'Running', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'running' }, '🏃'), 
    color: 'bg-sky-500',
    chartColor: '#0ea5e9',
    targetMuscle: 'Cardio',
    categories: ['Cardio', 'Home'],
    isWeighted: false
  },
  { 
    id: 'cable_row', 
    label: 'Seated Cable Row', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'cable row' }, '🚣‍♀️'), 
    color: 'bg-cyan-500',
    chartColor: '#06b6d4',
    targetMuscle: 'Back',
    categories: ['Gym', 'Machines'],
    isWeighted: true
  },
  { 
    id: 'situps', 
    label: 'Situps', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'situps' }, '🎯'), 
    color: 'bg-purple-600',
    chartColor: '#9333ea',
    targetMuscle: 'Core',
    categories: ['Calisthenics', 'Core', 'Home'],
    isWeighted: false
  },
  { 
    id: 'skullcrushers', 
    label: 'Skullcrushers', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'skullcrushers' }, '💀'), 
    color: 'bg-rose-400',
    chartColor: '#fb7185',
    targetMuscle: 'Triceps',
    categories: ['Gym', 'Weights'],
    isWeighted: true
  },
  { 
    id: 'snatch', 
    label: 'Snatch', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'snatch' }, '🤸'), 
    color: 'bg-red-600',
    chartColor: '#dc2626',
    targetMuscle: 'Full Body',
    categories: ['Gym', 'Weights'],
    isWeighted: true
  },
  { 
    id: 'squats', 
    label: 'Squats', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'squats' }, '🦵'), 
    color: 'bg-blue-600',
    chartColor: '#2563eb',
    targetMuscle: 'Legs',
    categories: ['Gym', 'Home', 'Weights'],
    isWeighted: true
  },
  { 
    id: 'dips', 
    label: 'Tricep Dips', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'dips' }, '🚜'), 
    color: 'bg-slate-600',
    chartColor: '#475569',
    targetMuscle: 'Triceps',
    categories: ['Calisthenics', 'Gym', 'Home', 'Strength'],
    isWeighted: true
  },
];
