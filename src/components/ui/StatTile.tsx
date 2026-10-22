import React from "react";
import { cn } from "@/src/lib/utils";

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  tone?: "accent" | "success" | "warning";
}

const tones = {
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
};

export function StatTile({ icon, label, value, unit, tone = "accent" }: StatTileProps) {
  return (
    <div className="bg-surface rounded-[24px] shadow-card p-4 sm:p-5 min-w-0">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", tones[tone])}>{icon}</div>
      <p className="mt-4 text-2xl sm:text-[28px] font-bold tracking-[-0.03em] text-ink tabular-nums truncate">
        {value}
        {unit && <span className="ml-0.5 text-sm font-semibold text-muted tracking-normal">{unit}</span>}
      </p>
      <p className="mt-0.5 text-[13px] leading-tight font-medium text-muted">{label}</p>
    </div>
  );
}
