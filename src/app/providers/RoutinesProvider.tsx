import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Routine, User, getRoutines, saveRoutines, syncRoutinesFromCloud } from "@/src/lib/storage";

interface RoutinesContextValue {
  routines: Routine[];
  updateRoutines: (fn: (routines: Routine[]) => Routine[]) => void;
  reload: () => void;
}

const RoutinesContext = createContext<RoutinesContextValue | null>(null);

export function RoutinesProvider({ user, children }: { user: User; children: React.ReactNode }) {
  const [routines, setRoutines] = useState<Routine[]>(() => getRoutines(user));
  const latest = useRef(routines);

  const apply = useCallback((next: Routine[]) => {
    latest.current = next;
    setRoutines(next);
  }, []);

  useEffect(() => {
    let active = true;
    const sync = () => {
      syncRoutinesFromCloud(user).then(cloud => {
        if (active && cloud) apply(cloud);
      });
    };
    sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, apply]);

  const updateRoutines = useCallback(
    (fn: (routines: Routine[]) => Routine[]) => {
      const next = fn(latest.current);
      apply(next);
      saveRoutines(user, next);
    },
    [user, apply]
  );

  const reload = useCallback(() => apply(getRoutines(user)), [user, apply]);

  const value = useMemo(() => ({ routines, updateRoutines, reload }), [routines, updateRoutines, reload]);
  return <RoutinesContext.Provider value={value}>{children}</RoutinesContext.Provider>;
}

export function useRoutines(): RoutinesContextValue {
  const ctx = useContext(RoutinesContext);
  if (!ctx) throw new Error("useRoutines must be used inside RoutinesProvider");
  return ctx;
}
