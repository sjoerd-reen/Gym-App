import { useRoutines } from "@/src/app/providers/RoutinesProvider";
import { useRequiredUser } from "@/src/app/providers/UserProvider";
import { Routine, WorkoutDraft, getDraft } from "@/src/lib/storage";

export interface ActiveDraft {
  routine: Routine;
  draft: WorkoutDraft;
  filledSets: number;
}

export function useActiveDrafts(): ActiveDraft[] {
  const user = useRequiredUser();
  const { routines } = useRoutines();
  return routines
    .filter(r => !r.isArchived)
    .map(routine => {
      const draft = getDraft(user, routine.id);
      if (!draft) return null;
      const filledSets = Object.values(draft.sets).reduce(
        (n, list) => n + list.filter(s => s.completed).length,
        0
      );
      return { routine, draft, filledSets };
    })
    .filter((d): d is ActiveDraft => d !== null)
    .sort((a, b) => b.draft.updatedAt - a.draft.updatedAt);
}
