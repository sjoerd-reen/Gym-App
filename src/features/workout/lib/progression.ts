import { formatKg } from "@/src/lib/format";
import type { ExerciseLog } from "./exercises";

export interface RepRange {
  min: number;
  max: number;
}

export type AdviceKind = "increase" | "more-reps" | "repeat";

export interface Advice {
  kind: AdviceKind;
  sets: { weight: number; reps: number }[];
  title: string;
  reason: string;
}

// Time-based ("30 sec") and open-ended ("Max") targets have no rep range to progress through
export function parseRepRange(target: string): RepRange | null {
  if (/sec|min|max/i.test(target)) return null;
  const nums = target.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length === 0) return null;
  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  return { min: Math.min(nums[0], nums[1]), max: Math.max(nums[0], nums[1]) };
}

export function weightStep(weight: number): number {
  return weight < 10 ? 1 : 2.5;
}

function describeSets(sets: { weight: number; reps: number }[]): string {
  const same = sets.every(s => s.weight === sets[0].weight && s.reps === sets[0].reps);
  if (same) return `${formatKg(sets[0].weight)} kg × ${sets[0].reps}`;
  const sameWeight = sets.every(s => s.weight === sets[0].weight);
  if (sameWeight) return `${formatKg(sets[0].weight)} kg × ${sets.map(s => s.reps).join("/")}`;
  return sets.map(s => `${formatKg(s.weight)}×${s.reps}`).join(" · ");
}

// Progressive overload: once every set reaches the bottom of the rep range, add weight
export function getAdvice(targetSets: number, targetReps: string, last?: ExerciseLog): Advice | null {
  if (!last || last.sets.length === 0) return null;
  const range = parseRepRange(targetReps);
  if (!range) return null;

  const previous = Array.from({ length: targetSets }, (_, i) => last.sets[i] ?? last.sets[last.sets.length - 1]);
  const logged = last.sets.slice(0, targetSets);

  if (previous.every(s => s.weight === 0)) {
    const sets = previous.map(s => ({ weight: 0, reps: s.reps + 1 }));
    const reps = sets.every(s => s.reps === sets[0].reps) ? String(sets[0].reps) : sets.map(s => s.reps).join("/");
    return { kind: "more-reps", sets, title: `${reps} reps`, reason: "Probeer per set één herhaling meer dan vorige keer." };
  }

  const allSetsDone = logged.length >= targetSets;
  const allReachedMin = logged.every(s => s.reps >= range.min);

  if (allSetsDone && allReachedMin) {
    // A 0 kg set is bodyweight or a warm-up; there is no weight to add to it
    const sets = previous.map(s => ({ weight: s.weight > 0 ? s.weight + weightStep(s.weight) : 0, reps: range.min }));
    return {
      kind: "increase",
      sets,
      title: describeSets(sets),
      reason: `Vorige keer haalde je bij elke set minstens ${range.min} reps. Tijd voor meer gewicht.`,
    };
  }

  const sets = previous.map(s => ({ weight: s.weight, reps: range.min }));
  return {
    kind: "repeat",
    sets,
    title: describeSets(sets),
    reason: allReachedMin
      ? `Vorige keer deed je ${logged.length} van de ${targetSets} sets. Haal bij alle sets ${range.min} reps, dan gaat het gewicht omhoog.`
      : `Zelfde gewicht. Haal bij elke set ${range.min} reps, dan gaat het gewicht omhoog.`,
  };
}
