"use client";

import { useActionRefreshLoop } from "./useActionRefreshLoop";

export default function RouteAutoRefresh({
  active,
  intervalMs = 6000,
  intervalsMs,
  label = "RouteAutoRefresh",
  pauseWhenHidden = false,
  refreshOnVisibilityRestore = true,
  runImmediately = true,
}: {
  active: boolean;
  intervalMs?: number;
  intervalsMs?: number[];
  label?: string;
  pauseWhenHidden?: boolean;
  refreshOnVisibilityRestore?: boolean;
  runImmediately?: boolean;
}) {
  useActionRefreshLoop({
    active,
    intervalMs,
    intervalsMs,
    label,
    pauseWhenHidden,
    refreshOnVisibilityRestore,
    runImmediately,
  });

  return null;
}
