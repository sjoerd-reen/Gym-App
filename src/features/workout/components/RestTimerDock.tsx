import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "lucide-react";
import { formatClock } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";
import type { RestTimerState } from "../hooks/useRestTimer";

interface RestTimerDockProps {
  timer: RestTimerState | null;
  secondsLeft: number;
  done: boolean;
  onAdjust: (delta: number) => void;
  onStop: () => void;
}

const R = 22;
const CIRC = 2 * Math.PI * R;

export function RestTimerDock({ timer, secondsLeft, done, onAdjust, onStop }: RestTimerDockProps) {
  const progress = timer ? Math.min(1, secondsLeft / Math.max(1, timer.total)) : 0;

  return (
    <AnimatePresence>
      {timer && (
        <motion.div
          initial={{ y: 24, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
          className={cn(
            "flex items-center gap-3 p-2.5 pr-3 rounded-[26px] shadow-float border transition-colors",
            done ? "bg-success border-success text-white" : "bg-ink border-ink text-white"
          )}
          role="timer"
          aria-live="polite"
        >
          <div className="relative w-14 h-14 shrink-0">
            <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
              <circle cx="28" cy="28" r={R} fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="4" />
              <circle
                cx="28" cy="28" r={R} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - progress)}
                style={{ transition: "stroke-dashoffset 0.25s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {done ? <Check className="w-5 h-5" strokeWidth={3} /> : <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">Rust</span>}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[28px] leading-none font-bold tabular-nums tracking-tight">
              {done ? "Klaar!" : formatClock(secondsLeft)}
            </p>
            <p className="mt-1 text-xs font-medium opacity-60">{done ? "Tijd voor je volgende set" : "Rusttimer"}</p>
          </div>
          {!done && (
            <>
              <DockButton onClick={() => onAdjust(-15)} label="15 seconden minder">−15</DockButton>
              <DockButton onClick={() => onAdjust(15)} label="15 seconden meer">+15</DockButton>
            </>
          )}
          <DockButton onClick={onStop} label="Timer stoppen">
            <X className="w-[18px] h-[18px]" />
          </DockButton>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="h-11 min-w-11 px-2.5 rounded-2xl bg-white/12 hover:bg-white/20 text-sm font-semibold tabular-nums flex items-center justify-center active:scale-95 transition-all"
    >
      {children}
    </button>
  );
}
