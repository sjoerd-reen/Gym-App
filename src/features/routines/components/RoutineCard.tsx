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
        "relative flex items-center gap-4 p-4 rounded-[28px] bg-surface shadow-card",
        routine.isArchived && "opacity-70"
      )}
    >
      <button onClick={onStart} className="absolute inset-0 rounded-[28px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20" aria-label={`Start ${routine.workout_name}`} />
      <div className={cn(
        "pointer-events-none w-14 h-14 rounded-[20px] bg-gradient-to-br text-white flex items-center justify-center shrink-0",
        routineTint(index),
        routine.isArchived && "grayscale"
      )}>
        <Dumbbell className="w-6 h-6" />
      </div>
      <div className="pointer-events-none flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[16px] leading-snug font-semibold tracking-tight text-ink line-clamp-2">{routine.workout_name}</h3>
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {exerciseCount} oefeningen · {timesDone}×
        </p>
        <div className="mt-1.5 flex items-center gap-2 text-xs">
          {inProgress && (
            <span className="inline-flex items-center gap-1 font-semibold text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Bezig
            </span>
          )}
          {last && (
            <span className="inline-flex items-center gap-1 text-muted">
              <Clock className="w-3 h-3" />
              {formatRelativeDate(last)}
            </span>
          )}
        </div>
      </div>

      <div className="relative flex items-center gap-1">
        {hasMenu && <CardMenu routine={routine} onHistory={onHistory} onToggleArchive={onToggleArchive} />}
        {!routine.isArchived && (
          <span className={cn(
            "pointer-events-none w-11 h-11 rounded-full flex items-center justify-center",
            inProgress ? "bg-success text-white" : "bg-accent-soft text-accent"
          )}>
            <Play className="w-[18px] h-[18px] translate-x-px" fill="currentColor" />
          </span>
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
        className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:bg-subtle hover:text-ink transition-colors"
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
