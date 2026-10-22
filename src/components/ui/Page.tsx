import React from "react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn("space-y-8", className)}
    >
      {children}
    </motion.div>
  );
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, action }: PageHeaderProps) {
  return (
    <header className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-sm font-medium text-muted first-letter:uppercase">{eyebrow}</p>}
        <h1 className="mt-1 text-[32px] leading-[1.1] font-bold tracking-[-0.03em] text-ink">{title}</h1>
      </div>
      {action}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function Card({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-surface rounded-[28px] shadow-card", className)} {...props}>
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <Card className="px-6 py-12 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-accent-soft text-accent flex items-center justify-center mb-4">{icon}</div>
      <p className="text-base font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 text-sm text-muted max-w-xs">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}
