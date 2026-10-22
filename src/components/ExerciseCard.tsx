import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera, Check, Clock, Upload, History,
  Lightbulb, TrendingUp, TrendingDown, Minus, MessageSquare, Info,
  MoreVertical, Trash2, Pencil, Send, Timer,
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

export interface EditableExerciseFields {
  name: string;
  targetSets: number;
  targetReps: string;
  tempo: string;
  rest: string;
  techniqueNote?: string;
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
  onEditExercise?: (updates: EditableExerciseFields) => void;
  onDeleteExercise?: () => void;
  initialSets?: SetLog[];
  initialNote?: string;
  onSetsChange?: (sets: SetLog[]) => void;
  onStartRest?: (restSeconds: number) => void;
  onNoteChange?: (note: string) => void;
  onSaveNote?: (note: string) => void;
}

function buildSets(count: number, existing: SetLog[] = []): SetLog[] {
  return Array.from({ length: count }, (_, i) => existing[i] ?? {
    setNumber: i + 1,
    weight: "",
    reps: "",
    completed: false,
  });
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
  onEditExercise,
  onDeleteExercise,
  initialSets,
  initialNote,
  onSetsChange,
  onStartRest,
  onNoteChange,
  onSaveNote,
}: ExerciseCardProps) {
  const [sets, setSets] = useState<SetLog[]>(() => buildSets(exercise.targetSets, initialSets));
  const [note, setNote] = useState(initialNote ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | undefined>(exercise.imageUrl);
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteExerciseConfirm, setShowDeleteExerciseConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editFields, setEditFields] = useState({
    name: exercise.name,
    targetSets: exercise.targetSets.toString(),
    targetReps: exercise.targetReps,
    tempo: exercise.tempo,
    rest: exercise.rest,
    techniqueNote: exercise.techniqueNote ?? "",
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sets.length !== exercise.targetSets) setSets(prev => buildSets(exercise.targetSets, prev));
  }, [exercise.targetSets]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!exercise.imageUrl) {
      setDisplayImageUrl(undefined);
      return;
    }
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

  const openEdit = () => {
    setEditFields({
      name: exercise.name,
      targetSets: exercise.targetSets.toString(),
      targetReps: exercise.targetReps,
      tempo: exercise.tempo,
      rest: exercise.rest,
      techniqueNote: exercise.techniqueNote ?? "",
    });
    setShowMenu(false);
    setShowEdit(true);
  };

  const handleSaveEdit = () => {
    onEditExercise?.({
      name: editFields.name.trim() || exercise.name,
      targetSets: parseInt(editFields.targetSets) || exercise.targetSets,
      targetReps: editFields.targetReps.trim() || exercise.targetReps,
      tempo: editFields.tempo.trim() || exercise.tempo,
      rest: editFields.rest.trim() || exercise.rest,
      techniqueNote: editFields.techniqueNote.trim() || undefined,
    });
    setShowEdit(false);
  };

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
      const updated = { ...next[index], [field]: value === "" ? "" : Number(value) };
      updated.completed = updated.weight !== "" && updated.reps !== "";
      next[index] = updated;
      return next;
    });
  };

  const prefillFromHistory = (index: number) => {
    const lastSet = historicalLogs[0]?.sets[index];
    if (!lastSet) return;
    setSets(prev => {
      const next = [...prev];
      if (next[index].weight === "" && next[index].reps === "") {
        next[index] = { ...next[index], weight: lastSet.weight, reps: lastSet.reps, completed: true };
      }
      return next;
    });
  };

  const completedCount = sets.filter(s => s.completed).length;
  const allDone = completedCount === exercise.targetSets;

  const inputClass = cn(
    "w-full h-11 rounded-xl px-3 text-sm font-semibold outline-none transition-all",
    "bg-[#0a0a12] border border-white/[0.06] text-white",
    "focus:border-[#c2ff5d]/30 focus:bg-[#0f0f1a]",
    "placeholder:text-white/15"
  );

  const labelClass = "text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1.5 block";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-[#111118] border border-white/[0.07] rounded-3xl overflow-hidden font-sans"
    >
      {/* Image header */}
      <div className="relative aspect-[16/9] bg-[#0a0a12] flex items-center justify-center overflow-hidden">
        {displayImageUrl ? (
          <img
            src={displayImageUrl}
            alt={exercise.name}
            className={cn(
              "w-full h-full",
              displayImageUrl.startsWith("https://pump-app")
                ? "object-contain p-4"
                : "object-cover"
            )}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="relative z-10 flex flex-col items-center gap-3 text-white/20">
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

        {/* Gradient overlay — pointer-events-none so upload button stays clickable */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#111118] to-transparent pointer-events-none" />

        {/* Exercise name over image — pointer-events-none, text only */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-5 pointer-events-none">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight leading-tight">{exercise.name}</h2>
            {exercise.notes && (
              <span className="text-xs font-semibold text-white/50 bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-1 mb-0.5 shrink-0 ml-3">
                {exercise.notes}
              </span>
            )}
          </div>
        </div>

        {/* Progress badge — offset to avoid menu button */}
        <AnimatePresence>
          {completedCount > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className={cn(
                "absolute top-3 right-12 text-xs font-bold rounded-full w-9 h-9 flex items-center justify-center shadow-lg z-10",
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

      {/* 3-dot menu — always visible */}
      <div ref={menuRef} className="absolute top-3 right-3 z-10">
        <button
          onClick={() => setShowMenu(v => !v)}
          className={cn(
            "w-8 h-8 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all",
            displayImageUrl
              ? "bg-black/40 border-white/10 text-white/70 hover:text-white hover:bg-black/60"
              : "bg-white/[0.08] border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/12"
          )}
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
              className="absolute top-10 right-0 z-20 bg-[#1a1a26] border border-white/[0.08] rounded-2xl shadow-xl overflow-hidden min-w-[190px]"
            >
              <button
                onClick={openEdit}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left whitespace-nowrap text-white/70 hover:bg-white/[0.06] transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Oefening bewerken
              </button>
              {displayImageUrl && (
                <button
                  onClick={() => { setShowMenu(false); setShowConfirm(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left whitespace-nowrap text-white/50 hover:bg-white/[0.06] transition-colors border-t border-white/[0.05]"
                >
                  <Trash2 className="w-4 h-4" />
                  Afbeelding verwijderen
                </button>
              )}
              {onDeleteExercise && (
                <button
                  onClick={() => { setShowMenu(false); setShowDeleteExerciseConfirm(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left whitespace-nowrap text-rose-400 hover:bg-rose-500/10 transition-colors border-t border-white/[0.05]"
                >
                  <Trash2 className="w-4 h-4" />
                  Oefening verwijderen
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete image confirmation modal */}
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

      {/* Delete exercise confirmation modal */}
      <AnimatePresence>
        {showDeleteExerciseConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
            onClick={() => setShowDeleteExerciseConfirm(false)}
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
              <h3 className="text-base font-bold text-white mb-1.5">Oefening verwijderen?</h3>
              <p className="text-sm text-white/40 leading-relaxed mb-6">
                <span className="text-white/60 font-medium">{exercise.name}</span> wordt permanent verwijderd uit dit schema. Trainingshistorie blijft bewaard.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteExerciseConfirm(false)}
                  className="flex-1 h-11 rounded-2xl bg-white/[0.06] border border-white/[0.06] text-white/60 text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={() => { setShowDeleteExerciseConfirm(false); onDeleteExercise?.(); }}
                  className="flex-1 h-11 rounded-2xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-400 transition-colors shadow-lg shadow-rose-500/20"
                >
                  Verwijderen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit exercise bottom sheet */}
      <AnimatePresence>
        {showEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEdit(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="bg-[#13131e] border border-white/[0.08] border-b-0 rounded-t-3xl w-full max-w-lg p-6 pb-10 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

              <h3 className="text-lg font-bold text-white mb-5">Oefening bewerken</h3>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className={labelClass}>Naam</label>
                  <input
                    type="text"
                    value={editFields.name}
                    onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))}
                    className={inputClass}
                    placeholder="Naam van de oefening"
                  />
                </div>

                {/* Sets / Reps / Tempo / Rust — 2×2 grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Sets</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={editFields.targetSets}
                      onChange={e => setEditFields(f => ({ ...f, targetSets: e.target.value }))}
                      className={inputClass}
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Reps</label>
                    <input
                      type="text"
                      value={editFields.targetReps}
                      onChange={e => setEditFields(f => ({ ...f, targetReps: e.target.value }))}
                      className={inputClass}
                      placeholder="8-12"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Tempo</label>
                    <input
                      type="text"
                      value={editFields.tempo}
                      onChange={e => setEditFields(f => ({ ...f, tempo: e.target.value }))}
                      className={inputClass}
                      placeholder="3-0-1"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Rusttijd</label>
                    <input
                      type="text"
                      value={editFields.rest}
                      onChange={e => setEditFields(f => ({ ...f, rest: e.target.value }))}
                      className={inputClass}
                      placeholder="90 sec"
                    />
                  </div>
                </div>

                {/* Technique note */}
                <div>
                  <label className={labelClass}>Techniek notitie</label>
                  <textarea
                    value={editFields.techniqueNote}
                    onChange={e => setEditFields(f => ({ ...f, techniqueNote: e.target.value }))}
                    placeholder="Bijv. schouderbladen naar beneden, neutrale rug..."
                    rows={2}
                    className={cn(
                      "w-full rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-all resize-none",
                      "bg-[#0a0a12] border border-white/[0.06] text-white",
                      "focus:border-[#c2ff5d]/30 focus:bg-[#0f0f1a]",
                      "placeholder:text-white/15 leading-relaxed"
                    )}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEdit(false)}
                  className="flex-1 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.06] text-white/60 text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 h-12 rounded-2xl bg-[#c2ff5d] text-[#08080f] text-sm font-black hover:bg-[#d4ff72] transition-colors shadow-lg shadow-[#c2ff5d]/20"
                >
                  Opslaan
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
            <div className="w-14 text-center text-[10px] font-bold text-white/20 uppercase tracking-widest">Rust</div>
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
                placeholder={historicalLogs[0]?.sets[index]?.weight.toString() ?? "0"}
                className={cn(
                  "w-full h-12 rounded-xl px-4 text-lg font-semibold outline-none transition-all",
                  "bg-[#0a0a12] border border-white/[0.06]",
                  "focus:border-[#c2ff5d]/30 focus:bg-[#0f0f1a]",
                  "placeholder:text-white/15",
                  set.completed ? "text-[#c2ff5d]" : "text-white"
                )}
              />

              <input
                type="number"
                inputMode="numeric"
                value={set.reps}
                onChange={e => handleSetChange(index, "reps", e.target.value)}
                placeholder={historicalLogs[0]?.sets[index]?.reps.toString() ?? "0"}
                className={cn(
                  "w-full h-12 rounded-xl px-4 text-lg font-semibold outline-none transition-all",
                  "bg-[#0a0a12] border border-white/[0.06]",
                  "focus:border-[#c2ff5d]/30 focus:bg-[#0f0f1a]",
                  "placeholder:text-white/15",
                  set.completed ? "text-[#c2ff5d]" : "text-white"
                )}
              />

              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => onStartRest?.(parseRestSeconds(exercise.rest))}
                className="w-14 h-12 rounded-xl flex items-center justify-center bg-white/[0.06] border border-white/[0.06] text-white/30 hover:bg-white/10 hover:text-white/60 transition-all"
                title="Start rusttimer"
              >
                <Timer className="w-4 h-4" />
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Session note */}
        <div className="pt-1 border-t border-white/[0.05] space-y-2">
          {exercise.lastSessionNote && (
            <div className="flex items-start gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-3.5 py-3">
              <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 text-white/20" />
              <div>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Notities</p>
                <p className="text-sm text-white/35 leading-snug italic">{exercise.lastSessionNote}</p>
              </div>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={note}
              onChange={e => {
                setNote(e.target.value);
                onNoteChange?.(e.target.value);
              }}
              placeholder="Notitie toevoegen..."
              rows={1}
              className="flex-1 bg-[#0a0a12] border border-white/[0.07] text-white/60 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-white/15 resize-none placeholder:text-white/20 leading-relaxed transition-colors"
              style={{ minHeight: "2.75rem" }}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = el.scrollHeight + "px";
              }}
            />
            <AnimatePresence>
              {note.trim() && onSaveNote && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.12 }}
                  onClick={() => {
                    onSaveNote(note.trim());
                    setNote("");
                    onNoteChange?.("");
                  }}
                  className="w-11 h-11 rounded-xl bg-[#c2ff5d] flex items-center justify-center shrink-0 shadow-lg shadow-[#c2ff5d]/20 active:scale-95 transition-transform"
                >
                  <Send className="w-4 h-4 text-[#08080f]" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
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
