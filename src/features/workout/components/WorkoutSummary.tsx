import { motion } from "motion/react";
import { BarChart3, Check, Timer, TrendingDown, TrendingUp, Trophy, Zap } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { StatTile } from "@/src/components/ui/StatTile";
import { formatKg, volumeParts } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";
import { WorkoutSummary as Summary } from "../lib/exercises";

export function WorkoutSummary({ summary, routineName, onDone }: { summary: Summary; routineName: string; onDone: () => void }) {
  const up = (summary.volumeChangePct ?? 0) >= 0;
  return (
    <div className="min-h-dvh bg-canvas relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[480px] rounded-full bg-success/15 blur-[110px]" />
      <div className="relative mx-auto max-w-md px-6 pt-[calc(env(safe-area-inset-top)+64px)] pb-[max(env(safe-area-inset-bottom),32px)] flex flex-col min-h-dvh">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 18, stiffness: 220 }}
          className="text-center"
        >
          <div className="mx-auto w-24 h-24 rounded-full bg-success text-white flex items-center justify-center shadow-[0_18px_40px_-12px_rgb(18_183_106/0.6)]">
            <Check className="w-12 h-12" strokeWidth={3} />
          </div>
          <h1 className="mt-8 text-[36px] font-bold tracking-[-0.035em] text-ink">Goed gedaan!</h1>
          <p className="mt-1 text-base text-muted">{routineName} is opgeslagen</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 grid grid-cols-3 gap-3"
        >
          <StatTile icon={<Timer className="w-[18px] h-[18px]" />} label="Duur" value={`${summary.durationMinutes}m`} />
          <StatTile icon={<BarChart3 className="w-[18px] h-[18px]" />} label="Volume" {...volumeParts(summary.totalVolume)} tone="success" />
          <StatTile icon={<Zap className="w-[18px] h-[18px]" />} label="Sets" value={String(summary.completedSets)} tone="warning" />
        </motion.div>

        {summary.volumeChangePct !== null && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 flex items-center gap-4 p-4 rounded-[24px] bg-surface shadow-card"
          >
            <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center", up ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
              {up ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-[13px] font-medium text-muted">Volume t.o.v. vorige keer</p>
              <p className={cn("text-2xl font-bold tabular-nums", up ? "text-success" : "text-danger")}>
                {up ? "+" : ""}{summary.volumeChangePct}%
              </p>
            </div>
          </motion.div>
        )}

        {summary.prs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 p-5 rounded-[24px] bg-surface shadow-card"
          >
            <p className="flex items-center gap-2 text-sm font-bold text-warning">
              <Trophy className="w-4 h-4" />
              {summary.prs.length === 1 ? "Nieuw persoonlijk record" : `${summary.prs.length} nieuwe records`}
            </p>
            <div className="mt-3 space-y-2.5">
              {summary.prs.map(pr => (
                <div key={pr.name} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-ink-2 truncate">{pr.name}</span>
                  <span className="text-sm font-bold text-ink tabular-nums shrink-0">
                    {formatKg(pr.weight)} kg <span className="text-success font-semibold">+{formatKg(pr.weight - pr.prev)}</span>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="mt-auto pt-10">
          <Button size="lg" block onClick={onDone}>Naar overzicht</Button>
        </div>
      </div>
    </div>
  );
}
