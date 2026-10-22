import React, { useMemo } from "react";
import { motion } from "motion/react";
import { X, History, MessageSquare } from "lucide-react";
import { Routine, getSessionHistory, formatRelativeDate } from "@/src/lib/storage";

interface SessionHistoryProps {
  routine: Routine;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function SessionHistory({ routine, onClose }: SessionHistoryProps) {
  const sessions = useMemo(() => getSessionHistory(routine), [routine]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#08080f] overflow-y-auto font-sans"
    >
      <header className="sticky top-0 z-10 bg-[#08080f]/90 backdrop-blur-md px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-4 max-w-2xl mx-auto">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/30 font-medium">Trainingshistorie</p>
            <h1 className="text-base font-bold text-white tracking-tight truncate">{routine.workout_name}</h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/[0.06] flex items-center justify-center text-white/50 hover:text-white/80 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 space-y-4 max-w-2xl mx-auto pb-16">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-white/25 pt-20">
            <History className="w-8 h-8" />
            <p className="text-sm font-medium">Nog geen trainingen afgerond</p>
          </div>
        ) : (
          sessions.map((session, i) => (
            <motion.section
              key={session.training}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.03 }}
              className="bg-[#111118] border border-white/[0.07] rounded-3xl p-5"
            >
              <div className="flex items-baseline justify-between gap-3 mb-4">
                <h2 className="text-sm font-bold text-white">
                  {session.date ? formatDate(session.date) : `Training ${session.training}`}
                </h2>
                {session.date && (
                  <span className="text-xs text-white/25 font-medium shrink-0">
                    {formatRelativeDate(new Date(session.date))}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {session.exercises.map((ex, j) => (
                  <div key={j} className="border-t border-white/[0.05] pt-3 first:border-0 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-white/70 min-w-0">{ex.name}</p>
                      <div className="flex flex-wrap justify-end gap-x-3 gap-y-0.5 shrink-0 max-w-[55%]">
                        {ex.sets.map((s, k) => (
                          <span key={k} className="text-xs font-semibold text-white/40 tabular-nums">
                            {s.weight}kg × {s.reps}
                          </span>
                        ))}
                      </div>
                    </div>
                    {ex.note && (
                      <div className="flex items-start gap-2 mt-1.5 text-white/30 text-xs">
                        <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                        <span className="italic leading-relaxed">{ex.note}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.section>
          ))
        )}
      </main>
    </motion.div>
  );
}
