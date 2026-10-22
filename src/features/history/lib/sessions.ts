import { Routine, PastSession, getSessionHistory } from "@/src/lib/storage";

export interface HistorySession extends PastSession {
  key: string;
  routineId: string;
  routineName: string;
  totalSets: number;
  volume: number;
}

export function getAllSessions(routines: Routine[]): HistorySession[] {
  return routines
    .flatMap(routine =>
      getSessionHistory(routine).map(session => ({
        ...session,
        key: `${routine.id}-${session.training}`,
        routineId: routine.id,
        routineName: routine.workout_name,
        totalSets: session.exercises.reduce((n, ex) => n + ex.sets.length, 0),
        volume: session.exercises.reduce(
          (sum, ex) => sum + ex.sets.reduce((s, set) => s + set.weight * set.reps, 0),
          0
        ),
      }))
    )
    .sort((a, b) => {
      if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (a.date) return -1;
      if (b.date) return 1;
      return b.training - a.training;
    });
}

function startOfWeek(now: Date): Date {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

export function getStats(sessions: HistorySession[], now = new Date()) {
  const weekStart = startOfWeek(now).getTime();
  const monthAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const dated = sessions.filter(s => s.date);
  return {
    total: sessions.length,
    thisWeek: dated.filter(s => new Date(s.date!).getTime() >= weekStart).length,
    volume30d: dated
      .filter(s => new Date(s.date!).getTime() >= monthAgo)
      .reduce((sum, s) => sum + s.volume, 0),
  };
}
