import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Dumbbell, Archive, RotateCcw, Plus, X, Upload, Clock, ChevronRight, Flame } from "lucide-react";
import { cn, compressImage } from "@/src/lib/utils";
import { getRoutines, saveRoutines, Routine, getLastTrainedDate, formatRelativeDate } from "@/src/lib/storage";
import { uploadImageToFirestore, getImageUrlFromFirestore } from "@/src/lib/firebase";

function FirestoreImage({ url, alt, className }: { url: string; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | undefined>();
  useEffect(() => {
    if (url.startsWith("firestore://")) {
      getImageUrlFromFirestore(url).then(res => { if (res) setSrc(res); });
    } else {
      setSrc(url);
    }
  }, [url]);
  if (!src) return <Dumbbell className="w-5 h-5 text-white/40" />;
  return <img src={src} alt={alt} className={cn("w-full h-full object-cover", className)} />;
}

interface NewExercise {
  id: string;
  name: string;
  sets_target: string;
  reps_target: string;
  tempo: string;
  rest: string;
  imageUrl?: string;
}

const CARD_ACCENTS = [
  { from: "from-violet-500", to: "to-fuchsia-500", glow: "shadow-violet-500/20" },
  { from: "from-blue-500", to: "to-cyan-500", glow: "shadow-blue-500/20" },
  { from: "from-emerald-400", to: "to-teal-500", glow: "shadow-emerald-500/20" },
  { from: "from-orange-400", to: "to-rose-500", glow: "shadow-orange-500/20" },
];

interface DashboardProps {
  user: "Sjoerd" | "Nikita";
  onSelectWorkout: (workoutId: string) => void;
  onLogout: () => void;
}

export function Dashboard({ user, onSelectWorkout, onLogout }: DashboardProps) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState("");
  const [newExercises, setNewExercises] = useState<NewExercise[]>([]);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [exName, setExName] = useState("");
  const [exSets, setExSets] = useState("3");
  const [exReps, setExReps] = useState("8-12");
  const [exTempo, setExTempo] = useState("3 1 1 1");
  const [exRest, setExRest] = useState("90");
  const [exImage, setExImage] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRoutines(getRoutines(user));
    setShowArchived(false);
  }, [user]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Goedemorgen";
    if (h < 18) return "Goedemiddag";
    return "Goedenavond";
  })();

  const toggleArchive = (id: string) => {
    const updated = routines.map(r => r.id === id ? { ...r, isArchived: !r.isArchived } : r);
    setRoutines(updated);
    saveRoutines(user, updated);
  };

  const handleCreate = () => {
    if (!newRoutineName.trim()) return;
    const formattedExercises = newExercises.map(ex => ({
      name: ex.name,
      sets_target: ex.sets_target,
      reps_target: ex.reps_target,
      imageUrl: ex.imageUrl,
      tempo: ex.tempo,
      rest: ex.rest + " sec",
      notes: "",
      sets: []
    }));
    const newRoutine: Routine = {
      id: newRoutineName.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now(),
      workout_name: newRoutineName.trim(),
      isArchived: false,
      exercises: formattedExercises
    };
    const updated = [...routines, newRoutine];
    setRoutines(updated);
    saveRoutines(user, updated);
    setNewRoutineName("");
    setNewExercises([]);
    setIsCreating(false);
  };

  const handleAddExercise = async () => {
    if (!exName.trim()) return;
    let finalImageUrl = exImage;
    if (exImage && !exImage.startsWith("firestore://")) {
      try { finalImageUrl = await uploadImageToFirestore(exImage); } catch {}
    }
    setNewExercises([...newExercises, {
      id: Date.now().toString(),
      name: exName.trim(),
      sets_target: exSets,
      reps_target: exReps,
      tempo: exTempo,
      rest: exRest,
      imageUrl: finalImageUrl
    }]);
    setExName(""); setExSets("3"); setExReps("8-12");
    setExTempo("3 1 1 1"); setExRest("90");
    setExImage(undefined); setIsAddingExercise(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try { setExImage(await compressImage(file)); } catch {}
    }
  };

  function countUniqueSessions(exercises: any[]): number {
    const uniqueTrainings = new Set<number>();
    exercises?.forEach((ex: any) => {
      const setsTarget = parseInt(ex.sets_target || "3") || 3;
      ex.sets?.forEach((set: any) => {
        if (parseInt(set.set_number) > setsTarget) return;
        set.history?.forEach((h: any) => {
          const reps = parseInt((h.reps || "").toString());
          if (h.training && !isNaN(reps) && reps > 0) uniqueTrainings.add(h.training);
        });
      });
    });
    return uniqueTrainings.size;
  }

  const displayedRoutines = routines.filter(r => r.isArchived === showArchived);
  const workouts = displayedRoutines.map((data, index) => {
    const lastDate = getLastTrainedDate(data);
    return {
      id: data.id,
      name: data.workout_name,
      completedCount: countUniqueSessions(data.exercises),
      exerciseCount: data.exercises?.length ?? 0,
      lastTrained: lastDate ? formatRelativeDate(lastDate) : null,
      accent: CARD_ACCENTS[index % CARD_ACCENTS.length],
      isArchived: data.isArchived,
    };
  });

  const totalWorkouts = routines.reduce((sum, data) => sum + countUniqueSessions(data.exercises), 0);
  const activeCount = routines.filter(r => !r.isArchived).length;

  return (
    <div className="min-h-screen bg-[#08080f] font-sans pb-32 relative overflow-x-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 pt-14 pb-8">
        <div className="flex items-start justify-between mb-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-white/40 text-sm font-medium mb-0.5">{greeting},</p>
            <h1 className="text-3xl font-black text-white tracking-tight">{user}</h1>
          </motion.div>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onLogout}
            className="mt-1 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/40 text-xs font-semibold hover:bg-white/10 transition-colors"
          >
            Wissel
          </motion.button>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Dumbbell className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <span className="text-white/30 text-xs font-semibold uppercase tracking-wider">Routines</span>
            </div>
            <p className="text-3xl font-black text-white">{activeCount}</p>
          </div>
          <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-[#c2ff5d]/15 flex items-center justify-center">
                <Flame className="w-3.5 h-3.5 text-[#c2ff5d]" />
              </div>
              <span className="text-white/30 text-xs font-semibold uppercase tracking-wider">Trainingen</span>
            </div>
            <p className="text-3xl font-black text-white">{totalWorkouts}</p>
          </div>
        </motion.div>
      </header>

      {/* Workouts */}
      <main className="relative z-10 px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white/60 text-xs font-semibold uppercase tracking-widest">
            {showArchived ? "Archief" : "Jouw routines"}
          </h2>
          {(showArchived || routines.some(r => r.isArchived)) && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="text-white/30 text-xs font-medium hover:text-white/60 transition-colors"
            >
              {showArchived ? "← Terug" : "Archief →"}
            </button>
          )}
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {workouts.map((workout, index) => (
              <motion.div
                layout
                key={workout.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                className="relative"
              >
                <div className="bg-[#111118] border border-white/[0.06] rounded-2xl flex items-center gap-4 p-4 overflow-hidden">
                  {/* Subtle gradient bg tint */}
                  <div className={cn("absolute inset-0 opacity-[0.04] bg-gradient-to-r pointer-events-none", workout.accent.from, workout.accent.to)} />

                  <button
                    onClick={() => onSelectWorkout(workout.id)}
                    className="flex items-center gap-4 flex-1 text-left focus:outline-none relative"
                  >
                    <div className={cn(
                      "w-13 h-13 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-lg",
                      workout.accent.from, workout.accent.to, workout.accent.glow,
                      workout.isArchived && "opacity-40 grayscale"
                    )}
                      style={{ width: 52, height: 52 }}
                    >
                      <Dumbbell className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                        "font-bold text-base truncate leading-tight",
                        workout.isArchived ? "text-white/40" : "text-white"
                      )}>
                        {workout.name}
                      </h3>
                      <p className="text-white/30 text-sm mt-0.5">
                        {workout.exerciseCount} oefeningen · {workout.completedCount}×
                      </p>
                      {workout.lastTrained && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-white/20" />
                          <span className="text-white/20 text-xs">{workout.lastTrained}</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/15 shrink-0" />
                  </button>

                  <button
                    onClick={() => toggleArchive(workout.id)}
                    className="p-2.5 text-white/15 hover:text-white/40 hover:bg-white/[0.06] rounded-xl transition-all relative shrink-0"
                    title={workout.isArchived ? "Terugzetten" : "Archiveren"}
                  >
                    {workout.isArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {!showArchived && (
            <motion.button
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: workouts.length * 0.04 + 0.1 }}
              onClick={() => setIsCreating(true)}
              className="w-full py-5 rounded-2xl border border-dashed border-white/[0.1] text-white/25 text-sm font-semibold flex items-center justify-center gap-2 hover:border-white/20 hover:text-white/40 transition-all"
            >
              <Plus className="w-4 h-4" />
              Nieuwe routine
            </motion.button>
          )}
        </div>
      </main>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setIsCreating(false)}
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="relative bg-[#111118] border border-white/[0.08] rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="text-white text-xl font-bold tracking-tight">Nieuwe routine</h3>
                <button
                  onClick={() => setIsCreating(false)}
                  className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pb-4 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">Naam</label>
                  <input
                    type="text"
                    value={newRoutineName}
                    onChange={e => setNewRoutineName(e.target.value)}
                    placeholder="Bijv. Push Day, Rug & Biceps..."
                    className="w-full bg-[#0a0a12] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#c2ff5d]/40 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Oefeningen</label>

                  <div className="space-y-2 mb-3">
                    {newExercises.map((ex, i) => (
                      <div key={ex.id} className="flex items-center gap-3 p-3 bg-[#0a0a12] border border-white/[0.06] rounded-xl">
                        <div className="w-10 h-10 rounded-xl bg-[#1a1a26] overflow-hidden shrink-0 flex items-center justify-center">
                          {ex.imageUrl ? <FirestoreImage url={ex.imageUrl} alt={ex.name} /> : <Dumbbell className="w-4 h-4 text-white/30" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{ex.name}</p>
                          <p className="text-xs text-white/30">{ex.sets_target} × {ex.reps_target} · {ex.rest}s</p>
                        </div>
                        <button
                          onClick={() => setNewExercises(newExercises.filter((_, idx) => idx !== i))}
                          className="p-1.5 text-white/20 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {isAddingExercise ? (
                    <div className="bg-[#0a0a12] border border-white/[0.08] rounded-xl p-4 space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-white/30 mb-1.5">Naam oefening</label>
                        <input
                          type="text"
                          value={exName}
                          onChange={e => setExName(e.target.value)}
                          placeholder="Bijv. Bench Press"
                          autoFocus
                          className="w-full bg-[#16161f] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#c2ff5d]/30 transition-colors"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Sets", value: exSets, set: setExSets, type: "text" },
                          { label: "Reps", value: exReps, set: setExReps, type: "text", placeholder: "8-12" },
                          { label: "Rust (sec)", value: exRest, set: setExRest, type: "number", placeholder: "90" },
                          { label: "Tempo", value: exTempo, set: setExTempo, type: "text", placeholder: "3 1 1 1" },
                        ].map(({ label, value, set, type, placeholder }) => (
                          <div key={label}>
                            <label className="block text-xs font-medium text-white/30 mb-1.5">{label}</label>
                            <input
                              type={type}
                              value={value}
                              onChange={e => set(e.target.value)}
                              placeholder={placeholder}
                              className="w-full bg-[#16161f] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#c2ff5d]/30 transition-colors"
                            />
                          </div>
                        ))}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/30 mb-1.5">Foto (optioneel)</label>
                        <div className="flex items-center gap-3">
                          {exImage && <img src={exImage} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-white/10" />}
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-2 bg-[#16161f] border border-white/[0.06] text-white/40 rounded-lg text-xs font-medium flex items-center gap-2 hover:text-white/60 transition-colors"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            {exImage ? "Andere foto" : "Foto uploaden"}
                          </button>
                          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setIsAddingExercise(false)}
                          className="flex-1 py-2.5 text-sm font-semibold text-white/40 bg-[#16161f] border border-white/[0.06] rounded-lg hover:text-white/60 transition-colors"
                        >
                          Annuleren
                        </button>
                        <button
                          onClick={handleAddExercise}
                          disabled={!exName.trim()}
                          className="flex-1 py-2.5 text-sm font-semibold text-[#08080f] bg-[#c2ff5d] rounded-lg disabled:opacity-40 transition-opacity"
                        >
                          Toevoegen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAddingExercise(true)}
                      className="w-full py-3 border border-dashed border-white/[0.1] rounded-xl text-white/25 text-sm font-semibold flex items-center justify-center gap-2 hover:border-white/20 hover:text-white/40 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Oefening toevoegen
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-4 shrink-0 border-t border-white/[0.06]">
                <button
                  onClick={handleCreate}
                  disabled={!newRoutineName.trim() || newExercises.length === 0}
                  className="w-full py-4 font-bold text-[#08080f] bg-[#c2ff5d] rounded-2xl disabled:opacity-30 transition-opacity text-base"
                >
                  Routine opslaan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
