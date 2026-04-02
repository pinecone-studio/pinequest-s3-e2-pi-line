"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { deleteExam, publishExam } from "@/lib/exam/actions";
import { ULAANBAATAR_TIME_ZONE } from "@/lib/utils/date";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, MoreHorizontal } from "lucide-react";
import type { ExamLifecycleSummary } from "@/lib/exam-lifecycle";

interface Exam {
  id: string;
  title: string;
  description: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
  total_questions?: number | null;
  duration_minutes?: number | null;
  lifecycle?: ExamLifecycleSummary | null;
}

interface ExamListProps {
  exams: Exam[];
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("mn-MN", {
      timeZone: ULAANBAATAR_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function getLifecycleLabel(exam: Exam) {
  if (exam.lifecycle?.label) return exam.lifecycle.label;
  if (exam.published_at) return "Нийтлэгдсэн";
  return "Ноорог";
}

function getLifecycleTone(exam: Exam) {
  const label = exam.lifecycle?.label?.toLowerCase() ?? "";

  if (label.includes("нийт")) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (label.includes("товлогд") || label.includes("хүлээгд")) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (label.includes("хаагд") || label.includes("архив")) {
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  if (exam.published_at) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  return "bg-violet-50 text-violet-700 ring-violet-200";
}

export default function ExamList({ exams }: ExamListProps) {
  const [items, setItems] = useState<Exam[]>(exams);
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);
  const [publishTarget, setPublishTarget] = useState<Exam | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    setItems(exams);
  }, [exams]);

  async function handlePublish() {
    if (!publishTarget) return;

    try {
      setIsPublishing(true);
      await publishExam(publishTarget.id);

      setItems((prev) =>
        prev.map((exam) =>
          exam.id === publishTarget.id
            ? {
                ...exam,
                published_at: new Date().toISOString(),
                lifecycle: exam.lifecycle
                  ? {
                      ...exam.lifecycle,
                      status: "published",
                      label: "Нийтлэгдсэн",
                    }
                  : exam.lifecycle,
              }
            : exam,
        ),
      );
    } catch (error) {
      console.error("Failed to publish exam:", error);
    } finally {
      setIsPublishing(false);
      setPublishTarget(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      await deleteExam(deleteTarget.id);
      setItems((prev) => prev.filter((exam) => exam.id !== deleteTarget.id));
    } catch (error) {
      console.error("Failed to delete exam:", error);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Шалгалт алга</h3>
        <p className="mt-2 text-sm text-slate-500">
          Одоогоор үүсгэсэн шалгалт байхгүй байна.
        </p>
        <div className="mt-6">
          <Link
            href="/educator/create-exam"
            className="inline-flex items-center rounded-lg bg-[#7F32F5] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6d27dc]"
          >
            Шинэ шалгалт үүсгэх
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Шалгалт
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Төлөв
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Асуулт
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Хугацаа
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Үүсгэсэн
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Үйлдэл
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {items.map((exam) => (
                <tr key={exam.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-4 align-top">
                    <div className="max-w-[380px]">
                      <p className="text-sm font-semibold text-slate-900">
                        {exam.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {exam.description?.trim() || "Тайлбаргүй"}
                      </p>
                    </div>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getLifecycleTone(
                        exam,
                      )}`}
                    >
                      {getLifecycleLabel(exam)}
                    </span>
                  </td>

                  <td className="px-5 py-4 align-top text-sm text-slate-700">
                    {exam.total_questions ?? "—"}
                  </td>

                  <td className="px-5 py-4 align-top text-sm text-slate-700">
                    {exam.duration_minutes
                      ? `${exam.duration_minutes} мин`
                      : "—"}
                  </td>

                  <td className="px-5 py-4 align-top text-sm text-slate-700">
                    {formatDateTime(exam.created_at)}
                  </td>

                  <td className="px-5 py-4 align-top">
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                            aria-label="More actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/educator/exams/${exam.id}`}
                              className="flex cursor-pointer items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Харах
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem asChild>
                            <Link href={`/educator/exams/${exam.id}/edit`}>
                              Засах
                            </Link>
                          </DropdownMenuItem>

                          {!exam.published_at && (
                            <DropdownMenuItem
                              onClick={() => setPublishTarget(exam)}
                            >
                              Нийтлэх
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(exam)}
                            className="text-red-600 focus:text-red-600"
                          >
                            Устгах
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog
        open={Boolean(publishTarget)}
        onOpenChange={(open) => {
          if (!open) setPublishTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Шалгалтыг нийтлэх үү?</AlertDialogTitle>
            <AlertDialogDescription>
              {publishTarget?.title
                ? `“${publishTarget.title}” шалгалтыг нийтэлсний дараа сурагчдад харагдаж эхэлж болно.`
                : "Энэ шалгалтыг нийтэлсний дараа сурагчдад харагдаж эхэлж болно."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPublishing}>Болих</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-[#7F32F5] hover:bg-[#6d27dc]"
            >
              {isPublishing ? "Нийтэлж байна..." : "Нийтлэх"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Шалгалтыг устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.title
                ? `“${deleteTarget.title}” шалгалтыг устгавал буцаах боломжгүй байж магадгүй.`
                : "Энэ шалгалтыг устгавал буцаах боломжгүй байж магадгүй."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Болих</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Устгаж байна..." : "Устгах"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
