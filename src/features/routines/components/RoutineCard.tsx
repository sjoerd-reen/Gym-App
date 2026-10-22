import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Archive, ArchiveRestore, Clock, Dumbbell, History, MoreHorizontal, Play } from "lucide-react";
import { Routine, activeExercises, formatRelativeDate, getLastTrainedDate, getSessionHistory } from "@/src/lib/storage";
import { cn } from "@/src/lib/utils";

const TINTS = [
  "from-[#3d5afe] to-[#7b8cff]",
  "from-[#12b76a] to-[#5fd9a3]",
  "from-[#f97316] to-[#fdba74]",
  "from-[#8b5cf6] to-[#c4b5fd]",
  "from-[#0ea5e9] to-[#7dd3fc]",
];

export function routineTint(index: number) {
  return TINTS[index % TINTS.length];
}

interface RoutineCardProps {
  routine: Routine;
  index: number;
  inProgress?: boolean;
  onStart: () => void;
  onHistory?: () => void;
  onToggleArchive?: () => void;
}

export function RoutineCard({ routine, index, inProgress, onStart, onHistory, onToggleArchive }: RoutineCardProps) {
  const exerciseCount = activeExercises(routine).length;
  const timesDone = getSessionHistory(routine).length;
  const last = getLastTrainedDate(routine);
  const hasMenu = Boolean(onHistory || onToggleArchive);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative flex items-center gap-3.5 p-4 pr-3 rounded-[28px] bg-surface shadow-card",
        routine.isArchived && "opacity-70"
      )}
    >
      <button onClick={onStart} className="absolute inset-0 rounded-[28px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20" aria-label={`Open ${routine.workout_name}`} tabIndex={-1} />
      <div className={cn(
        "pointer-events-none w-12 h-12 rounded-[18px] bg-gradient-to-br text-white flex items-center justify-center shrink-0",
        routineTint(index),
        routine.isArchived && "grayscale"
      )}>
        <Dumbbell className="w-[22px] h-[22px]" />
      </div>
      <div className="pointer-events-none flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[16px] leading-snug font-semibold tracking-tight text-ink line-clamp-2">{routine.workout_name}</h3>
        </div>
        <p className="mt-0.5 text-sm text-muted">
          <span className="whitespace-nowrap">{exerciseCount} oefeningen</span>
          {" · "}
          <span className="whitespace-nowrap">{timesDone}×</span>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs">
          {inProgress && (
            <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-success-soft font-semibold text-success whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Bezig
            </span>
          )}
          {last && (
            <span className="inline-flex items-center gap-1 text-muted whitespace-nowrap">
              <Clock className="w-3 h-3" />
              {formatRelativeDate(last)}
            </span>
          )}
        </div>
      </div>

      <div className="relative flex items-center gap-0.5 shrink-0">
        {hasMenu && <CardMenu routine={routine} onHistory={onHistory} onToggleArchive={onToggleArchive} />}
        {!routine.isArchived && (
          <button
            onClick={onStart}
            aria-label={inProgress ? `Ga verder met ${routine.workout_name}` : `Start ${routine.workout_name}`}
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-90",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20",
              inProgress ? "bg-success text-white" : "bg-accent-soft text-accent"
            )}
          >
            <Play className="w-[18px] h-[18px] translate-x-px" fill="currentColor" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function CardMenu({ routine, onHistory, onToggleArchive }: Pick<RoutineCardProps, "routine" | "onHistory" | "onToggleArchive">) {
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:bg-subtle hover:text-ink transition-colors"
        aria-label="Meer opties"
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
            className="absolute right-0 top-11 z-30 min-w-[200px] p-1.5 rounded-2xl bg-surface border border-line shadow-float origin-top-right"
          >
            {onHistory && (
              <MenuItem icon={<History className="w-4 h-4" />} onClick={() => { setOpen(false); onHistory(); }}>
                Historie bekijken
              </MenuItem>
            )}
            {onToggleArchive && (
              <MenuItem
                icon={routine.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                onClick={() => { setOpen(false); onToggleArchive(); }}
              >
                {routine.isArchived ? "Terugzetten" : "Archiveren"}
              </MenuItem>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MenuItem({ icon, children, onClick, tone = "default" }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; tone?: "default" | "danger" }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-medium text-left whitespace-nowrap transition-colors",
        tone === "danger" ? "text-danger hover:bg-danger-soft" : "text-ink-2 hover:bg-subtle"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
