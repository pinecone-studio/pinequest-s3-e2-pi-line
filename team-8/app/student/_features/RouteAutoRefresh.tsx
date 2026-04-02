"use client";

import { useActionRefreshLoop } from "./useActionRefreshLoop";

export default function RouteAutoRefresh({
  active,
  intervalMs = 6000,
  label = "RouteAutoRefresh",
}: {
  active: boolean;
  intervalMs?: number;
  label?: string;
}) {
  useActionRefreshLoop({
    active,
    intervalMs,
    label,
  });

  return null;
}
