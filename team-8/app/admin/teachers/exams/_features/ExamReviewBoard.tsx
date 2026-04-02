"use client";

import { useMemo, useState } from "react";
import { BookOpen, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminExamOverview } from "@/lib/admin/actions";

type TabId = "draft" | "published" | "finalized";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "draft", label: "Шинэ шалгалт" },
  { id: "published", label: "Баталсан" },
  { id: "finalized", label: "Дууссан" },
];

const LIFECYCLE_BADGE_CLASSNAME: Record<string, string> = {
  draft: "bg-[#f4f4f5] text-[#52525b]",
  ready: "bg-[#ecfdf3] text-[#166534]",
  published: "bg-[#eff6ff] text-[#1d4ed8]",
  live: "bg-[#dbeafe] text-[#1d4ed8]",
  grading: "bg-[#fff7ed] text-[#c2410c]",
  finalized: "bg-[#eef2ff] text-[#4338ca]",
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Хуваарьгүй";

  return new Intl.DateTimeFormat("mn-MN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getTabForExam(exam: AdminExamOverview): TabId {
  const key = exam.lifecycle?.key;

  if (key === "finalized") return "finalized";
  if (key === "published" || key === "live" || key === "grading") {
    return "published";
  }

  return "draft";
}

function ExamCard({ exam }: { exam: AdminExamOverview }) {
  const lifecycleKey = exam.lifecycle?.key ?? "draft";
  const lifecycleLabel = exam.lifecycle?.label ?? "Ноорог";

  return (
    <article className="flex flex-col gap-4 rounded-[24px] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#edf4ff] text-[#4D97F8]">
          <BookOpen className="h-7 w-7" strokeWidth={1.8} />
        </div>

        <span
          className={cn(
            "rounded-full px-3 py-1 text-[12px] font-semibold",
            LIFECYCLE_BADGE_CLASSNAME[lifecycleKey] ??
              "bg-[#f4f4f5] text-[#52525b]",
          )}
        >
          {lifecycleLabel}
        </span>
      </div>

      <div className="space-y-1">
        <h3 className="text-[16px] font-semibold leading-snug text-zinc-950">
          {exam.title}
        </h3>
        <p className="text-[13px] text-zinc-500">
          {exam.subjectName ?? "Хичээлгүй"}
        </p>
      </div>

      <p className="min-h-[40px] text-[13px] leading-snug text-zinc-500">
        {exam.description?.trim() || "Тайлбар оруулаагүй байна."}
      </p>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-zinc-200 px-3 py-1 text-[12px] text-zinc-600">
          {exam.questionCount} асуулт
        </span>
        <span className="rounded-full border border-zinc-200 px-3 py-1 text-[12px] text-zinc-600">
          {exam.assignedGroupCount} бүлэг
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-3 py-1 text-[12px] text-zinc-600">
          <Users className="h-3.5 w-3.5" />
          {exam.assignedStudentCount} сурагч
        </span>
      </div>

      <div className="rounded-[16px] bg-[#f8fafc] px-4 py-3 text-[12px] text-zinc-600">
        <p>Эхлэх: {formatDateTime(exam.startTime)}</p>
        <p className="mt-1">Үргэлжлэх: {exam.durationMinutes} минут</p>
        <p className="mt-1">
          Явц: {exam.inProgressCount} өгч байна, {exam.pendingGradingCount} шалгалт
          хүлээгдэж байна, {exam.gradedCount} дүн гарсан
        </p>
      </div>
    </article>
  );
}

export default function ExamReviewBoard({
  exams,
}: {
  exams: AdminExamOverview[];
}) {
  const [activeTab, setActiveTab] = useState<TabId>("draft");
  const [search, setSearch] = useState("");

  const filteredExams = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return exams.filter((exam) => {
      if (getTabForExam(exam) !== activeTab) return false;
      if (!normalized) return true;

      const haystack = [
        exam.title,
        exam.subjectName ?? "",
        exam.description ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [activeTab, exams, search]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-[#F0EEEE] p-1 shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-[13px] font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-white text-black"
                  : "text-black hover:text-zinc-700",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-[#F0EEEE] px-3 py-2 shadow-sm">
          <Search size={14} className="text-[#3C3C4399]" />
          <input
            type="text"
            placeholder="Хайх"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-36 text-[13px] outline-none placeholder:text-[#3C3C4399] sm:w-56"
          />
        </div>
      </div>

      {filteredExams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center text-zinc-500 shadow-sm">
          Илэрц олдсонгүй.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      )}
    </div>
  );
}
