import { Routine, activeExercises, getSessionHistory } from "@/src/lib/storage";
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
  routineName: string;
  sets: { weight: number; reps: number }[];
}

export const exerciseKey = (name: string) => name.trim().toLowerCase();

// All logged sessions per exercise name across every routine (archived ones too), newest first
export function buildHistoryByName(routines: Routine[]): Map<string, ExerciseLog[]> {
  const byName = new Map<string, ExerciseLog[]>();
  routines.forEach(routine => {
    getSessionHistory(routine).forEach(session => {
      session.exercises.forEach(ex => {
        const key = exerciseKey(ex.name);
        if (!byName.has(key)) byName.set(key, []);
        byName.get(key)!.push({
          training: session.training,
          date: session.date,
          routineName: routine.workout_name,
          sets: ex.sets,
        });
      });
    });
  });
  byName.forEach(list =>
    list.sort((a, b) => {
      if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (a.date) return -1;
      if (b.date) return 1;
      return b.training - a.training;
    })
  );
  return byName;
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

export function buildSessionExercises(routine: Routine, allRoutines: Routine[] = [routine]): {
  exercises: SessionExercise[];
  logs: Record<string, ExerciseLog[]>;
} {
  const exercises: SessionExercise[] = [];
  const logs: Record<string, ExerciseLog[]> = {};
  const history = buildHistoryByName(allRoutines);

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

    logs[uid] = history.get(exerciseKey(ex.name)) ?? [];
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
