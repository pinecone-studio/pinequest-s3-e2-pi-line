"use client";

import { useEffect, useState } from "react";
import RouteAutoRefresh from "../../_features/RouteAutoRefresh";

type StudentExamTiming = {
  canViewResults: boolean;
  resultReleaseAt?: string | null;
  startTime?: string | null;
};

function shouldRefreshExamList(exams: StudentExamTiming[]) {
  const nowMs = Date.now();

  return exams.some((exam) => {
    const startTimeMs = new Date(String(exam.startTime ?? "")).getTime();
    const releaseTimeMs = new Date(String(exam.resultReleaseAt ?? "")).getTime();
    const startsSoon =
      Number.isFinite(startTimeMs) &&
      startTimeMs >= nowMs &&
      startTimeMs - nowMs <= 15 * 60 * 1000;
    const releasesSoon =
      !exam.canViewResults &&
      Number.isFinite(releaseTimeMs) &&
      releaseTimeMs >= nowMs &&
      releaseTimeMs - nowMs <= 15 * 60 * 1000;

    return startsSoon || releasesSoon;
  });
}

export default function StudentExamsAutoRefresh({
  exams,
}: {
  exams: StudentExamTiming[];
}) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(shouldRefreshExamList(exams));
  }, [exams]);

  return (
    <RouteAutoRefresh
      active={active}
      intervalMs={60000}
      label="StudentExamsPage"
      pauseWhenHidden
      runImmediately={false}
    />
  );
}
