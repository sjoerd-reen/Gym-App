import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { CalendarCheck, Flame, History, TrendingUp } from "lucide-react";
import { Page, PageHeader, EmptyState } from "@/src/components/ui/Page";
import { StatTile } from "@/src/components/ui/StatTile";
import { SessionCard } from "@/src/features/history/components/SessionCard";
import { HistorySession, getAllSessions, getStats } from "@/src/features/history/lib/sessions";
import { useRoutines } from "@/src/app/providers/RoutinesProvider";
import { formatMonth, volumeParts } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";

function groupByMonth(sessions: HistorySession[]) {
  const groups: { label: string; items: HistorySession[] }[] = [];
  sessions.forEach(s => {
    const label = s.date ? formatMonth(new Date(s.date)) : "Zonder datum";
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(s);
    else groups.push({ label, items: [s] });
  });
  return groups;
}

export function HistoryPage() {
  const { routines } = useRoutines();
  const [params, setParams] = useSearchParams();
  const filter = params.get("routine");

  const all = useMemo(() => getAllSessions(routines), [routines]);
  const routineOptions = useMemo(
    () => routines.filter(r => all.some(s => s.routineId === r.id)),
    [routines, all]
  );
  const sessions = filter ? all.filter(s => s.routineId === filter) : all;
  const stats = getStats(sessions);
  const groups = groupByMonth(sessions);

  const setFilter = (id: string | null) => {
    if (id) setParams({ routine: id }, { replace: true });
    else setParams({}, { replace: true });
  };

  return (
    <Page>
      <PageHeader eyebrow="Al je trainingen" title="Historie" />

      {routineOptions.length > 1 && (
        <div className="-mx-5 sm:mx-0 px-5 sm:px-0 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <Chip active={!filter} onClick={() => setFilter(null)}>Alles</Chip>
          {routineOptions.map(r => (
            <Chip key={r.id} active={filter === r.id} onClick={() => setFilter(r.id)}>
              {r.workout_name}
            </Chip>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<Flame className="w-[18px] h-[18px]" />} label="Trainingen" value={String(stats.total)} tone="warning" />
        <StatTile icon={<CalendarCheck className="w-[18px] h-[18px]" />} label="Deze week" value={String(stats.thisWeek)} />
        <StatTile icon={<TrendingUp className="w-[18px] h-[18px]" />} label="Volume 30 dagen" {...volumeParts(stats.volume30d)} tone="success" />
      </div>

      {sessions.length === 0 ? (
        <EmptyState icon={<History className="w-6 h-6" />} title="Nog geen trainingen" text="Rond een training af om hem hier terug te zien." />
      ) : (
        groups.map(group => (
          <section key={group.label}>
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{group.label}</h2>
            <div className="space-y-3">
              {group.items.map(s => (
                <SessionCard key={s.key} session={s} showRoutine={!filter} />
              ))}
            </div>
          </section>
        ))
      )}
    </Page>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-10 px-4 rounded-full text-sm font-semibold whitespace-nowrap transition-all shrink-0",
        active ? "bg-ink text-white shadow-soft" : "bg-surface text-ink-2 shadow-soft hover:bg-subtle"
      )}
    >
      {children}
    </button>
  );
}
