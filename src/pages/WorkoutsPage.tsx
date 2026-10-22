import { useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence } from "motion/react";
import { ChevronDown, Dumbbell, Plus } from "lucide-react";
import { Page, PageHeader, SectionTitle, EmptyState } from "@/src/components/ui/Page";
import { Button } from "@/src/components/ui/Button";
import { RoutineCard } from "@/src/features/routines/components/RoutineCard";
import { CreateRoutineSheet } from "@/src/features/routines/components/CreateRoutineSheet";
import { useRoutines } from "@/src/app/providers/RoutinesProvider";
import { useActiveDrafts } from "@/src/hooks/useActiveDrafts";
import { cn } from "@/src/lib/utils";

export function WorkoutsPage() {
  const { routines, updateRoutines } = useRoutines();
  const navigate = useNavigate();
  const drafts = useActiveDrafts();
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const draftIds = new Set(drafts.map(d => d.routine.id));
  const active = routines.filter(r => !r.isArchived);
  const archived = routines.filter(r => r.isArchived);
  const toggleArchive = (id: string) =>
    updateRoutines(all => all.map(r => (r.id === id ? { ...r, isArchived: !r.isArchived } : r)));
  const start = (id: string) => navigate(`/workout/${encodeURIComponent(id)}`);
  const history = (id: string) => navigate(`/history?routine=${encodeURIComponent(id)}`);

  return (
    <Page>
      <PageHeader
        eyebrow={`${active.length} routines`}
        title="Trainen"
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4" />
            Nieuw
          </Button>
        }
      />

      <section>
        <SectionTitle>Jouw routines</SectionTitle>
        {active.length === 0 ? (
          <EmptyState
            icon={<Dumbbell className="w-6 h-6" />}
            title="Nog geen routines"
            text="Stel een routine samen met je vaste oefeningen."
            action={<Button onClick={() => setCreating(true)}>Routine maken</Button>}
          />
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {active.map(routine => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  index={routines.indexOf(routine)}
                  inProgress={draftIds.has(routine.id)}
                  onStart={() => start(routine.id)}
                  onHistory={() => history(routine.id)}
                  onToggleArchive={() => toggleArchive(routine.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {archived.length > 0 && (
        <section>
          <button
            onClick={() => setShowArchived(v => !v)}
            className="flex items-center gap-2 mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted hover:text-ink-2 transition-colors"
            aria-expanded={showArchived}
          >
            Archief ({archived.length})
            <ChevronDown className={cn("w-4 h-4 transition-transform", showArchived && "rotate-180")} />
          </button>
          {showArchived && (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {archived.map(routine => (
                  <RoutineCard
                    key={routine.id}
                    routine={routine}
                    index={routines.indexOf(routine)}
                    onStart={() => history(routine.id)}
                    onHistory={() => history(routine.id)}
                    onToggleArchive={() => toggleArchive(routine.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      )}

      <CreateRoutineSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={routine => updateRoutines(all => [...all, routine])}
      />
    </Page>
  );
}
