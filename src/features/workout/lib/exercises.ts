import { Routine, activeExercises, parseWeight, parseReps } from "@/src/lib/storage";
import { parseDecimal, parseInteger, parseRestSeconds } from "@/src/lib/format";

export interface SessionExercise {
  uid: string;
  name: string;
  targetSets: number;
  targetReps: string;
  tempo: string;
  rest: string;
  restSeconds: number;
  badge?: string;
  techniqueNote?: string;
  latestNote?: string;
  imageUrl?: string;
}

export interface ExerciseLog {
  training: number;
  date: string | null;
  sets: { weight: number; reps: number }[];
}

export interface SetEntry {
  weight: string;
  reps: string;
  completed: boolean;
}

export const emptySet = (): SetEntry => ({ weight: "", reps: "", completed: false });

export function isSetComplete(set: Pick<SetEntry, "weight" | "reps">): boolean {
  const reps = parseInteger(set.reps);
  return parseDecimal(set.weight) !== null && reps !== null && reps > 0;
}

export function buildSets(count: number, existing: SetEntry[] = []): SetEntry[] {
  return Array.from({ length: count }, (_, i) => existing[i] ?? emptySet());
}

export function buildSessionExercises(routine: Routine): {
  exercises: SessionExercise[];
  logs: Record<string, ExerciseLog[]>;
} {
  const exercises: SessionExercise[] = [];
  const logs: Record<string, ExerciseLog[]> = {};

  activeExercises(routine).forEach((ex: any) => {
    const uid: string = ex.uid;
    const targetSets = parseInt(ex.sets_target || "3") || 3;

    // Legacy data stored technique tips as text in a 5th "set"
    const notesRow = ex.sets?.find((s: any) => parseInt(s.set_number) === 5);
    const legacyTip = notesRow?.history
      ?.map((h: any) => h.weight?.toString())
      .filter((w?: string) => w && isNaN(parseFloat(w.replace(",", "."))))
      .join(" · ");
    const latestNote = ex.sessionNotes
      ? Object.entries(ex.sessionNotes as Record<string, string>)
          .sort(([a], [b]) => parseInt(b) - parseInt(a))[0]?.[1]
      : undefined;

    exercises.push({
      uid,
      name: ex.name,
      targetSets,
      targetReps: ex.reps_target || "-",
      tempo: ex.tempo || "-",
      rest: ex.rest || "-",
      restSeconds: parseRestSeconds(ex.rest),
      badge: ex.notes || undefined,
      techniqueNote: ex.techniqueNote || legacyTip || undefined,
      latestNote: latestNote || undefined,
      imageUrl: ex.imageUrl ?? undefined,
    });

    const byTraining = new Map<number, { setNumber: number; weight: number; reps: number }[]>();
    let dateFor: Record<number, string> = {};
    (ex.sets || []).forEach((set: any) => {
      const setNumber = parseInt(set.set_number);
      if (!(setNumber >= 1 && setNumber <= targetSets)) return;
      set.history?.forEach((h: any) => {
        const weight = parseWeight(h.weight);
        const reps = parseReps(h.reps);
        if (weight === null || reps === null || typeof h.training !== "number") return;
        if (!byTraining.has(h.training)) byTraining.set(h.training, []);
        byTraining.get(h.training)!.push({ setNumber, weight, reps });
        if (h.date && !dateFor[h.training]) dateFor = { ...dateFor, [h.training]: h.date };
      });
    });
    logs[uid] = Array.from(byTraining.entries())
      .map(([training, sets]) => ({
        training,
        date: routine.trainingDates?.[training] ?? dateFor[training] ?? null,
        sets: sets.sort((a, b) => a.setNumber - b.setNumber).map(({ weight, reps }) => ({ weight, reps })),
      }))
      .sort((a, b) => b.training - a.training);
  });

  return { exercises, logs };
}

export interface WorkoutSummary {
  durationMinutes: number;
  totalVolume: number;
  completedSets: number;
  prs: { name: string; weight: number; prev: number }[];
  volumeChangePct: number | null;
}

export function calculateSummary(
  exercises: SessionExercise[],
  sets: Record<string, SetEntry[]>,
  logs: Record<string, ExerciseLog[]>,
  startedAt: number
): WorkoutSummary {
  const durationMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
  let totalVolume = 0;
  let completedSets = 0;
  let prevVolume = 0;
  const prs: WorkoutSummary["prs"] = [];

  exercises.forEach(exercise => {
    const done = (sets[exercise.uid] ?? [])
      .slice(0, exercise.targetSets)
      .filter(isSetComplete)
      .map(s => ({ weight: parseDecimal(s.weight)!, reps: parseInteger(s.reps)! }));
    if (done.length === 0) return;
    completedSets += done.length;
    totalVolume += done.reduce((sum, s) => sum + s.weight * s.reps, 0);

    const history = logs[exercise.uid] ?? [];
    if (history[0]) prevVolume += history[0].sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    const currentMax = Math.max(...done.map(s => s.weight));
    const prevBest = Math.max(0, ...history.flatMap(log => log.sets.map(s => s.weight)));
    if (prevBest > 0 && currentMax > prevBest) prs.push({ name: exercise.name, weight: currentMax, prev: prevBest });
  });

  const volumeChangePct = prevVolume > 0 ? Math.round(((totalVolume - prevVolume) / prevVolume) * 100) : null;
  return { durationMinutes, totalVolume, completedSets, prs, volumeChangePct };
}
