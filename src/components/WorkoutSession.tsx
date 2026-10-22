import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, CheckCircle2, Timer, Trophy, Zap, BarChart3, TrendingUp, TrendingDown, X, History } from "lucide-react";
import { ExerciseCard, ExerciseData, EditableExerciseFields, HistoricalLog, SetLog } from "./ExerciseCard";
import { SessionHistory } from "./SessionHistory";
import {
  Routine, getRoutines, saveRoutines, syncRoutinesFromCloud, saveWorkoutSession, CompletedExerciseData, CompletedSetData,
  activeExercises, getNextTrainingNumber, getDraft, saveDraft, clearDraft, parseWeight, parseReps,
} from "@/src/lib/storage";
import { uploadImageToFirestore } from "@/src/lib/firebase";
import { compressImage, cn } from "@/src/lib/utils";

interface WorkoutSessionProps {
  workoutId: string;
  user: "Sjoerd" | "Nikita";
  onBack: () => void;
}

interface RestTimer {
  endsAt: number;
  total: number;
}

interface WorkoutSummary {
  durationMinutes: number;
  totalVolume: number;
  completedSets: number;
  prs: { name: string; weight: number; prev: number }[];
  volumeChangePct: number | null;
}

function calculateSummary(
  exercises: ExerciseData[],
  sessionSets: Record<string, SetLog[]>,
  history: Record<string, HistoricalLog[]>,
  startedAt: number
): WorkoutSummary {
  const durationMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
  let totalVolume = 0, completedSets = 0, currentVolume = 0, prevVolume = 0;
  const prs: { name: string; weight: number; prev: number }[] = [];

  exercises.forEach(exercise => {
    const sets = (sessionSets[exercise.id] || []).filter(
      s => s.completed && s.weight !== "" && s.reps !== ""
    );
    if (sets.length === 0) return;
    completedSets += sets.length;
    const vol = sets.reduce((sum, s) => sum + Number(s.weight) * Number(s.reps), 0);
    totalVolume += vol;
    currentVolume += vol;
    const prevSession = history[exercise.id]?.[0];
    if (prevSession) prevVolume += prevSession.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    const currentMax = Math.max(...sets.map(s => Number(s.weight)));
    const allPrevWeights = (history[exercise.id] || []).flatMap(log => log.sets.map(s => s.weight));
    const prevBest = allPrevWeights.length > 0 ? Math.max(...allPrevWeights) : 0;
    if (currentMax > prevBest && prevBest > 0) prs.push({ name: exercise.name, weight: currentMax, prev: prevBest });
  });

  const volumeChangePct = prevVolume > 0 ? Math.round(((currentVolume - prevVolume) / prevVolume) * 100) : null;
  return { durationMinutes, totalVolume, completedSets, prs, volumeChangePct };
}

function hasDraftData(sets: Record<string, SetLog[]>, notes: Record<string, string>): boolean {
  return Object.values(sets).some(list => list.some(s => s.weight !== "" || s.reps !== ""))
    || Object.values(notes).some(n => n.trim() !== "");
}

export function WorkoutSession({ workoutId, user, onBack }: WorkoutSessionProps) {
  const [initialDraft] = useState(() => getDraft(user, workoutId));
  const [phase, setPhase] = useState<"active" | "summary">("active");
  const [routines, setRoutines] = useState(() => getRoutines(user));
  const routinesRef = useRef(routines);
  routinesRef.current = routines;
  const [restTimer, setRestTimer] = useState<RestTimer | null>(() =>
    initialDraft?.rest && initialDraft.rest.endsAt > Date.now() ? initialDraft.rest : null
  );
  const [now, setNow] = useState(() => Date.now());
  const [sessionSets, setSessionSets] = useState<Record<string, SetLog[]>>(() => {
    const out: Record<string, SetLog[]> = {};
    Object.entries(initialDraft?.sets ?? {}).forEach(([uid, sets]: [string, CompletedSetData[]]) => {
      out[uid] = sets.map((s, i) => ({ setNumber: i + 1, ...s }));
    });
    return out;
  });
  const [sessionNotes, setSessionNotes] = useState<Record<string, string>>(() => initialDraft?.notes ?? {});
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const startedAt = useRef(initialDraft?.startedAt ?? Date.now());
  const finished = useRef(false);

  useEffect(() => {
    syncRoutinesFromCloud(user).then(cloud => { if (cloud) setRoutines(cloud); });
  }, [user]);

  // Persist in-progress values so closing the app never loses a workout
  useEffect(() => {
    if (finished.current) return;
    if (!hasDraftData(sessionSets, sessionNotes)) {
      clearDraft(user, workoutId);
      return;
    }
    saveDraft(user, workoutId, {
      startedAt: startedAt.current,
      updatedAt: Date.now(),
      sets: Object.fromEntries(Object.entries(sessionSets).map(([uid, sets]: [string, SetLog[]]) => [
        uid, sets.map(({ weight, reps, completed }) => ({ weight, reps, completed })),
      ])),
      notes: sessionNotes,
      rest: restTimer,
    });
  }, [sessionSets, sessionNotes, restTimer, user, workoutId]);

  // Timer is based on a fixed end time, so it keeps counting while the app is in the background
  useEffect(() => {
    if (!restTimer) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [restTimer]);

  const secondsLeft = restTimer ? Math.max(0, Math.ceil((restTimer.endsAt - now) / 1000)) : 0;
  const timerDone = restTimer !== null && secondsLeft === 0;

  useEffect(() => {
    if (!restTimer || !timerDone) return;
    if (now - restTimer.endsAt > 3000) {
      setRestTimer(null);
      return;
    }
    navigator.vibrate?.([150, 100, 150]);
    const t = setTimeout(() => setRestTimer(null), 1800);
    return () => clearTimeout(t);
  }, [timerDone]); // eslint-disable-line react-hooks/exhaustive-deps

  const startRest = (seconds: number) => {
    setNow(Date.now());
    setRestTimer({ endsAt: Date.now() + seconds * 1000, total: seconds });
  };

  const workoutData = useMemo(() => routines.find(w => w.id === workoutId), [workoutId, routines]);

  const { exercises, history } = useMemo(() => {
    if (!workoutData) return { exercises: [] as ExerciseData[], history: {} as Record<string, HistoricalLog[]> };
    const parsedExercises: ExerciseData[] = [];
    const parsedHistory: Record<string, HistoricalLog[]> = {};

    activeExercises(workoutData).forEach((ex: any) => {
      const exId: string = ex.uid;
      const setsTarget = parseInt(ex.sets_target || "3") || 3;
      const notesRow = ex.sets?.find((s: any) => parseInt(s.set_number) === 5);
      const techniqueNote =
        (ex.techniqueNote as string | undefined) ||
        (notesRow?.history?.map((h: any) => h.weight?.toString())
          .filter((w?: string) => w && isNaN(parseFloat(w.replace(",", "."))))
          .join(" · ") || undefined);
      const lastSessionNote = ex.sessionNotes
        ? (Object.entries(ex.sessionNotes as Record<string, string>)
            .sort(([a], [b]) => parseInt(b) - parseInt(a))[0]?.[1] ?? undefined)
        : undefined;

      parsedExercises.push({
        id: exId, name: ex.name, targetSets: setsTarget,
        targetReps: ex.reps_target || "-", tempo: ex.tempo || "-", rest: ex.rest || "-",
        notes: ex.notes || undefined, techniqueNote, lastSessionNote, imageUrl: ex.imageUrl ?? undefined,
      });

      const realSets = (ex.sets || []).filter(
        (s: any) => parseInt(s.set_number) >= 1 && parseInt(s.set_number) <= setsTarget
      );
      const trainingSessions = new Map<number, { weight: number; reps: number }[]>();
      realSets.forEach((set: any) => {
        set.history?.forEach((h: any) => {
          const weight = parseWeight(h.weight);
          const reps = parseReps(h.reps);
          if (weight === null || reps === null) return;
          if (!trainingSessions.has(h.training)) trainingSessions.set(h.training, []);
          trainingSessions.get(h.training)!.push({ weight, reps });
        });
      });
      parsedHistory[exId] = Array.from(trainingSessions.entries())
        .map(([id, sets]) => ({ date: `Training ${id}`, sets }))
        .sort((a, b) => parseInt(b.date.split(" ")[1]) - parseInt(a.date.split(" ")[1]));
    });

    return { exercises: parsedExercises, history: parsedHistory };
  }, [workoutData]);

  const updateWorkout = (fn: (routine: Routine) => Routine) => {
    const updated = routinesRef.current.map(r => (r.id === workoutId ? fn(r) : r));
    routinesRef.current = updated;
    setRoutines(updated);
    saveRoutines(user, updated);
  };

  const updateExercise = (uid: string, fn: (ex: any) => any) => {
    updateWorkout(r => ({ ...r, exercises: r.exercises.map((ex: any) => (ex.uid === uid ? fn(ex) : ex)) }));
  };

  const handleUploadImage = async (uid: string, file: File) => {
    try {
      const compressed = await compressImage(file);
      const url = await uploadImageToFirestore(compressed);
      updateExercise(uid, ex => ({ ...ex, imageUrl: url }));
    } catch (err) { console.error("Failed to upload image", err); }
  };

  const handleDeleteImage = (uid: string) => {
    updateExercise(uid, ex => ({ ...ex, imageUrl: null }));
  };

  const handleDeleteExercise = (uid: string) => {
    // Soft delete: keeps the exercise's history visible in the training history
    updateExercise(uid, ex => ({ ...ex, isDeleted: true }));
    setSessionSets(prev => {
      const { [uid]: _removed, ...rest } = prev;
      return rest;
    });
    setSessionNotes(prev => {
      const { [uid]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleSaveNote = (uid: string, note: string) => {
    updateWorkout(r => {
      const noteKey = getNextTrainingNumber(r);
      return {
        ...r,
        exercises: r.exercises.map((ex: any) => ex.uid === uid
          ? { ...ex, sessionNotes: { ...(ex.sessionNotes || {}), [noteKey]: note } }
          : ex),
      };
    });
  };

  const handleEditExercise = (uid: string, updates: EditableExerciseFields) => {
    updateExercise(uid, ex => ({
      ...ex,
      name: updates.name,
      sets_target: updates.targetSets.toString(),
      reps_target: updates.targetReps,
      tempo: updates.tempo,
      rest: updates.rest,
      techniqueNote: updates.techniqueNote ?? "",
    }));
  };

  const handleFinishWorkout = () => {
    const stats = calculateSummary(exercises, sessionSets, history, startedAt.current);
    const completedExercises: CompletedExerciseData[] = exercises.map(exercise => ({
      exerciseUid: exercise.id,
      sets: (sessionSets[exercise.id] ?? []).map(s => ({ weight: s.weight, reps: s.reps, completed: s.completed })),
      note: sessionNotes[exercise.id],
    }));
    const saved = saveWorkoutSession(user, workoutId, completedExercises);
    if (!saved) {
      alert("Opslaan is mislukt. Je ingevulde waarden blijven bewaard als concept.");
      return;
    }
    finished.current = true;
    clearDraft(user, workoutId);
    setRestTimer(null);
    setSummary(stats);
    setPhase("summary");
  };

  const handleDiscard = () => {
    finished.current = true;
    clearDraft(user, workoutId);
    onBack();
  };

  if (phase === "summary" && summary) {
    return <SummaryScreen summary={summary} workoutName={workoutData?.workout_name ?? ""} onDone={onBack} />;
  }

  if (!workoutData) {
    return (
      <div className="min-h-screen bg-[#08080f] flex items-center justify-center">
        <p className="text-white/40">Workout niet gevonden.</p>
        <button onClick={onBack} className="ml-4 text-[#c2ff5d]">Terug</button>
      </div>
    );
  }

  const completedSetCount = exercises.reduce(
    (total, ex) => total + (sessionSets[ex.id] ?? []).filter(s => s.completed).length, 0
  );
  const totalSetCount = exercises.reduce((total, ex) => total + ex.targetSets, 0);
  const progress = totalSetCount > 0 ? completedSetCount / totalSetCount : 0;

  return (
    <div className="min-h-screen bg-[#08080f] font-sans pb-32">
      {/* Sticky header */}
      <header className="bg-[#08080f]/90 backdrop-blur-md px-5 py-4 sticky top-0 z-20 border-b border-white/[0.05]">
        <div className="flex items-center gap-3 mb-3 max-w-2xl mx-auto">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/[0.06] flex items-center justify-center text-white/50 hover:text-white/80 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white tracking-tight truncate capitalize">
              {workoutData.workout_name}
            </h1>
            <p className="text-xs text-white/30 font-medium">{completedSetCount} / {totalSetCount} sets</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowHistory(true)}
            className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/[0.06] flex items-center justify-center text-white/50 hover:text-white/80 transition-colors shrink-0"
            title="Trainingshistorie"
          >
            <History className="w-4 h-4" />
          </motion.button>
          <div className={cn(
            "text-xs font-bold px-3 py-1.5 rounded-full transition-colors",
            progress >= 1 ? "bg-[#c2ff5d] text-[#08080f]" : "bg-white/[0.06] text-white/30"
          )}>
            {Math.round(progress * 100)}%
          </div>
        </div>
        {/* Progress bar */}
        <div className="max-w-2xl mx-auto">
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#c2ff5d] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 space-y-5 max-w-2xl mx-auto">
        {exercises.map(exercise => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            historicalLogs={history[exercise.id] || []}
            initialSets={sessionSets[exercise.id]}
            initialNote={sessionNotes[exercise.id]}
            onUploadImage={file => handleUploadImage(exercise.id, file)}
            onDeleteImage={() => handleDeleteImage(exercise.id)}
            onEditExercise={updates => handleEditExercise(exercise.id, updates)}
            onDeleteExercise={() => handleDeleteExercise(exercise.id)}
            onSetsChange={sets => setSessionSets(prev => ({ ...prev, [exercise.id]: sets }))}
            onStartRest={startRest}
            onNoteChange={note => setSessionNotes(prev => ({ ...prev, [exercise.id]: note }))}
            onSaveNote={note => handleSaveNote(exercise.id, note)}
          />
        ))}
      </main>

      <AnimatePresence>
        {showHistory && <SessionHistory routine={workoutData} onClose={() => setShowHistory(false)} />}
      </AnimatePresence>

      {/* Full-screen rest timer */}
      <AnimatePresence>
        {restTimer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#08080f]/95 backdrop-blur-md"
          >
            {/* Label */}
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white/30 text-xs font-bold uppercase tracking-[0.25em] mb-10"
            >
              {timerDone ? "Klaar!" : "Rust"}
            </motion.p>

            {/* Big countdown ring */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 20 }}
              className="relative"
              style={{ width: 220, height: 220 }}
            >
              <svg
                className="-rotate-90"
                width="220" height="220"
                viewBox="0 0 220 220"
              >
                <circle
                  cx="110" cy="110" r="96"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="5"
                />
                <motion.circle
                  cx="110" cy="110" r="96"
                  fill="none"
                  stroke="#c2ff5d"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 96}`}
                  strokeDashoffset={`${2 * Math.PI * 96 * (1 - secondsLeft / restTimer.total)}`}
                  style={{
                    filter: timerDone ? "drop-shadow(0 0 12px #c2ff5d)" : "drop-shadow(0 0 6px rgba(194,255,93,0.5))",
                    transition: "stroke-dashoffset 0.9s linear",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {timerDone ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <CheckCircle2 className="w-14 h-14 text-[#c2ff5d]" />
                  </motion.div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={secondsLeft}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.2 }}
                      transition={{ duration: 0.2 }}
                      className="text-6xl font-black text-white tabular-nums"
                    >
                      {secondsLeft}
                    </motion.span>
                  </AnimatePresence>
                )}
              </div>
            </motion.div>

            {/* Skip button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => setRestTimer(null)}
              className="mt-10 flex items-center gap-2 px-6 py-3 bg-white/[0.07] border border-white/[0.08] text-white/40 rounded-full text-sm font-semibold hover:bg-white/10 hover:text-white/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Overslaan
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finish button */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-10 bg-gradient-to-t from-[#08080f] via-[#08080f]/95 to-transparent pointer-events-none z-10">
        <div className="max-w-2xl mx-auto pointer-events-auto flex justify-center">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setConfirmDiscard(false); setShowFinishConfirm(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-white/[0.07] border border-white/[0.08] text-white/50 rounded-full text-sm font-semibold hover:bg-white/10 hover:text-white/70 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Workout afronden
          </motion.button>
        </div>
      </div>

      {/* Finish confirmation modal */}
      <AnimatePresence>
        {showFinishConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
            onClick={() => setShowFinishConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="bg-[#13131e] border border-white/[0.08] rounded-3xl p-6 w-full max-w-sm shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-[#c2ff5d]/10 border border-[#c2ff5d]/20 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-5 h-5 text-[#c2ff5d]" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Workout afronden?</h3>
              <p className="text-sm text-white/40 leading-relaxed mb-6">
                {completedSetCount < totalSetCount
                  ? `Je hebt nog ${totalSetCount - completedSetCount} sets niet ingevuld. Wil je toch afronden?`
                  : "Goed werk! Wil je de workout opslaan?"}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFinishConfirm(false)}
                  className="flex-1 h-11 rounded-2xl bg-white/[0.06] border border-white/[0.06] text-white/60 text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={() => { setShowFinishConfirm(false); handleFinishWorkout(); }}
                  className="flex-1 h-11 rounded-2xl bg-[#c2ff5d] text-[#08080f] text-sm font-black hover:bg-[#d4ff72] transition-colors shadow-lg shadow-[#c2ff5d]/20"
                >
                  Afronden
                </button>
              </div>
              {hasDraftData(sessionSets, sessionNotes) && (
                <button
                  onClick={() => (confirmDiscard ? handleDiscard() : setConfirmDiscard(true))}
                  className="w-full mt-4 text-xs font-semibold text-rose-400/70 hover:text-rose-400 transition-colors"
                >
                  {confirmDiscard ? "Zeker weten? Tik nogmaals om te verwerpen" : "Training verwerpen zonder opslaan"}
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Summary Screen ────────────────────────────────────────────────────────────

interface SummaryScreenProps {
  summary: WorkoutSummary;
  workoutName: string;
  onDone: () => void;
}

function SummaryScreen({ summary, workoutName, onDone }: SummaryScreenProps) {
  return (
    <div className="min-h-screen bg-[#08080f] text-white flex flex-col font-sans overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-[#c2ff5d]/[0.06] blur-[120px] pointer-events-none" />

      <div className="relative flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-6 pt-20 pb-8">

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 20 }}
            className="text-center mb-10"
          >
            <div className="relative inline-flex items-center justify-center mb-6">
              <div className="w-24 h-24 rounded-full bg-[#c2ff5d]/10 border border-[#c2ff5d]/20 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-[#c2ff5d]" />
              </div>
              <div className="absolute inset-0 rounded-full bg-[#c2ff5d]/10 blur-xl" />
            </div>
            <h1 className="text-4xl font-black tracking-tight">Goed gedaan!</h1>
            <p className="text-white/30 mt-2 capitalize font-medium">{workoutName}</p>
          </motion.div>

          {/* Stats grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 mb-4"
          >
            <SummaryStatCard
              icon={<Timer className="w-4 h-4" />}
              label="Duur"
              value={`${summary.durationMinutes}m`}
            />
            <SummaryStatCard
              icon={<BarChart3 className="w-4 h-4" />}
              label="Volume"
              value={summary.totalVolume >= 1000
                ? `${(summary.totalVolume / 1000).toFixed(1)}t`
                : `${summary.totalVolume}kg`}
            />
            <SummaryStatCard
              icon={<Zap className="w-4 h-4" />}
              label="Sets"
              value={`${summary.completedSets}`}
            />
          </motion.div>

          {/* Volume change */}
          {summary.volumeChangePct !== null && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={cn(
                "border rounded-2xl p-4 mb-4 flex items-center gap-4",
                summary.volumeChangePct >= 0
                  ? "bg-[#c2ff5d]/[0.06] border-[#c2ff5d]/15"
                  : "bg-rose-500/[0.06] border-rose-500/15"
              )}
            >
              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                summary.volumeChangePct >= 0
                  ? "bg-[#c2ff5d]/15 text-[#c2ff5d]"
                  : "bg-rose-500/15 text-rose-400"
              )}>
                {summary.volumeChangePct >= 0
                  ? <TrendingUp className="w-5 h-5" />
                  : <TrendingDown className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-0.5">Volume vs vorige sessie</p>
                <p className={cn(
                  "text-2xl font-black",
                  summary.volumeChangePct >= 0 ? "text-[#c2ff5d]" : "text-rose-400"
                )}>
                  {summary.volumeChangePct >= 0 ? "+" : ""}{summary.volumeChangePct}%
                </p>
              </div>
            </motion.div>
          )}

          {/* PRs */}
          {summary.prs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-amber-400/[0.06] border border-amber-400/15 rounded-2xl p-4 mb-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="text-amber-400 font-bold text-sm uppercase tracking-wide">
                  {summary.prs.length === 1 ? "Persoonlijk Record" : `${summary.prs.length}× PR`}
                </h3>
              </div>
              <div className="space-y-2.5">
                {summary.prs.map((pr, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-white/60 text-sm truncate mr-3">{pr.name}</span>
                    <div className="flex items-baseline gap-2 shrink-0">
                      <span className="text-amber-400 font-black text-base">{pr.weight}kg</span>
                      <span className="text-amber-600/70 text-xs font-semibold">+{(pr.weight - pr.prev).toFixed(1)}kg</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative px-6 pb-10 pt-4"
      >
        <button
          onClick={onDone}
          className="w-full max-w-md mx-auto block bg-[#c2ff5d] text-[#08080f] font-black text-base py-5 rounded-2xl shadow-xl shadow-[#c2ff5d]/15 active:scale-98 transition-transform"
        >
          Terug naar Dashboard
        </button>
      </motion.div>
    </div>
  );
}

function SummaryStatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-4 text-center">
      <div className="flex justify-center text-white/20 mb-2">{icon}</div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-white/25 text-xs mt-0.5 font-medium">{label}</p>
    </div>
  );
}
