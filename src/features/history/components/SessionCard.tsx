import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, MessageSquareText } from "lucide-react";
import { HistorySession } from "../lib/sessions";
import { formatKg, formatShortDate, formatVolume } from "@/src/lib/format";
import { formatRelativeDate } from "@/src/lib/storage";
import { cn } from "@/src/lib/utils";

export function SessionCard({ session, defaultOpen = false, showRoutine = true }: { session: HistorySession; defaultOpen?: boolean; showRoutine?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const date = session.date ? new Date(session.date) : null;

  return (
    <div className="bg-surface rounded-[28px] shadow-card overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 p-5 text-left focus-visible:outline-none"
        aria-expanded={open}
      >
        <div className="w-12 h-12 rounded-2xl bg-subtle flex flex-col items-center justify-center shrink-0">
          {date ? (
            <>
              <span className="text-[10px] font-semibold uppercase text-muted leading-none">
                {date.toLocaleDateString("nl-NL", { month: "short" }).replace(".", "")}
              </span>
              <span className="text-lg font-bold text-ink leading-tight tabular-nums">{date.getDate()}</span>
            </>
          ) : (
            <span className="text-sm font-bold text-ink">#{session.training}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold tracking-tight text-ink truncate">
            {showRoutine ? session.routineName : date ? formatShortDate(date) : `Training ${session.training}`}
          </p>
          <p className="mt-0.5 text-sm text-muted truncate">
            {date ? formatRelativeDate(date) : `Training ${session.training}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[15px] font-semibold text-ink tabular-nums">{formatVolume(session.volume)}</p>
          <p className="text-xs text-muted">{session.totalSets} sets</p>
        </div>
        <ChevronDown className={cn("w-5 h-5 text-muted shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              <div className="rounded-2xl bg-subtle/70 divide-y divide-line">
                {session.exercises.map((ex, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-ink min-w-0">{ex.name}</p>
                      <div className="flex flex-wrap justify-end gap-1.5 shrink-0 max-w-[58%]">
                        {ex.sets.map((s, k) => (
                          <span key={k} className="px-2 py-0.5 rounded-lg bg-surface text-xs font-semibold text-ink-2 tabular-nums">
                            {formatKg(s.weight)} × {s.reps}
                          </span>
                        ))}
                      </div>
                    </div>
                    {ex.note && (
                      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted leading-relaxed">
                        <MessageSquareText className="w-3.5 h-3.5 mt-px shrink-0" />
                        {ex.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
