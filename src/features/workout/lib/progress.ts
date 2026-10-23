import type { ExerciseLog } from "./exercises";

export type ProgressMetric = "weight" | "volume";

export interface ProgressPoint {
  log: ExerciseLog;
  topSet: { weight: number; reps: number };
  volume: number;
  value: number;
  isRecord: boolean;
}

export function topSetOf(sets: { weight: number; reps: number }[]) {
  return sets.reduce((best, s) => (s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps) ? s : best), sets[0]);
}

// Oldest first; a record is a session that beats every earlier one on the chosen metric
export function buildProgress(logsNewestFirst: ExerciseLog[], metric: ProgressMetric): ProgressPoint[] {
  let best = -Infinity;
  return [...logsNewestFirst].reverse().map((log, i) => {
    const topSet = topSetOf(log.sets);
    const volume = log.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    const value = metric === "weight" ? topSet.weight : volume;
    const isRecord = i > 0 && value > best;
    best = Math.max(best, value);
    return { log, topSet, volume, value, isRecord };
  });
}

export function niceTicks(min: number, max: number, count = 3): number[] {
  const nonNegative = min >= 0;
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.1);
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * magnitude).find(s => s >= raw) ?? 10 * magnitude;
  const floored = Math.floor(min / step) * step;
  const start = nonNegative ? Math.max(0, floored) : floored;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}
