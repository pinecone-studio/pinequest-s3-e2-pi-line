"use client";

import { startTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type UseActionRefreshLoopOptions = {
  active: boolean;
  intervalMs?: number;
  label: string;
  onTick?: (() => Promise<unknown> | void) | null;
};

export function useActionRefreshLoop({
  active,
  intervalMs = 6000,
  label,
  onTick,
}: UseActionRefreshLoopOptions) {
  const router = useRouter();
  const inFlightRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
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

    const scheduleNext = (delayMs: number) => {
      clearTimer();
      if (cancelled) {
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
        scheduleNext(intervalMs);
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

      if (!cancelled) {
        router.refresh();
      }

      scheduleNext(intervalMs);
    };

    void runTick();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [active, intervalMs, label, router]);
}
