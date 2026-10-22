import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, CalendarCheck, Dumbbell, Flame, LogOut, TrendingUp } from "lucide-react";
import { Page, PageHeader, SectionTitle, EmptyState } from "@/src/components/ui/Page";
import { StatTile } from "@/src/components/ui/StatTile";
import { IconButton } from "@/src/components/ui/Button";
import { RoutineCard } from "@/src/features/routines/components/RoutineCard";
import { SessionCard } from "@/src/features/history/components/SessionCard";
import { getAllSessions, getStats } from "@/src/features/history/lib/sessions";
import { useRoutines } from "@/src/app/providers/RoutinesProvider";
import { useRequiredUser, useUser } from "@/src/app/providers/UserProvider";
import { useActiveDrafts } from "@/src/hooks/useActiveDrafts";
import { activeExercises } from "@/src/lib/storage";
import { formatLongDate, greeting, volumeParts } from "@/src/lib/format";

export function DashboardPage() {
  const user = useRequiredUser();
  const { logout } = useUser();
  const { routines } = useRoutines();
  const navigate = useNavigate();
  const drafts = useActiveDrafts();

  const sessions = useMemo(() => getAllSessions(routines), [routines]);
  const stats = useMemo(() => getStats(sessions), [sessions]);
  const active = routines.filter(r => !r.isArchived);
  const draftIds = new Set(drafts.map(d => d.routine.id));

  return (
    <Page>
      <PageHeader
        eyebrow={formatLongDate(new Date())}
        title={`${greeting()}, ${user}`}
        action={
          <IconButton label="Wissel van gebruiker" tone="surface" onClick={logout} className="lg:hidden">
            <LogOut className="w-[18px] h-[18px]" />
          </IconButton>
        }
      />

      {drafts.map(({ routine, filledSets }) => {
        const total = activeExercises(routine).reduce((n: number, ex: any) => n + (parseInt(ex.sets_target || "3") || 3), 0);
        return (
          <motion.button
            key={routine.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => navigate(`/workout/${encodeURIComponent(routine.id)}`)}
            className="w-full text-left relative overflow-hidden rounded-[28px] bg-accent text-white p-5 shadow-accent"
          >
            <div className="pointer-events-none absolute -right-10 -top-16 w-48 h-48 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute right-16 -bottom-20 w-40 h-40 rounded-full bg-white/10" />
            <div className="relative flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-white/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Training bezig
                </p>
                <p className="mt-1.5 text-xl font-bold tracking-tight truncate">{routine.workout_name}</p>
                <p className="mt-0.5 text-sm text-white/75">{filledSets} van {total} sets ingevuld</p>
              </div>
              <span className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-white text-accent text-sm font-semibold shrink-0">
                Doorgaan <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </motion.button>
        );
      })}

      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<CalendarCheck className="w-[18px] h-[18px]" />} label="Deze week" value={String(stats.thisWeek)} />
        <StatTile icon={<Flame className="w-[18px] h-[18px]" />} label="Trainingen" value={String(stats.total)} tone="warning" />
        <StatTile icon={<TrendingUp className="w-[18px] h-[18px]" />} label="Volume 30 dagen" {...volumeParts(stats.volume30d)} tone="success" />
      </div>

      <section>
        <SectionTitle action={<Link to="/workout" className="text-sm font-semibold text-accent">Alles</Link>}>
          Snel starten
        </SectionTitle>
        {active.length === 0 ? (
          <EmptyState icon={<Dumbbell className="w-6 h-6" />} title="Nog geen routines" text="Maak je eerste routine aan bij Trainen." />
        ) : (
          <div className="space-y-3">
            {active.map(routine => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                index={routines.indexOf(routine)}
                inProgress={draftIds.has(routine.id)}
                onStart={() => navigate(`/workout/${encodeURIComponent(routine.id)}`)}
              />
            ))}
          </div>
        )}
      </section>

      {sessions.length > 0 && (
        <section>
          <SectionTitle action={<Link to="/history" className="text-sm font-semibold text-accent">Bekijk alles</Link>}>
            Recente trainingen
          </SectionTitle>
          <div className="space-y-3">
            {sessions.slice(0, 3).map(s => (
              <SessionCard key={s.key} session={s} />
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}
