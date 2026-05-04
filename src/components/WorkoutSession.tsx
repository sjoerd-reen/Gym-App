import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, CheckCircle2, Timer, Trophy, Zap, BarChart3, TrendingUp, TrendingDown, X } from "lucide-react";
import { ExerciseCard, ExerciseData, HistoricalLog, SetLog } from "./ExerciseCard";
import { getRoutines, saveRoutines, syncRoutinesFromCloud, saveWorkoutSession, CompletedExerciseData } from "@/src/lib/storage";
import { uploadImageToFirestore } from "@/src/lib/firebase";
import { compressImage, cn } from "@/src/lib/utils";

interface WorkoutSessionProps {
  workoutId: string;
  user: "Sjoerd" | "Nikita";
  onBack: () => void;
}

interface RestTimer {
  secondsLeft: number;
  totalSeconds: number;
}

interface WorkoutSummary {
  durationMinutes: number;
  totalVolume: number;
  completedSets: number;
  prs: { name: string; weight: number; prev: number }[];
  volumeChangePct: number | null;
}

function parseRestSeconds(rest: string): number {
  const numbers = rest.match(/\d+/g)?.map(Number) ?? [];
  return numbers.length === 0 ? 90 : Math.max(...numbers);
}

function parseWeight(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const str = raw.toString().replace(",", ".").trim();
  const match = str.match(/^[\d.]+/);
  if (!match) return null;
  const value = parseFloat(match[0]);
  return isNaN(value) ? null : value;
}

function parseReps(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const value = parseInt(raw.toString().trim());
  return isNaN(value) || value === 0 ? null : value;
}

function calculateSummary(
  exercises: ExerciseData[],
  sessionSets: Record<string, SetLog[]>,
  history: Record<string, HistoricalLog[]>,
  startTime: Date
): WorkoutSummary {
  const durationMinutes = Math.max(1, Math.round((Date.now() - startTime.getTime()) / 60000));
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

export function WorkoutSession({ workoutId, user, onBack }: WorkoutSessionProps) {
  const [phase, setPhase] = useState<"active" | "summary">("active");
  const [routines, setRoutines] = useState(() => getRoutines(user));
  const [restTimer, setRestTimer] = useState<RestTimer | null>(null);
  const [sessionSets, setSessionSets] = useState<Record<string, SetLog[]>>({});
  const [sessionNotes, setSessionNotes] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const startTime = useRef(new Date());

  useEffect(() => {
    setRoutines(getRoutines(user));
    syncRoutinesFromCloud(user).then(cloud => { if (cloud) setRoutines(cloud); });
  }, [user]);

  useEffect(() => {
    if (!restTimer) return;
    if (restTimer.secondsLeft <= 0) {
      navigator.vibrate?.([150, 100, 150]);
      const t = setTimeout(() => setRestTimer(null), 1800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => setRestTimer(prev => prev ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : null),
      1000
    );
    return () => clearTimeout(t);
  }, [restTimer]);

  const workoutData = useMemo(() => routines.find(w => w.id === workoutId), [workoutId, routines]);

  const { exercises, history } = useMemo(() => {
    if (!workoutData) return { exercises: [] as ExerciseData[], history: {} as Record<string, HistoricalLog[]> };
    const parsedExercises: ExerciseData[] = [];
    const parsedHistory: Record<string, HistoricalLog[]> = {};

    workoutData.exercises?.forEach((ex, index) => {
      const exId = `ex-${index}`;
      const setsTarget = parseInt(ex.sets_target || "3") || 3;
      const notesRow = ex.sets?.find((s: any) => parseInt(s.set_number) === 5);
      const techniqueNote =
        notesRow?.history?.map((h: any) => h.weight?.toString())
          .filter((w?: string) => w && isNaN(parseFloat(w.replace(",", "."))))
          .join(" · ") || undefined;
      const lastSessionNote = ex.sessionNotes
        ? (Object.entries(ex.sessionNotes as Record<string, string>)
            .sort(([a], [b]) => parseInt(b) - parseInt(a))[0]?.[1] ?? undefined)
        : undefined;

      parsedExercises.push({
        id: exId, name: ex.name, targetSets: setsTarget,
        targetReps: ex.reps_target || "-", tempo: ex.tempo || "-", rest: ex.rest || "-",
        notes: ex.notes || undefined, techniqueNote, lastSessionNote, imageUrl: ex.imageUrl,
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

  const handleUploadImage = async (exerciseIndex: number, file: File) => {
    try {
      const compressed = await compressImage(file);
      const url = await uploadImageToFirestore(compressed);
      const updated = [...routines];
      const wi = updated.findIndex(w => w.id === workoutId);
      if (wi !== -1) {
        const exs = [...(updated[wi].exercises || [])];
        if (exs[exerciseIndex]) {
          exs[exerciseIndex] = { ...exs[exerciseIndex], imageUrl: url };
          updated[wi] = { ...updated[wi], exercises: exs };
          setRoutines(updated);
          saveRoutines(user, updated);
        }
      }
    } catch (err) { console.error("Failed to upload image", err); }
  };

  const handleFinishWorkout = () => {
    const stats = calculateSummary(exercises, sessionSets, history, startTime.current);
    const completedExercises: CompletedExerciseData[] = exercises.map((exercise, exerciseIndex) => ({
      exerciseIndex,
      sets: (sessionSets[exercise.id] ?? []).map(s => ({ weight: s.weight, reps: s.reps, completed: s.completed })),
      note: sessionNotes[exercise.id],
    }));
    saveWorkoutSession(user, workoutId, completedExercises);
    setSummary(stats);
    setPhase("summary");
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

  const completedSetCount = (Object.values(sessionSets) as SetLog[][]).reduce(
    (total, sets) => total + sets.filter(s => s.completed).length, 0
  );
  const totalSetCount = exercises.reduce((total, ex) => total + ex.targetSets, 0);
  const progress = totalSetCount > 0 ? completedSetCount / totalSetCount : 0;

  return (
    <div className="min-h-screen bg-[#08080f] font-sans pb-32">
      {/* Sticky header */}
      <header className="bg-[#08080f]/90 backdrop-blur-md px-5 py-4 sticky top-0 z-20 border-b border-white/[0.05]">
        <div className="flex items-center gap-4 mb-3 max-w-2xl mx-auto">
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
        {exercises.map((exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            historicalLogs={history[exercise.id] || []}
            onUploadImage={file => handleUploadImage(index, file)}
            onSetsChange={sets => setSessionSets(prev => ({ ...prev, [exercise.id]: sets }))}
            onSetCompleted={secs => setRestTimer({ secondsLeft: secs, totalSeconds: secs })}
            onNoteChange={note => setSessionNotes(prev => ({ ...prev, [exercise.id]: note }))}
          />
        ))}
      </main>

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
              {restTimer.secondsLeft <= 0 ? "Klaar!" : "Rust"}
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
                  stroke={restTimer.secondsLeft <= 0 ? "#c2ff5d" : "#c2ff5d"}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 96}`}
                  strokeDashoffset={`${2 * Math.PI * 96 * (1 - Math.max(0, restTimer.secondsLeft) / restTimer.totalSeconds)}`}
                  style={{
                    filter: restTimer.secondsLeft <= 0 ? "drop-shadow(0 0 12px #c2ff5d)" : "drop-shadow(0 0 6px rgba(194,255,93,0.5))",
                    transition: "stroke-dashoffset 0.9s linear",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {restTimer.secondsLeft <= 0 ? (
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
                      key={restTimer.secondsLeft}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.2 }}
                      transition={{ duration: 0.2 }}
                      className="text-6xl font-black text-white tabular-nums"
                    >
                      {restTimer.secondsLeft}
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
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleFinishWorkout}
            className="w-full bg-[#c2ff5d] text-[#08080f] font-black text-base py-5 rounded-2xl shadow-xl shadow-[#c2ff5d]/15 hover:bg-[#d4ff72] transition-colors"
          >
            Workout Afronden
          </motion.button>
        </div>
      </div>
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
