import { SJOERD_DATA } from "@/src/data/sjoerd-data";
import { NIKITA_DATA } from "@/src/data/nikita-data";
import { saveRoutinesToFirestore, loadRoutinesFromFirestore } from "@/src/lib/firebase";

export type User = "Sjoerd" | "Nikita";

export interface Routine {
  id: string;
  workout_name: string;
  isArchived: boolean;
  exercises: any[];
  trainingDates?: Record<string, string>;
}

export interface CompletedSetData {
  weight: number | "";
  reps: number | "";
  completed: boolean;
}

export interface CompletedExerciseData {
  exerciseUid: string;
  sets: CompletedSetData[];
  note?: string;
}

const routinesKey = (user: User) => `routines_${user}`;
const updatedAtKey = (user: User) => `routines_${user}_updatedAt`;
const backupKey = (user: User) => `routines_${user}_backups`;
const MAX_BACKUPS = 5;

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function makeId(name: string, index: number): string {
  return slug(name) + "-" + index;
}

export function newExerciseUid(): string {
  return `ex-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function activeExercises(routine: Routine): any[] {
  return (routine.exercises ?? []).filter((ex: any) => !ex.isDeleted);
}

function countHistoryEntries(routines: Routine[]): number {
  let n = 0;
  routines.forEach(r => r.exercises?.forEach((ex: any) => ex.sets?.forEach((s: any) => {
    n += s.history?.length ?? 0;
  })));
  return n;
}

function backupLocal(user: User, reason: string) {
  try {
    const current = localStorage.getItem(routinesKey(user));
    if (!current) return;
    const backups = JSON.parse(localStorage.getItem(backupKey(user)) || "[]");
    backups.unshift({ at: new Date().toISOString(), reason, data: current });
    localStorage.setItem(backupKey(user), JSON.stringify(backups.slice(0, MAX_BACKUPS)));
  } catch (err) {
    console.error("Backup failed", err);
  }
}

// Adds new default routines, fills missing default images and gives every exercise a stable uid.
function reconcile(user: User, routines: Routine[]): { routines: Routine[]; changed: boolean } {
  const defaultData = user === "Sjoerd" ? SJOERD_DATA : NIKITA_DATA;
  let changed = false;

  const imageDefaults: Record<string, Record<string, string>> = {};
  for (const workout of defaultData) {
    imageDefaults[workout.workout_name] = {};
    for (const ex of (workout as any).exercises ?? []) {
      if (ex.imageUrl) imageDefaults[workout.workout_name][ex.name] = ex.imageUrl;
    }
  }

  let result = routines.map(routine => {
    const defaults = imageDefaults[routine.workout_name] ?? {};
    let routineChanged = false;
    const exercises = (routine.exercises ?? []).map((ex: any, i: number) => {
      let next = ex;
      // imageUrl === null means the user removed it on purpose; only fill when the key is absent
      if (next.imageUrl === undefined && defaults[next.name]) {
        next = { ...next, imageUrl: defaults[next.name] };
      }
      if (!next.uid) {
        // Deterministic so local and cloud copies of legacy data get identical uids
        next = { ...next, uid: `ex-${i}-${slug(next.name ?? "")}` };
      }
      if (next !== ex) routineChanged = true;
      return next;
    });
    if (!routineChanged) return routine;
    changed = true;
    return { ...routine, exercises };
  });

  const existingNames = new Set(result.map(r => r.workout_name));
  const newRoutines = defaultData
    .filter(d => !existingNames.has(d.workout_name))
    .map((d, i) => ({
      ...d,
      id: makeId(d.workout_name, result.length + i),
      isArchived: false,
      exercises: ((d as any).exercises ?? []).map((ex: any, j: number) => ({
        ...ex,
        uid: `ex-${j}-${slug(ex.name ?? "")}`,
      })),
    })) as Routine[];
  if (newRoutines.length > 0) {
    result = [...result, ...newRoutines];
    changed = true;
  }

  return { routines: result, changed };
}

export function getRoutines(user: User): Routine[] {
  const stored = localStorage.getItem(routinesKey(user));
  const base: Routine[] = stored ? JSON.parse(stored) : [];
  const { routines, changed } = reconcile(user, base);
  // Written without bumping updatedAt, so this local housekeeping never outranks real cloud data
  if (changed || !stored) localStorage.setItem(routinesKey(user), JSON.stringify(routines));
  return routines;
}

export function saveRoutines(user: User, routines: Routine[]) {
  const updatedAt = Date.now();
  localStorage.setItem(routinesKey(user), JSON.stringify(routines));
  localStorage.setItem(updatedAtKey(user), updatedAt.toString());
  saveRoutinesToFirestore(user, routines, updatedAt).catch(console.error);
}

export async function syncRoutinesFromCloud(user: User): Promise<Routine[] | null> {
  try {
    const cloud = await loadRoutinesFromFirestore(user);
    const localTs = Number(localStorage.getItem(updatedAtKey(user)) || 0);
    const local = getRoutines(user);

    if (!cloud) {
      saveRoutines(user, local);
      return null;
    }

    let cloudWins: boolean;
    if (localTs === 0) {
      // No sync timestamp yet (first run after update): keep whichever copy holds more training history
      cloudWins = countHistoryEntries(cloud.data as Routine[]) >= countHistoryEntries(local);
    } else {
      cloudWins = cloud.updatedAt > localTs;
    }

    if (!cloudWins) {
      if (cloud.updatedAt !== localTs) {
        const ts = localTs || Date.now();
        localStorage.setItem(updatedAtKey(user), ts.toString());
        saveRoutinesToFirestore(user, local, ts).catch(console.error);
      }
      return null;
    }

    if (cloud.updatedAt === localTs) return null;

    backupLocal(user, "before cloud sync");
    const { routines } = reconcile(user, cloud.data as Routine[]);
    localStorage.setItem(routinesKey(user), JSON.stringify(routines));
    localStorage.setItem(updatedAtKey(user), cloud.updatedAt.toString());
    return routines;
  } catch {
    return null;
  }
}

export function getNextTrainingNumber(routine: Routine): number {
  let max = 0;
  routine.exercises?.forEach((ex: any) => ex.sets?.forEach((set: any) => set.history?.forEach((h: any) => {
    if (typeof h.training === "number" && h.training > max) max = h.training;
  })));
  return max + 1;
}

export function saveWorkoutSession(
  user: User,
  workoutId: string,
  completedExercises: CompletedExerciseData[],
  sessionDate: string = new Date().toISOString()
): boolean {
  try {
    const routines = getRoutines(user);
    const workoutIndex = routines.findIndex(r => r.id === workoutId);
    if (workoutIndex === -1) return false;

    const workout = routines[workoutIndex];
    const nextTraining = getNextTrainingNumber(workout);

    const updatedExercises = workout.exercises.map((ex: any) => {
      const completedEx = completedExercises.find(c => c.exerciseUid === ex.uid);
      if (!completedEx) return ex;

      const setsTarget = parseInt(ex.sets_target || "3") || 3;
      const existingSets: any[] = [...(ex.sets || [])];
      // Make sure there's a set entry for every target set, so added sets also get logged
      for (let n = 1; n <= setsTarget; n++) {
        if (!existingSets.some(s => parseInt(s.set_number) === n)) {
          existingSets.push({ set_number: n.toString() });
        }
      }

      const updatedSets = existingSets.map((set: any) => {
        const setNumber = parseInt(set.set_number);
        if (!(setNumber >= 1 && setNumber <= setsTarget)) return set;
        const completedSet = completedEx.sets[setNumber - 1];
        if (!completedSet?.completed || completedSet.weight === "" || completedSet.reps === "") return set;
        return {
          ...set,
          history: [
            ...(set.history || []),
            {
              training: nextTraining,
              weight: completedSet.weight.toString(),
              reps: completedSet.reps.toString(),
              date: sessionDate,
            },
          ],
        };
      });

      const updatedEx: any = { ...ex, sets: updatedSets };
      if (completedEx.note?.trim()) {
        updatedEx.sessionNotes = {
          ...(ex.sessionNotes || {}),
          [nextTraining]: completedEx.note.trim(),
        };
      }
      return updatedEx;
    });

    const updatedRoutines = [...routines];
    updatedRoutines[workoutIndex] = {
      ...workout,
      exercises: updatedExercises,
      trainingDates: { ...(workout.trainingDates || {}), [nextTraining]: sessionDate },
    };

    saveRoutines(user, updatedRoutines);
    return true;
  } catch (error) {
    console.error("Failed to save workout session", error);
    return false;
  }
}

// ── Drafts (in-progress workouts) ─────────────────────────────────────────────

export interface WorkoutDraft {
  startedAt: number;
  updatedAt: number;
  sets: Record<string, CompletedSetData[]>;
  notes: Record<string, string>;
  rest?: { endsAt: number; total: number } | null;
}

const draftKey = (user: User, workoutId: string) => `draft_${user}_${workoutId}`;

export function getDraft(user: User, workoutId: string): WorkoutDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(user, workoutId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraft(user: User, workoutId: string, draft: WorkoutDraft) {
  localStorage.setItem(draftKey(user, workoutId), JSON.stringify(draft));
}

export function clearDraft(user: User, workoutId: string) {
  localStorage.removeItem(draftKey(user, workoutId));
}

// ── History ───────────────────────────────────────────────────────────────────

export function parseWeight(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const match = raw.toString().replace(",", ".").trim().match(/^[\d.]+/);
  if (!match) return null;
  const value = parseFloat(match[0]);
  return isNaN(value) ? null : value;
}

export function parseReps(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const value = parseInt(raw.toString().trim());
  return isNaN(value) || value === 0 ? null : value;
}

export interface PastSession {
  training: number;
  date: string | null;
  exercises: { name: string; sets: { weight: number; reps: number }[]; note?: string }[];
}

export function getSessionHistory(routine: Routine): PastSession[] {
  const sessions = new Map<number, PastSession>();
  const get = (training: number) => {
    if (!sessions.has(training)) {
      sessions.set(training, { training, date: routine.trainingDates?.[training] ?? null, exercises: [] });
    }
    return sessions.get(training)!;
  };

  (routine.exercises ?? []).forEach((ex: any) => {
    const setsTarget = parseInt(ex.sets_target || "3") || 3;
    const perTraining = new Map<number, { setNumber: number; weight: number; reps: number }[]>();
    (ex.sets ?? []).forEach((set: any) => {
      const setNumber = parseInt(set.set_number);
      if (!(setNumber >= 1 && setNumber <= setsTarget)) return;
      set.history?.forEach((h: any) => {
        const weight = parseWeight(h.weight);
        const reps = parseReps(h.reps);
        if (weight === null || reps === null || typeof h.training !== "number") return;
        if (!perTraining.has(h.training)) perTraining.set(h.training, []);
        perTraining.get(h.training)!.push({ setNumber, weight, reps });
        const session = get(h.training);
        if (!session.date && h.date) session.date = h.date;
      });
    });
    perTraining.forEach((sets, training) => {
      get(training).exercises.push({
        name: ex.name,
        sets: sets.sort((a, b) => a.setNumber - b.setNumber).map(({ weight, reps }) => ({ weight, reps })),
        note: ex.sessionNotes?.[training],
      });
    });
  });

  return Array.from(sessions.values())
    .filter(s => s.exercises.length > 0)
    .sort((a, b) => b.training - a.training);
}

// ── Dates ─────────────────────────────────────────────────────────────────────

export function getLastTrainedDate(routine: Routine): Date | null {
  if (routine.trainingDates) {
    const entries = Object.entries(routine.trainingDates);
    if (entries.length > 0) {
      const latest = entries.sort(([a], [b]) => parseInt(b) - parseInt(a))[0];
      return new Date(latest[1]);
    }
  }
  let latestDate: Date | null = null;
  routine.exercises?.forEach((ex: any) => {
    ex.sets?.forEach((set: any) => {
      set.history?.forEach((h: any) => {
        if (h.date) {
          const d = new Date(h.date);
          if (!latestDate || d > latestDate) latestDate = d;
        }
      });
    });
  });
  return latestDate;
}

export function formatRelativeDate(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Vandaag";
  if (diffDays === 1) return "Gisteren";
  if (diffDays < 7) return `${diffDays} dagen geleden`;
  if (diffDays < 14) return "1 week geleden";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weken geleden`;
  return `${Math.floor(diffDays / 30)} maanden geleden`;
}
