import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRoutines } from "@/src/app/providers/RoutinesProvider";
import { useRequiredUser } from "@/src/app/providers/UserProvider";
import {
  CompletedExerciseData, CompletedSetData, Routine, clearDraft, getDraft, getNextTrainingNumber,
  saveDraft, saveWorkoutSession,
} from "@/src/lib/storage";
import { uploadImageToFirestore } from "@/src/lib/firebase";
import { compressImage } from "@/src/lib/utils";
import { parseDecimal, parseInteger } from "@/src/lib/format";
import {
  SetEntry, WorkoutSummary, buildSessionExercises, buildSets, calculateSummary, isSetComplete,
} from "../lib/exercises";
import { useRestTimer } from "./useRestTimer";

export interface ExerciseEdits {
  name: string;
  targetSets: number;
  targetReps: string;
  tempo: string;
  rest: string;
  techniqueNote: string;
}

function fromDraft(sets: Record<string, CompletedSetData[]> | undefined): Record<string, SetEntry[]> {
  const out: Record<string, SetEntry[]> = {};
  Object.entries(sets ?? {}).forEach(([uid, list]) => {
    out[uid] = list.map(s => {
      const weight = s.weight === undefined || s.weight === null ? "" : String(s.weight);
      const reps = s.reps === undefined || s.reps === null ? "" : String(s.reps);
      return { weight, reps, completed: isSetComplete({ weight, reps }) };
    });
  });
  return out;
}

function hasData(sets: Record<string, SetEntry[]>, notes: Record<string, string>): boolean {
  return (
    Object.values(sets).some(list => list.some(s => s.weight !== "" || s.reps !== "")) ||
    Object.values(notes).some(n => n.trim() !== "")
  );
}

export function useWorkoutSession(routineId: string) {
  const user = useRequiredUser();
  const { routines, updateRoutines, reload } = useRoutines();
  const routine = routines.find(r => r.id === routineId) ?? null;

  const [initialDraft] = useState(() => getDraft(user, routineId));
  const [sets, setSets] = useState<Record<string, SetEntry[]>>(() => fromDraft(initialDraft?.sets));
  const [notes, setNotes] = useState<Record<string, string>>(() => initialDraft?.notes ?? {});
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const startedAt = useRef(initialDraft?.startedAt ?? Date.now());
  const finished = useRef(false);
  const rest = useRestTimer(initialDraft?.rest ?? null);

  const { exercises, logs } = useMemo(
    () => (routine ? buildSessionExercises(routine) : { exercises: [], logs: {} }),
    [routine]
  );

  // Every change is written as a draft, so closing the app never loses a workout
  useEffect(() => {
    if (finished.current) return;
    if (!hasData(sets, notes)) {
      clearDraft(user, routineId);
      return;
    }
    saveDraft(user, routineId, {
      startedAt: startedAt.current,
      updatedAt: Date.now(),
      sets: Object.fromEntries(
        Object.entries(sets).map(([uid, list]) => [
          uid,
          list.map(({ weight, reps, completed }) => ({ weight, reps, completed })),
        ])
      ),
      notes,
      rest: rest.timer,
    });
  }, [sets, notes, rest.timer, user, routineId]);

  const getSets = useCallback(
    (uid: string, target: number) => buildSets(target, sets[uid]),
    [sets]
  );

  const updateSet = useCallback(
    (uid: string, target: number, index: number, field: "weight" | "reps", value: string) => {
      setSets(prev => {
        const list = buildSets(target, prev[uid]);
        const next = { ...list[index], [field]: value };
        next.completed = isSetComplete(next);
        list[index] = next;
        return { ...prev, [uid]: list };
      });
    },
    []
  );

  const prefillSet = useCallback(
    (uid: string, target: number, index: number) => {
      const last = logs[uid]?.[0]?.sets[index];
      if (!last) return;
      setSets(prev => {
        const list = buildSets(target, prev[uid]);
        if (list[index].weight !== "" || list[index].reps !== "") return prev;
        const weight = String(last.weight).replace(".", ",");
        list[index] = { weight, reps: String(last.reps), completed: true };
        return { ...prev, [uid]: list };
      });
    },
    [logs]
  );

  const setNote = useCallback((uid: string, note: string) => {
    setNotes(prev => ({ ...prev, [uid]: note }));
  }, []);

  const updateWorkout = useCallback(
    (fn: (routine: Routine) => Routine) => {
      updateRoutines(all => all.map(r => (r.id === routineId ? fn(r) : r)));
    },
    [updateRoutines, routineId]
  );

  const updateExercise = useCallback(
    (uid: string, fn: (ex: any) => any) => {
      updateWorkout(r => ({ ...r, exercises: r.exercises.map((ex: any) => (ex.uid === uid ? fn(ex) : ex)) }));
    },
    [updateWorkout]
  );

  const saveNote = useCallback(
    (uid: string, note: string) => {
      updateWorkout(r => {
        const key = getNextTrainingNumber(r);
        return {
          ...r,
          exercises: r.exercises.map((ex: any) =>
            ex.uid === uid ? { ...ex, sessionNotes: { ...(ex.sessionNotes || {}), [key]: note } } : ex
          ),
        };
      });
      setNotes(prev => ({ ...prev, [uid]: "" }));
    },
    [updateWorkout]
  );

  const editExercise = useCallback(
    (uid: string, edits: ExerciseEdits) => {
      updateExercise(uid, ex => ({
        ...ex,
        name: edits.name,
        sets_target: edits.targetSets.toString(),
        reps_target: edits.targetReps,
        tempo: edits.tempo,
        rest: edits.rest,
        techniqueNote: edits.techniqueNote,
      }));
    },
    [updateExercise]
  );

  const deleteExercise = useCallback(
    (uid: string) => {
      // Soft delete keeps the exercise's past sessions in the history
      updateExercise(uid, ex => ({ ...ex, isDeleted: true }));
      setSets(prev => {
        const { [uid]: _removed, ...restSets } = prev;
        return restSets;
      });
      setNotes(prev => {
        const { [uid]: _removed, ...restNotes } = prev;
        return restNotes;
      });
    },
    [updateExercise]
  );

  const deleteImage = useCallback(
    (uid: string) => updateExercise(uid, ex => ({ ...ex, imageUrl: null })),
    [updateExercise]
  );

  const uploadImage = useCallback(
    async (uid: string, file: File) => {
      const compressed = await compressImage(file);
      const url = await uploadImageToFirestore(compressed);
      updateExercise(uid, ex => ({ ...ex, imageUrl: url }));
    },
    [updateExercise]
  );

  const finish = useCallback((): boolean => {
    const stats = calculateSummary(exercises, sets, logs, startedAt.current);
    const completed: CompletedExerciseData[] = exercises.map(ex => ({
      exerciseUid: ex.uid,
      sets: buildSets(ex.targetSets, sets[ex.uid]).map(s => {
        const ok = isSetComplete(s);
        return {
          weight: ok ? parseDecimal(s.weight)! : "",
          reps: ok ? parseInteger(s.reps)! : "",
          completed: ok,
        };
      }),
      note: notes[ex.uid],
    }));
    if (!saveWorkoutSession(user, routineId, completed)) return false;
    finished.current = true;
    clearDraft(user, routineId);
    rest.stop();
    reload();
    setSummary(stats);
    return true;
  }, [exercises, sets, logs, notes, user, routineId, rest, reload]);

  const discard = useCallback(() => {
    finished.current = true;
    clearDraft(user, routineId);
    rest.stop();
  }, [user, routineId, rest]);

  const completedSets = exercises.reduce(
    (n, ex) => n + buildSets(ex.targetSets, sets[ex.uid]).filter(s => s.completed).length,
    0
  );
  const totalSets = exercises.reduce((n, ex) => n + ex.targetSets, 0);

  return {
    routine,
    exercises,
    logs,
    notes,
    summary,
    startedAt: startedAt.current,
    hasData: hasData(sets, notes),
    completedSets,
    totalSets,
    rest,
    getSets,
    updateSet,
    prefillSet,
    setNote,
    saveNote,
    editExercise,
    deleteExercise,
    deleteImage,
    uploadImage,
    finish,
    discard,
  };
}
