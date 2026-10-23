import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Trophy } from "lucide-react";
import { Sheet } from "@/src/components/ui/Sheet";
import { formatKg, formatShortDate, formatVolume } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";
import type { ExerciseLog } from "../lib/exercises";
import { ProgressMetric, ProgressPoint, buildProgress, niceTicks, topSetOf } from "../lib/progress";

interface ProgressSheetProps {
  open: boolean;
  onClose: () => void;
  exerciseName: string;
  logs: ExerciseLog[];
}

const METRICS: { id: ProgressMetric; label: string }[] = [
  { id: "weight", label: "Zwaarste set" },
  { id: "volume", label: "Volume" },
];

function formatValue(metric: ProgressMetric, v: number): string {
  return metric === "weight" ? `${formatKg(v)} kg` : formatVolume(v);
}

function dateLabel(log: ExerciseLog): string {
  return log.date ? formatShortDate(new Date(log.date)) : `Training ${log.training}`;
}

export function ProgressSheet({ open, onClose, exerciseName, logs }: ProgressSheetProps) {
  const [metric, setMetric] = useState<ProgressMetric>("weight");
  const points = useMemo(() => buildProgress(logs, metric), [logs, metric]);
  const weightRecords = useMemo(() => new Set(buildProgress(logs, "weight").filter(p => p.isRecord).map(p => p.log)), [logs]);

  const best = logs.length ? topSetOf(logs.map(l => topSetOf(l.sets))) : null;
  const tops = [...logs].reverse().map(l => topSetOf(l.sets).weight);
  const gain = tops.length >= 2 ? tops[tops.length - 1] - tops[0] : null;

  return (
    <Sheet open={open} onClose={onClose} title={exerciseName} description="Progressie over al je trainingen" size="lg">
      {logs.length === 0 ? (
        <p className="py-10 text-center text-muted">Nog geen trainingen met deze oefening.</p>
      ) : (
        <div className="space-y-6 pb-2">
          <div className="grid grid-cols-3 gap-2.5">
            <Figure label="Beste set" value={best ? `${formatKg(best.weight)} kg` : "–"} sub={best ? `× ${best.reps} reps` : undefined} />
            <Figure
              label="Groei"
              value={gain === null ? "–" : `${gain > 0 ? "+" : ""}${formatKg(gain)} kg`}
              sub={gain === null ? "na 2 trainingen" : "zwaarste set"}
            />
            <Figure label="Trainingen" value={String(logs.length)} />
          </div>

          <div>
            <div role="tablist" aria-label="Wat wil je zien" className="inline-flex p-1 rounded-full bg-subtle">
              {METRICS.map(m => (
                <button
                  key={m.id}
                  role="tab"
                  aria-selected={metric === m.id}
                  onClick={() => setMetric(m.id)}
                  className={cn(
                    "h-8 px-3.5 rounded-full text-[13px] font-semibold transition-colors",
                    metric === m.id ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink-2"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <ProgressChart points={points} metric={metric} />
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-warning" aria-hidden />
              Persoonlijk record
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Alle trainingen</h3>
            <ul className="divide-y divide-line">
              {logs.map((log, i) => (
                <li key={i} className="py-3 flex items-start gap-3">
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-semibold text-ink">{dateLabel(log)}</p>
                    <p className="text-xs text-muted truncate" title={log.routineName}>{log.routineName}</p>
                  </div>
                  <div className="flex-1 flex flex-wrap gap-1.5 justify-end">
                    {weightRecords.has(log) && (
                      <span className="inline-flex items-center gap-1 h-6 px-2 rounded-lg bg-warning-soft text-[11px] font-semibold text-[#92580a]">
                        <Trophy className="w-3 h-3" /> Record
                      </span>
                    )}
                    {log.sets.map((s, k) => (
                      <span key={k} className="h-6 px-2 rounded-lg bg-subtle text-xs font-semibold text-ink-2 tabular-nums inline-flex items-center">
                        {formatKg(s.weight)} × {s.reps}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function Figure({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-subtle px-3 py-3 min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted truncate">{label}</p>
      <p className="mt-1 text-lg font-bold tracking-tight text-ink truncate">{value}</p>
      {sub && <p className="text-xs text-muted truncate">{sub}</p>}
    </div>
  );
}

const HEIGHT = 190;
const PAD = { top: 28, right: 18, bottom: 26, left: 40 };

function ProgressChart({ points, metric }: { points: ProgressPoint[]; metric: ProgressMetric }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [active, setActive] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const values = points.map(p => p.value);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = points.length > 1
    ? `${line} L${x(points.length - 1).toFixed(1)},${PAD.top + innerH} L${x(0).toFixed(1)},${PAD.top + innerH} Z`
    : "";
  const lastIndex = points.length - 1;
  const shown = active;
  const focus = active ?? lastIndex;
  const readout = points[focus];

  const pick = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || points.length === 0) return;
    const rel = clientX - rect.left - PAD.left;
    const i = points.length === 1 ? 0 : Math.round((rel / innerW) * (points.length - 1));
    setActive(Math.min(lastIndex, Math.max(0, i)));
  };

  return (
    <div className="mt-4">
      <div className="min-h-11" aria-live="polite">
        <p className="flex items-center gap-2 text-xl font-bold tracking-tight text-ink">
          {formatValue(metric, readout.value)}
          {readout.isRecord && (
            <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-md bg-warning-soft text-[11px] font-semibold text-[#92580a]">
              <Trophy className="w-3 h-3" /> Record
            </span>
          )}
        </p>
        <p className="text-xs text-muted">
          {dateLabel(readout.log)} · {formatKg(readout.topSet.weight)} kg × {readout.topSet.reps}
          {active === null && points.length > 1 ? " · tik op de grafiek voor eerdere trainingen" : ""}
        </p>
      </div>
    <div ref={wrapRef} className="relative mt-1 select-none touch-pan-y">
      <svg
        width={width}
        height={HEIGHT}
        className="block"
        onPointerMove={e => pick(e.clientX)}
        onPointerDown={e => pick(e.clientX)}
        onPointerLeave={e => e.pointerType === "mouse" && setActive(null)}
        role="img"
        aria-label={`Grafiek ${metric === "weight" ? "zwaarste set" : "volume"} per training`}
      >
        <defs>
          <linearGradient id="progress-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map(t => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
              {metric === "weight" ? formatKg(t) : t >= 1000 ? `${formatKg(t / 1000)}t` : formatKg(t)}
            </text>
          </g>
        ))}

        <text x={x(0)} y={HEIGHT - 6} textAnchor={points.length === 1 ? "middle" : "start"} className="fill-muted text-[11px]">
          {dateLabel(points[0].log)}
        </text>
        {points.length > 1 && (
          <text x={x(lastIndex)} y={HEIGHT - 6} textAnchor="end" className="fill-muted text-[11px]">
            {dateLabel(points[lastIndex].log)}
          </text>
        )}

        {area && <path d={area} fill="url(#progress-area)" />}
        {points.length > 1 && (
          <path d={line} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}

        {shown !== null && (
          <line x1={x(shown)} x2={x(shown)} y1={PAD.top - 6} y2={PAD.top + innerH} stroke="var(--color-ink-2)" strokeOpacity={0.25} strokeWidth={1} />
        )}

        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.value)}
            r={i === focus ? 6 : p.isRecord ? 5 : 4}
            fill={p.isRecord ? "var(--color-warning)" : "var(--color-accent)"}
            stroke="var(--color-surface)"
            strokeWidth={2}
          />
        ))}

      </svg>

      {points.length === 1 && (
        <p className="mt-1 text-xs text-muted text-center">Na je volgende training zie je hier je lijn.</p>
      )}
    </div>
    </div>
  );
}
