
import { ExerciseType } from '../types';

export type UnitSystem = 'metric' | 'imperial';

// CONSTANTS
const LBS_PER_KG = 2.20462;
const MILES_PER_KM = 0.621371;

// IDENTIFIERS
export const isDistanceExercise = (id: ExerciseType) => 
  ['running_km', 'cycling_km'].includes(id);

// CONVERSIONS (Display -> Storage is Imperial -> Metric)
export const toStorageWeight = (val: number): number => val / LBS_PER_KG;
export const toStorageDistance = (val: number): number => val / MILES_PER_KM;

// CONVERSIONS (Storage -> Display is Metric -> Imperial)
export const toDisplayWeight = (val: number, system: UnitSystem): number => {
  if (system === 'metric') return val;
  return Math.round(val * LBS_PER_KG * 10) / 10;
};

export const toDisplayDistance = (val: number, system: UnitSystem): number => {
  if (system === 'metric') return val;
  return Math.round(val * MILES_PER_KM * 100) / 100;
};

// LABELS
export const getWeightUnit = (system: UnitSystem) => system === 'metric' ? 'kg' : 'lbs';
export const getDistanceUnit = (system: UnitSystem) => system === 'metric' ? 'km' : 'mi';

export const getUnitLabel = (id: ExerciseType, system: UnitSystem): string => {
  if (isDistanceExercise(id)) return getDistanceUnit(system);
  if (id === 'rowing_m') return 'm'; // Rowing usually stays in meters
  return 'reps';
};
