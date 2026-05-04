import { SJOERD_DATA } from "@/src/data/sjoerd-data";
import { NIKITA_DATA } from "@/src/data/nikita-data";
import { saveRoutinesToFirestore, loadRoutinesFromFirestore } from "@/src/lib/firebase";

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
  exerciseIndex: number;
  sets: CompletedSetData[];
  note?: string;
}

export function getRoutines(user: "Sjoerd" | "Nikita"): Routine[] {
  const key = `routines_${user}`;
  const stored = localStorage.getItem(key);
  if (stored) return JSON.parse(stored);

  const defaultData = user === "Sjoerd" ? SJOERD_DATA : NIKITA_DATA;
  const initialized = defaultData.map((d, i) => ({
    ...d,
    id: d.workout_name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + i,
    isArchived: false,
  }));

  localStorage.setItem(key, JSON.stringify(initialized));
  return initialized;
}

export function saveRoutines(user: "Sjoerd" | "Nikita", routines: Routine[]) {
  localStorage.setItem(`routines_${user}`, JSON.stringify(routines));
  saveRoutinesToFirestore(user, routines).catch(console.error);
}

export async function syncRoutinesFromCloud(user: "Sjoerd" | "Nikita"): Promise<Routine[] | null> {
  try {
    const cloudData = await loadRoutinesFromFirestore(user);
    if (!cloudData) return null;
    const routines = cloudData as Routine[];
    localStorage.setItem(`routines_${user}`, JSON.stringify(routines));
    return routines;
  } catch {
    return null;
  }
}

export function saveWorkoutSession(
  user: "Sjoerd" | "Nikita",
  workoutId: string,
  completedExercises: CompletedExerciseData[],
  sessionDate: string = new Date().toISOString()
): boolean {
  try {
    const routines = getRoutines(user);
    const workoutIndex = routines.findIndex(r => r.id === workoutId);
    if (workoutIndex === -1) return false;

    const workout = routines[workoutIndex];

    let maxTraining = 0;
    workout.exercises.forEach((ex: any) => {
      ex.sets?.forEach((set: any) => {
        set.history?.forEach((h: any) => {
          if (typeof h.training === "number" && h.training > maxTraining) {
            maxTraining = h.training;
          }
        });
      });
    });
    const nextTraining = maxTraining + 1;

    const updatedExercises = workout.exercises.map((ex: any, exIdx: number) => {
      const completedEx = completedExercises.find(c => c.exerciseIndex === exIdx);
      if (!completedEx) return ex;

      const setsTarget = parseInt(ex.sets_target || "3") || 3;

      const updatedSets = (ex.sets || []).map((set: any, setIdx: number) => {
        if (setIdx >= setsTarget) return set;
        const completedSet = completedEx.sets[setIdx];
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

export function getLastTrainedDate(routine: Routine): Date | null {
  if (routine.trainingDates) {
    const entries = Object.entries(routine.trainingDates);
    if (entries.length > 0) {
      const latest = entries.sort(([a], [b]) => parseInt(b) - parseInt(a))[0];
      return new Date(latest[1]);
    }
  }
  // Fallback: scan history entries for date fields
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
