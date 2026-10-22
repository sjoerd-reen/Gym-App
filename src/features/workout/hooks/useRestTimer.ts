import { useCallback, useEffect, useState } from "react";
import { useNow } from "@/src/hooks/useNow";

export interface RestTimerState {
  endsAt: number;
  total: number;
}

const DONE_VISIBLE_MS = 3000;

// Counts down to a fixed end time, so it stays correct while the app is backgrounded
export function useRestTimer(initial: RestTimerState | null) {
  const [timer, setTimer] = useState<RestTimerState | null>(() =>
    initial && initial.endsAt > Date.now() ? initial : null
  );
  const now = useNow(250, timer !== null);
  const remainingMs = timer ? timer.endsAt - now : 0;
  const secondsLeft = timer ? Math.max(0, Math.ceil(remainingMs / 1000)) : 0;
  const done = timer !== null && remainingMs <= 0;

  useEffect(() => {
    if (!timer || !done) return;
    if (-remainingMs > DONE_VISIBLE_MS) {
      setTimer(null);
      return;
    }
    navigator.vibrate?.([150, 100, 150]);
    const t = setTimeout(() => setTimer(null), DONE_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback((seconds: number) => {
    setTimer({ endsAt: Date.now() + seconds * 1000, total: seconds });
  }, []);

  const adjust = useCallback((deltaSeconds: number) => {
    setTimer(prev => {
      if (!prev) return prev;
      const endsAt = Math.max(Date.now(), prev.endsAt + deltaSeconds * 1000);
      return { endsAt, total: Math.max(prev.total + deltaSeconds, Math.ceil((endsAt - Date.now()) / 1000), 1) };
    });
  }, []);

  const stop = useCallback(() => setTimer(null), []);

  return { timer, secondsLeft, done, start, adjust, stop };
}
