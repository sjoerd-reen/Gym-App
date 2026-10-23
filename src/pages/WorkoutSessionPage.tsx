import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { CheckCircle2, ChevronLeft, History } from "lucide-react";
import { useWorkoutSession } from "@/src/features/workout/hooks/useWorkoutSession";
import { ExerciseCard } from "@/src/features/workout/components/ExerciseCard";
import { RestTimerDock } from "@/src/features/workout/components/RestTimerDock";
import { FinishSheet } from "@/src/features/workout/components/FinishSheet";
import { WorkoutSummary } from "@/src/features/workout/components/WorkoutSummary";
import { Button, IconButton } from "@/src/components/ui/Button";
import { ACTIVE_WORKOUT_KEY } from "@/src/app/providers/UserProvider";
import { useNow } from "@/src/hooks/useNow";
import { formatElapsed } from "@/src/lib/format";

export function WorkoutSessionPage() {
  const { routineId = "" } = useParams();
  const navigate = useNavigate();
  const session = useWorkoutSession(routineId);
  const [finishing, setFinishing] = useState(false);
  const now = useNow(1000, session.summary === null);

  useEffect(() => {
    if (session.routine && !session.summary) localStorage.setItem(ACTIVE_WORKOUT_KEY, routineId);
  }, [session.routine, session.summary, routineId]);

  const leave = useCallback(() => {
    localStorage.removeItem(ACTIVE_WORKOUT_KEY);
    navigate("/workout");
  }, [navigate]);

  if (!session.routine) {
    return (
      <div className="min-h-dvh bg-canvas flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-semibold text-ink">Deze training bestaat niet (meer)</p>
        <Button variant="secondary" onClick={leave}>Terug naar trainen</Button>
      </div>
    );
  }

  if (session.summary) {
    return (
      <WorkoutSummary
        summary={session.summary}
        routineName={session.routine.workout_name}
        onDone={() => {
          localStorage.removeItem(ACTIVE_WORKOUT_KEY);
          navigate("/dashboard");
        }}
      />
    );
  }

  const { exercises, completedSets, totalSets } = session;
  const progress = totalSets ? completedSets / totalSets : 0;

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 bg-canvas/80 backdrop-blur-xl border-b border-line/70 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 h-16 flex items-center gap-2">
          <IconButton label="Terug" onClick={leave} className="-ml-1">
            <ChevronLeft className="w-6 h-6" />
          </IconButton>
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-bold tracking-tight text-ink truncate">{session.routine.workout_name}</h1>
            <p className="text-xs font-medium text-muted tabular-nums">
              {session.hasData ? formatElapsed(now - session.startedAt) : "Nog niet gestart"} · {completedSets}/{totalSets} sets
            </p>
          </div>
          <Link
            to={`/history?routine=${encodeURIComponent(routineId)}`}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-ink-2 hover:bg-subtle transition-colors"
            aria-label="Historie van deze routine"
            title="Historie"
          >
            <History className="w-5 h-5" />
          </Link>
        </div>
        <div className="h-[3px] bg-line/60">
          <div className="h-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${progress * 100}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 pt-5 pb-[calc(env(safe-area-inset-bottom)+180px)] space-y-5">
        {exercises.map((exercise, i) => (
          <ExerciseCard
            key={exercise.uid}
            exercise={exercise}
            position={i + 1}
            count={exercises.length}
            sets={session.getSets(exercise.uid, exercise.targetSets)}
            logs={session.logs[exercise.uid] ?? []}
            advice={session.advice[exercise.uid]}
            note={session.notes[exercise.uid] ?? ""}
            onSetChange={(index, field, value) => session.updateSet(exercise.uid, exercise.targetSets, index, field, value)}
            onPrefill={index => session.prefillSet(exercise.uid, exercise.targetSets, index)}
            onStartRest={session.rest.start}
            onNoteChange={note => session.setNote(exercise.uid, note)}
            onSaveNote={note => session.saveNote(exercise.uid, note)}
            onEdit={edits => session.editExercise(exercise.uid, edits)}
            onDelete={() => session.deleteExercise(exercise.uid)}
            onDeleteImage={() => session.deleteImage(exercise.uid)}
            onUploadImage={file => session.uploadImage(exercise.uid, file)}
          />
        ))}
        {exercises.length === 0 && (
          <p className="py-16 text-center text-muted">Deze routine heeft geen oefeningen.</p>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 pointer-events-none">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 pb-[max(env(safe-area-inset-bottom),16px)] pt-10 bg-gradient-to-t from-canvas via-canvas/90 to-transparent space-y-3">
          <div className="pointer-events-auto">
            <RestTimerDock
              timer={session.rest.timer}
              secondsLeft={session.rest.secondsLeft}
              done={session.rest.done}
              onAdjust={session.rest.adjust}
              onStop={session.rest.stop}
            />
          </div>
          <div className="pointer-events-auto flex justify-center">
            <button
              onClick={() => setFinishing(true)}
              className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-surface border border-line shadow-card text-[15px] font-semibold text-ink active:scale-[0.97] transition-transform"
            >
              <CheckCircle2 className="w-[18px] h-[18px] text-success" />
              Training afronden
            </button>
          </div>
        </div>
      </div>

      <FinishSheet
        open={finishing}
        completedSets={completedSets}
        totalSets={totalSets}
        canDiscard={session.hasData}
        onClose={() => setFinishing(false)}
        onFinish={() => {
          if (session.finish()) {
            localStorage.removeItem(ACTIVE_WORKOUT_KEY);
            setFinishing(false);
            window.scrollTo(0, 0);
          } else {
            alert("Opslaan is mislukt. Je ingevulde waarden blijven bewaard als concept.");
          }
        }}
        onDiscard={() => {
          session.discard();
          setFinishing(false);
          leave();
        }}
      />
    </div>
  );
}
