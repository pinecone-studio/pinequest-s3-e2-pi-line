"use client";

import { startTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type UseActionRefreshLoopOptions = {
  active: boolean;
  intervalMs?: number;
  intervalsMs?: number[];
  label: string;
  onTick?: (() => Promise<unknown> | void) | null;
  pauseWhenHidden?: boolean;
  refreshAfterTick?: boolean;
  refreshOnVisibilityRestore?: boolean;
  runImmediately?: boolean;
};

export function useActionRefreshLoop({
  active,
  intervalMs = 6000,
  intervalsMs,
  label,
  onTick,
  pauseWhenHidden = false,
  refreshAfterTick = true,
  refreshOnVisibilityRestore = true,
  runImmediately = true,
}: UseActionRefreshLoopOptions) {
  const router = useRouter();
  const inFlightRef = useRef(false);
  const tickCountRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    tickCountRef.current = 0;
    if (!active) {
      return;
    }

    let cancelled = false;

    const clearTimer = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const getNextDelay = () => {
      if (!intervalsMs || intervalsMs.length === 0) {
        return intervalMs;
      }

      const safeIndex = Math.min(tickCountRef.current, intervalsMs.length - 1);
      return intervalsMs[safeIndex] ?? intervalMs;
    };

    const scheduleNext = (delayMs: number) => {
      clearTimer();
      if (cancelled) {
        return;
      }
      if (pauseWhenHidden && document.hidden) {
        return;
      }

      timeoutRef.current = window.setTimeout(() => {
        startTransition(() => {
          void runTick();
        });
      }, delayMs);
    };

    const runTick = async () => {
      if (cancelled || inFlightRef.current) {
        scheduleNext(getNextDelay());
        return;
      }
      if (pauseWhenHidden && document.hidden) {
        scheduleNext(getNextDelay());
        return;
      }

      inFlightRef.current = true;

      try {
        await onTickRef.current?.();
      } catch (error) {
        console.warn(`[${label}] refresh loop failed`, error);
      } finally {
        inFlightRef.current = false;
      }

      if (!cancelled && refreshAfterTick) {
        router.refresh();
      }

      tickCountRef.current += 1;
      scheduleNext(getNextDelay());
    };

    const handleVisibilityChange = () => {
      if (!pauseWhenHidden || cancelled || document.hidden || !active) {
        return;
      }

      if (refreshOnVisibilityRestore) {
        startTransition(() => {
          void runTick();
        });
        return;
      }

      scheduleNext(getNextDelay());
    };

    if (pauseWhenHidden) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    if (runImmediately) {
      void runTick();
    } else {
      scheduleNext(getNextDelay());
    }

    return () => {
      cancelled = true;
      clearTimer();
      if (pauseWhenHidden) {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [
    active,
    intervalMs,
    intervalsMs,
    label,
    pauseWhenHidden,
    refreshAfterTick,
    refreshOnVisibilityRestore,
    runImmediately,
    router,
  ]);
}
