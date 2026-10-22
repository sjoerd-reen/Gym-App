import React, { memo, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Camera, Check, ImageOff, Lightbulb, MessageSquareText, MoreHorizontal, Pencil, SendHorizontal,
  Timer, Trash2,
} from "lucide-react";
import { NumberField } from "@/src/components/ui/NumberField";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { MenuItem } from "@/src/features/routines/components/RoutineCard";
import { useResolvedImage } from "@/src/hooks/useResolvedImage";
import { formatClock, formatKg } from "@/src/lib/format";
import { formatRelativeDate } from "@/src/lib/storage";
import { cn } from "@/src/lib/utils";
import { ExerciseLog, SessionExercise, SetEntry } from "../lib/exercises";
import { EditExerciseSheet } from "./EditExerciseSheet";
import type { ExerciseEdits } from "../hooks/useWorkoutSession";

interface ExerciseCardProps {
  exercise: SessionExercise;
  position: number;
  count: number;
  sets: SetEntry[];
  logs: ExerciseLog[];
  note: string;
  onSetChange: (index: number, field: "weight" | "reps", value: string) => void;
  onPrefill: (index: number) => void;
  onStartRest: (seconds: number) => void;
  onNoteChange: (note: string) => void;
  onSaveNote: (note: string) => void;
  onEdit: (edits: ExerciseEdits) => void;
  onDelete: () => void;
  onDeleteImage: () => void;
  onUploadImage: (file: File) => Promise<void>;
}

export const ExerciseCard = memo(function ExerciseCard(props: ExerciseCardProps) {
  const { exercise, position, count, sets, logs, note } = props;
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<"exercise" | "image" | null>(null);
  const last = logs[0];
  const done = sets.filter(s => s.completed).length;
  const allDone = done === exercise.targetSets;

  return (
    <article className="relative bg-surface rounded-[32px] shadow-card">
      <ExerciseMedia
        exercise={exercise}
        position={position}
        count={count}
        onUploadImage={props.onUploadImage}
      />

      <ExerciseMenu
        hasImage={Boolean(exercise.imageUrl)}
        onEdit={() => setEditing(true)}
        onDeleteImage={() => setConfirm("image")}
        onDelete={() => setConfirm("exercise")}
      />

      <div className="px-5 sm:px-6 pb-6 pt-5">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">{exercise.name}</h3>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Meta>{exercise.targetSets} × {exercise.targetReps}</Meta>
              <Meta icon={<Timer className="w-3.5 h-3.5" />}>{formatClock(exercise.restSeconds)}</Meta>
              {exercise.tempo !== "-" && <Meta>Tempo {exercise.tempo}</Meta>}
              {exercise.badge && <Meta>{exercise.badge}</Meta>}
            </div>
          </div>
          <motion.div
            key={allDone ? "done" : "progress"}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "h-9 min-w-9 px-2.5 rounded-full text-sm font-bold flex items-center justify-center tabular-nums shrink-0",
              allDone ? "bg-success text-white" : done > 0 ? "bg-accent-soft text-accent" : "bg-subtle text-muted"
            )}
          >
            {allDone ? <Check className="w-4 h-4" strokeWidth={3} /> : `${done}/${exercise.targetSets}`}
          </motion.div>
        </div>

        {exercise.techniqueNote && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-warning-soft px-3.5 py-3">
            <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
            <p className="text-sm leading-snug text-[#92580a]">{exercise.techniqueNote}</p>
          </div>
        )}

        {last && (
          <div className="mt-4 flex items-center gap-3 overflow-x-auto no-scrollbar">
            <span className="text-xs font-semibold text-muted shrink-0">
              Vorige keer{last.date ? ` · ${formatRelativeDate(new Date(last.date)).toLowerCase()}` : ""}
            </span>
            <div className="flex gap-1.5">
              {last.sets.map((s, i) => (
                <span key={i} className="px-2 py-1 rounded-lg bg-subtle text-xs font-semibold text-ink-2 tabular-nums whitespace-nowrap">
                  {formatKg(s.weight)} × {s.reps}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5">
          <div className="grid grid-cols-[44px_1fr_1fr_48px] gap-2.5 px-0.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            <span className="text-center">Set</span>
            <span className="text-center">Kg</span>
            <span className="text-center">Reps</span>
            <span className="text-center">Rust</span>
          </div>
          <div className="space-y-2">
            {sets.map((set, i) => (
              <SetRow
                key={i}
                index={i}
                set={set}
                previous={last?.sets[i]}
                onChange={props.onSetChange}
                onPrefill={props.onPrefill}
                onRest={() => props.onStartRest(exercise.restSeconds)}
              />
            ))}
          </div>
        </div>

        <NoteBox
          latest={exercise.latestNote}
          value={note}
          onChange={props.onNoteChange}
          onSave={props.onSaveNote}
        />
      </div>

      <EditExerciseSheet
        open={editing}
        exercise={exercise}
        onClose={() => setEditing(false)}
        onSave={edits => {
          props.onEdit(edits);
          setEditing(false);
        }}
      />

      <ConfirmDialog
        open={confirm === "exercise"}
        title="Oefening verwijderen?"
        description={<><b className="text-ink">{exercise.name}</b> verdwijnt uit deze routine. Je eerdere sets blijven zichtbaar in de historie.</>}
        confirmLabel="Verwijderen"
        tone="danger"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          props.onDelete();
        }}
      />
      <ConfirmDialog
        open={confirm === "image"}
        title="Afbeelding verwijderen?"
        description={<>De afbeelding van <b className="text-ink">{exercise.name}</b> wordt verwijderd.</>}
        confirmLabel="Verwijderen"
        tone="danger"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          props.onDeleteImage();
        }}
      />
    </article>
  );
});

function Meta({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-subtle text-xs font-semibold text-ink-2 tabular-nums">
      {icon}
      {children}
    </span>
  );
}

function ExerciseMedia({ exercise, position, count, onUploadImage }: Pick<ExerciseCardProps, "exercise" | "position" | "count" | "onUploadImage">) {
  const src = useResolvedImage(exercise.imageUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);
  const isIllustration = Boolean(src?.startsWith("https://pump-app"));

  useEffect(() => setFailed(false), [src]);

  return (
    <div className="relative aspect-[16/10] rounded-t-[32px] overflow-hidden bg-white border-b border-line/70">
      {src && !failed ? (
        <img
          src={src}
          alt={exercise.name}
          onError={() => setFailed(true)}
          className={cn("w-full h-full", isIllustration ? "object-contain p-5" : "object-cover")}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-subtle/60">
          <div className="w-14 h-14 rounded-2xl bg-surface shadow-soft flex items-center justify-center text-muted">
            {failed ? <ImageOff className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="h-9 px-4 rounded-full bg-surface shadow-soft text-sm font-semibold text-ink-2 hover:text-accent transition-colors disabled:opacity-50"
          >
            {uploading ? "Uploaden…" : "Foto toevoegen"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async e => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setUploading(true);
              try {
                await onUploadImage(file);
              } catch (err) {
                console.error("Upload failed", err);
              } finally {
                setUploading(false);
              }
            }}
          />
        </div>
      )}
      <span className="absolute left-4 top-4 h-7 px-2.5 rounded-full bg-surface/90 backdrop-blur text-xs font-semibold text-ink-2 shadow-soft inline-flex items-center tabular-nums">
        {position} / {count}
      </span>
    </div>
  );
}

function ExerciseMenu({ hasImage, onEdit, onDeleteImage, onDelete }: { hasImage: boolean; onEdit: () => void; onDeleteImage: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={ref} className="absolute right-4 top-4 z-20">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-9 h-9 rounded-full bg-surface/90 backdrop-blur shadow-soft text-ink-2 flex items-center justify-center hover:text-ink transition-colors"
        aria-label="Oefening opties"
        aria-expanded={open}
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-11 min-w-[220px] p-1.5 rounded-2xl bg-surface border border-line shadow-float origin-top-right"
          >
            <MenuItem icon={<Pencil className="w-4 h-4" />} onClick={pick(onEdit)}>Oefening bewerken</MenuItem>
            {hasImage && (
              <MenuItem icon={<ImageOff className="w-4 h-4" />} onClick={pick(onDeleteImage)}>Afbeelding verwijderen</MenuItem>
            )}
            <div className="my-1 h-px bg-line" />
            <MenuItem icon={<Trash2 className="w-4 h-4" />} tone="danger" onClick={pick(onDelete)}>Oefening verwijderen</MenuItem>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SetRowProps {
  index: number;
  set: SetEntry;
  previous?: { weight: number; reps: number };
  onChange: (index: number, field: "weight" | "reps", value: string) => void;
  onPrefill: (index: number) => void;
  onRest: () => void;
}

const SetRow = memo(function SetRow({ index, set, previous, onChange, onPrefill, onRest }: SetRowProps) {
  const state = set.completed ? "done" : "default";
  return (
    <div className="grid grid-cols-[44px_1fr_1fr_48px] gap-2.5 items-center">
      <button
        onClick={() => onPrefill(index)}
        className={cn(
          "h-14 rounded-2xl text-[15px] font-bold tabular-nums flex items-center justify-center transition-colors",
          set.completed ? "bg-success text-white" : "bg-subtle text-ink-2 hover:bg-line"
        )}
        aria-label={previous ? `Set ${index + 1}: vul vorige waarden in` : `Set ${index + 1}`}
        title={previous ? "Vul vorige keer in" : undefined}
      >
        {set.completed ? <Check className="w-[18px] h-[18px]" strokeWidth={3} /> : index + 1}
      </button>
      <NumberField
        label={`Set ${index + 1} gewicht in kg`}
        mode="decimal"
        value={set.weight}
        placeholder={previous ? formatKg(previous.weight) : "0"}
        onValueChange={v => onChange(index, "weight", v)}
        state={state}
      />
      <NumberField
        label={`Set ${index + 1} herhalingen`}
        mode="integer"
        value={set.reps}
        placeholder={previous ? String(previous.reps) : "0"}
        onValueChange={v => onChange(index, "reps", v)}
        state={state}
      />
      <button
        onClick={onRest}
        className="h-14 rounded-2xl bg-subtle text-ink-2 flex items-center justify-center hover:bg-accent-soft hover:text-accent active:scale-95 transition-all"
        aria-label="Start rusttimer"
        title="Start rusttimer"
      >
        <Timer className="w-5 h-5" />
      </button>
    </div>
  );
});

function NoteBox({ latest, value, onChange, onSave }: { latest?: string; value: string; onChange: (v: string) => void; onSave: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const canSave = value.trim() !== "";

  return (
    <div className="mt-5 pt-5 border-t border-line space-y-3">
      {latest && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-subtle px-3.5 py-3">
          <MessageSquareText className="w-4 h-4 mt-0.5 shrink-0 text-muted" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Notities</p>
            <p className="mt-0.5 text-sm text-ink-2 leading-snug">{latest}</p>
          </div>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Notitie toevoegen…"
          className="flex-1 min-h-12 max-h-40 resize-none rounded-2xl bg-subtle border border-transparent px-4 py-3 text-[16px] leading-snug text-ink placeholder:text-muted/60 outline-none transition-all focus:bg-surface focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
        <AnimatePresence>
          {canSave && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.12 }}
              onClick={() => onSave(value.trim())}
              className="w-12 h-12 rounded-2xl bg-accent text-white shadow-accent flex items-center justify-center shrink-0 active:scale-95 transition-transform"
              aria-label="Notitie opslaan"
            >
              <SendHorizontal className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
