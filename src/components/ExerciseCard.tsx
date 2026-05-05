import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera, Check, Clock, Upload, History,
  Lightbulb, TrendingUp, TrendingDown, Minus, MessageSquare, Info,
  MoreVertical, Trash2,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { getImageUrlFromFirestore } from "@/src/lib/firebase";

export interface ExerciseData {
  id: string;
  name: string;
  notes?: string;
  techniqueNote?: string;
  lastSessionNote?: string;
  targetSets: number;
  targetReps: string;
  tempo: string;
  rest: string;
  imageUrl?: string;
}

export interface HistoricalLog {
  date: string;
  sets: { weight: number; reps: number }[];
}

export interface SetLog {
  setNumber: number;
  weight: number | "";
  reps: number | "";
  completed: boolean;
}

interface ExerciseCardProps {
  key?: React.Key;
  exercise: ExerciseData;
  historicalLogs: HistoricalLog[];
  onUploadImage: (file: File) => Promise<void>;
  onDeleteImage?: () => void;
  onSetsChange?: (sets: SetLog[]) => void;
  onSetCompleted?: (restSeconds: number) => void;
  onNoteChange?: (note: string) => void;
}

function parseRestSeconds(rest: string): number {
  const numbers = rest.match(/\d+/g)?.map(Number) ?? [];
  return numbers.length === 0 ? 90 : Math.max(...numbers);
}

function getTrend(logs: HistoricalLog[]) {
  if (logs.length < 2) return null;
  const avg = (log: HistoricalLog) =>
    log.sets.reduce((s, x) => s + x.weight, 0) / (log.sets.length || 1);
  const diff = avg(logs[0]) - avg(logs[1]);
  if (diff > 0) return <TrendingUp className="w-3.5 h-3.5 text-[#c2ff5d]" />;
  if (diff < 0) return <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
  return <Minus className="w-3.5 h-3.5 text-white/20" />;
}

export function ExerciseCard({
  exercise,
  historicalLogs,
  onUploadImage,
  onDeleteImage,
  onSetsChange,
  onSetCompleted,
  onNoteChange,
}: ExerciseCardProps) {
  const [sets, setSets] = useState<SetLog[]>(
    Array.from({ length: exercise.targetSets }, (_, i) => ({
      setNumber: i + 1,
      weight: "",
      reps: "",
      completed: false,
    }))
  );
  const [note, setNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | undefined>(exercise.imageUrl);
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!exercise.imageUrl) return;
    if (exercise.imageUrl.startsWith("firestore://")) {
      getImageUrlFromFirestore(exercise.imageUrl).then(url => {
        if (url) setDisplayImageUrl(url);
      });
    } else {
      setDisplayImageUrl(exercise.imageUrl);
    }
  }, [exercise.imageUrl]);

  useEffect(() => {
    onSetsChange?.(sets);
  }, [sets]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const handleConfirmDelete = () => {
    setShowConfirm(false);
    setShowMenu(false);
    setDisplayImageUrl(undefined);
    onDeleteImage?.();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      await onUploadImage(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetChange = (index: number, field: "weight" | "reps", value: string) => {
    setSets(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value === "" ? "" : Number(value) };
      return next;
    });
  };

  const toggleSetComplete = (index: number) => {
    const current = sets[index];
    if (!current.completed && (current.weight === "" || current.reps === "")) return;
    const updatedSet = { ...current, completed: !current.completed };
    setSets(prev => {
      const next = [...prev];
      next[index] = updatedSet;
      return next;
    });
    if (!current.completed) {
      onSetCompleted?.(parseRestSeconds(exercise.rest));
    }
  };

  const prefillFromHistory = (index: number) => {
    const lastSet = historicalLogs[0]?.sets[index];
    if (!lastSet) return;
    setSets(prev => {
      const next = [...prev];
      if (next[index].weight === "" && next[index].reps === "") {
        next[index] = { ...next[index], weight: lastSet.weight, reps: lastSet.reps };
      }
      return next;
    });
  };

  const completedCount = sets.filter(s => s.completed).length;
  const allDone = completedCount === exercise.targetSets;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111118] border border-white/[0.07] rounded-3xl overflow-hidden font-sans"
    >
      {/* Image header */}
      <div className="relative aspect-[16/9] bg-[#0a0a12] flex items-center justify-center overflow-hidden">
        {displayImageUrl ? (
          <img
            src={displayImageUrl}
            alt={exercise.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/20">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <Camera className="w-7 h-7" />
            </div>
            <p className="text-xs font-medium">Geen referentie foto</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 bg-white/[0.08] border border-white/10 text-white/50 rounded-full text-xs font-semibold flex items-center gap-2 active:scale-95 transition-all disabled:opacity-40"
            >
              <Upload className="w-3.5 h-3.5" />
              {isUploading ? "Uploaden..." : "Foto uploaden"}
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#111118] to-transparent" />

        {/* Exercise name over image */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-5">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight leading-tight">{exercise.name}</h2>
            {exercise.notes && (
              <span className="text-xs font-semibold text-white/50 bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-1 mb-0.5 shrink-0 ml-3">
                {exercise.notes}
              </span>
            )}
          </div>
        </div>

        {/* 3-dot menu (only when image exists) */}
        {displayImageUrl && (
          <div ref={menuRef} className="absolute top-3 right-3 z-10">
            <button
              onClick={() => setShowMenu(v => !v)}
              className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-10 right-0 bg-[#1a1a26] border border-white/[0.08] rounded-2xl shadow-xl overflow-hidden min-w-[170px]"
                >
                  <button
                    onClick={() => { setShowMenu(false); setShowConfirm(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Afbeelding verwijderen
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Progress badge */}
        <AnimatePresence>
          {completedCount > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className={cn(
                "absolute text-xs font-bold rounded-full w-9 h-9 flex items-center justify-center shadow-lg",
                displayImageUrl ? "top-3 right-12" : "top-3 right-3",
                allDone
                  ? "bg-[#c2ff5d] text-[#08080f] shadow-[#c2ff5d]/30"
                  : "bg-white/15 text-white backdrop-blur-sm"
              )}
            >
              {completedCount}/{exercise.targetSets}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="bg-[#13131e] border border-white/[0.08] rounded-3xl p-6 w-full max-w-sm shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Afbeelding verwijderen?</h3>
              <p className="text-sm text-white/40 leading-relaxed mb-6">
                De referentiefoto van <span className="text-white/60 font-medium">{exercise.name}</span> wordt permanent verwijderd.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 h-11 rounded-2xl bg-white/[0.06] border border-white/[0.06] text-white/60 text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 h-11 rounded-2xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-400 transition-colors shadow-lg shadow-rose-500/20"
                >
                  Verwijderen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-5 space-y-4">
        {/* Targets */}
        <div className="flex flex-wrap gap-2">
          <MetaBadge icon={<Check className="w-3 h-3" />} label={`${exercise.targetSets} sets`} />
          <MetaBadge icon={<span className="font-bold text-[9px]">×</span>} label={`${exercise.targetReps}`} />
          <MetaBadge icon={<Clock className="w-3 h-3" />} label={`${exercise.rest}`} />
          <MetaBadge icon={<Info className="w-3 h-3" />} label={`${exercise.tempo}`} />
        </div>

        {/* Technique note */}
        {exercise.techniqueNote && (
          <div className="flex items-start gap-2.5 bg-amber-400/[0.07] border border-amber-400/15 rounded-2xl px-3.5 py-2.5">
            <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-amber-400/80" />
            <p className="text-sm font-medium text-amber-200/70 leading-snug">{exercise.techniqueNote}</p>
          </div>
        )}

        {/* Historical data */}
        {historicalLogs.length > 0 && (
          <div className="bg-[#0a0a12] border border-white/[0.05] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-white/25" />
                <h3 className="text-xs font-semibold text-white/25 uppercase tracking-wider">Vorige sessies</h3>
              </div>
              {getTrend(historicalLogs)}
            </div>
            <div className="space-y-2">
              {historicalLogs.slice(0, 3).map((log, i) => (
                <div key={i} className="flex items-start justify-between text-sm gap-3">
                  <span className="text-white/20 text-xs font-medium pt-0.5 w-20 shrink-0">{log.date}</span>
                  <div className="flex flex-wrap justify-end gap-x-3 gap-y-0.5 font-semibold text-white/40">
                    {log.sets.map((s, idx) => (
                      <span key={idx} className="text-xs tabular-nums">{s.weight}kg × {s.reps}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Set inputs */}
        <div className="space-y-2">
          <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-3 px-1 mb-2">
            <div className="w-10 text-center text-[10px] font-bold text-white/20 uppercase tracking-widest">Set</div>
            <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">KG</div>
            <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Reps</div>
            <div className="w-14 text-center text-[10px] font-bold text-white/20 uppercase tracking-widest">Klaar</div>
          </div>

          {sets.map((set, index) => (
            <motion.div
              key={index}
              layout
              className={cn(
                "grid grid-cols-[auto_1fr_1fr_auto] gap-3 items-center px-1 py-1.5 rounded-2xl transition-colors duration-300",
                set.completed ? "bg-[#c2ff5d]/[0.06]" : "bg-transparent"
              )}
            >
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => prefillFromHistory(index)}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-colors",
                  set.completed
                    ? "bg-[#c2ff5d] text-[#08080f]"
                    : "bg-white/[0.06] text-white/30 hover:bg-white/10 hover:text-white/50"
                )}
                title="Vul vorige sessie in"
              >
                {set.setNumber}
              </motion.button>

              <input
                type="number"
                inputMode="decimal"
                value={set.weight}
                onChange={e => handleSetChange(index, "weight", e.target.value)}
                disabled={set.completed}
                placeholder={historicalLogs[0]?.sets[index]?.weight.toString() ?? "0"}
                className={cn(
                  "w-full h-12 rounded-xl px-4 text-lg font-semibold outline-none transition-all",
                  "bg-[#0a0a12] border border-white/[0.06]",
                  "focus:border-[#c2ff5d]/30 focus:bg-[#0f0f1a]",
                  "disabled:opacity-30 disabled:bg-transparent disabled:border-transparent",
                  "placeholder:text-white/15",
                  set.completed ? "text-[#c2ff5d]" : "text-white"
                )}
              />

              <input
                type="number"
                inputMode="numeric"
                value={set.reps}
                onChange={e => handleSetChange(index, "reps", e.target.value)}
                disabled={set.completed}
                placeholder={historicalLogs[0]?.sets[index]?.reps.toString() ?? "0"}
                className={cn(
                  "w-full h-12 rounded-xl px-4 text-lg font-semibold outline-none transition-all",
                  "bg-[#0a0a12] border border-white/[0.06]",
                  "focus:border-[#c2ff5d]/30 focus:bg-[#0f0f1a]",
                  "disabled:opacity-30 disabled:bg-transparent disabled:border-transparent",
                  "placeholder:text-white/15",
                  set.completed ? "text-[#c2ff5d]" : "text-white"
                )}
              />

              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => toggleSetComplete(index)}
                className={cn(
                  "w-14 h-12 rounded-xl flex items-center justify-center transition-all",
                  set.completed
                    ? "bg-[#c2ff5d] shadow-lg shadow-[#c2ff5d]/20"
                    : "bg-white/[0.06] border border-white/[0.06] hover:bg-white/10"
                )}
              >
                <AnimatePresence mode="wait">
                  {set.completed ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    >
                      <Check className="w-5 h-5 text-[#08080f]" strokeWidth={3} />
                    </motion.div>
                  ) : (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Check className="w-4 h-4 text-white/20" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Session note */}
        <div className="pt-1 border-t border-white/[0.05] space-y-2">
          {exercise.lastSessionNote && (
            <div className="flex items-start gap-2 text-white/30 text-xs">
              <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="italic leading-relaxed">{exercise.lastSessionNote}</span>
            </div>
          )}
          <textarea
            value={note}
            onChange={e => {
              setNote(e.target.value);
              onNoteChange?.(e.target.value);
            }}
            placeholder={exercise.lastSessionNote ? "Nieuwe notitie..." : "Notitie (bijv. last van schouder)..."}
            rows={1}
            className="w-full bg-[#0a0a12] border border-white/[0.05] text-white/50 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-white/10 resize-none placeholder:text-white/15 leading-relaxed transition-colors"
            style={{ minHeight: "2.5rem" }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = el.scrollHeight + "px";
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function MetaBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.05] border border-white/[0.06] text-white/35 rounded-lg text-xs font-semibold">
      {icon}
      <span>{label}</span>
    </div>
  );
}
