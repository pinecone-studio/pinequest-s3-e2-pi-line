"use client";

import { processCurrentStudentLearningWork } from "@/lib/student-learning/actions";
import { useActionRefreshLoop } from "../../_features/useActionRefreshLoop";

export default function LearningAutoRefresh({
  active,
  subjectId,
  intervalMs = 6000,
}: {
  active: boolean;
  subjectId?: string | null;
  intervalMs?: number;
}) {
  useActionRefreshLoop({
    active,
    intervalMs,
    label: "LearningAutoRefresh",
    onTick: async () => {
      await processCurrentStudentLearningWork(
        subjectId ? { subjectId } : {}
      );
    },
  });

  return null;
}
