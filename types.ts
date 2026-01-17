import React from 'react';

export type ExerciseType = 'pushups' | 'situps' | 'bicep_curls';

export interface WorkoutLog {
  id: string;
  date: string; // ISO string
  type: ExerciseType;
  reps: number;
  weight?: number; // Optional weight in kg/lbs
}

export interface ExerciseDefinition {
  id: ExerciseType;
  label: string;
  icon: React.ReactNode;
  color: string;
  targetMuscle: string;
  isWeighted: boolean;
}

export const EXERCISES: ExerciseDefinition[] = [
  { 
    id: 'pushups', 
    label: 'Pushups', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'pushups' }, '⚡'), 
    color: 'bg-green-700', 
    targetMuscle: 'Chest & Triceps',
    isWeighted: false
  },
  { 
    id: 'situps', 
    label: 'Situps', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'situps' }, '🎯'), 
    color: 'bg-purple-700', 
    targetMuscle: 'Core',
    isWeighted: false
  },
  { 
    id: 'bicep_curls', 
    label: 'Bicep Curls', 
    icon: React.createElement('span', { className: 'text-2xl', role: 'img', 'aria-label': 'bicep curls' }, '💪'), 
    color: 'bg-red-500', 
    targetMuscle: 'Arms',
    isWeighted: true
  },
];