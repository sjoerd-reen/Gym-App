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

// Double progression: climb the rep range at a fixed weight, add weight once every set hits the top
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

  const allAtTop = logged.length >= targetSets && logged.every(s => s.reps >= range.max);
  if (allAtTop) {
    const sets = previous.map(s => ({ weight: s.weight + weightStep(s.weight), reps: range.min }));
    return {
      kind: "increase",
      sets,
      title: describeSets(sets),
      reason: `Vorige keer haalde je bij elke set ${range.max} reps. Tijd voor meer gewicht.`,
    };
  }

  if (logged.length < targetSets && logged.every(s => s.reps >= range.max)) {
    const sets = previous.map(s => ({ weight: s.weight, reps: range.max }));
    return {
      kind: "repeat",
      sets,
      title: describeSets(sets),
      reason: `Vorige keer deed je ${logged.length} van de ${targetSets} sets. Haal ze allemaal op ${range.max} reps, dan gaat het gewicht omhoog.`,
    };
  }

  if (logged.some(s => s.reps < range.min)) {
    const sets = previous.map(s => ({ weight: s.weight, reps: range.min }));
    return {
      kind: "repeat",
      sets,
      title: describeSets(sets),
      reason: `Zelfde gewicht. Haal eerst ${range.min} reps bij elke set.`,
    };
  }

  const sets = previous.map(s => ({ weight: s.weight, reps: Math.min(s.reps + 1, range.max) }));
  return {
    kind: "more-reps",
    sets,
    title: describeSets(sets),
    reason: `Zelfde gewicht, één rep meer. Bij ${range.max} reps per set gaat het gewicht omhoog.`,
  };
}
