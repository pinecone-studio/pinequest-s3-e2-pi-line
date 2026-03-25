"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function isAdminUser(
  supabase: SupabaseServerClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return data?.role === "admin";
}

async function canManageExam(
  supabase: SupabaseServerClient,
  examId: string,
  userId: string
): Promise<boolean> {
  if (await isAdminUser(supabase, userId)) return true;
  const { data } = await supabase
    .from("exams")
    .select("id")
    .eq("id", examId)
    .eq("created_by", userId)
    .maybeSingle();
  return !!data;
}

/** Багшийн scope дахь бүх шалгалтыг room болон conflict мэдээлэлтэй авах */
export async function getExamSchedules() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = await isAdminUser(supabase, user.id);

  // ── Scope дахь exam_id-ийг цуглуулах ──────────────────────────────
  const scopeIds = new Set<string>();

  if (admin) {
    const { data } = await supabase.from("exams").select("id");
    for (const e of data ?? []) scopeIds.add(e.id);
  } else {
    // Өөрийн үүсгэсэн
    const { data: own } = await supabase
      .from("exams")
      .select("id")
      .eq("created_by", user.id);
    for (const e of own ?? []) scopeIds.add(e.id);

    // Teaching assignment-аар оноогдсон
    const { data: taRows } = await supabase
      .from("teaching_assignments")
      .select("group_id, subject_id")
      .eq("teacher_id", user.id)
      .eq("is_active", true);

    if (taRows && taRows.length > 0) {
      const groupIds = [...new Set(taRows.map((r) => r.group_id))];
      const { data: assigned } = await supabase
        .from("exam_assignments")
        .select("exam_id, exams(subject_id)")
        .in("group_id", groupIds);

      for (const ae of assigned ?? []) {
        const subjectId = Array.isArray(ae.exams)
          ? ae.exams[0]?.subject_id
          : (ae.exams as { subject_id: string } | null)?.subject_id;
        if (taRows.find((ta) => ta.subject_id === subjectId)) {
          scopeIds.add(ae.exam_id);
        }
      }
    }
  }

  const examIds = [...scopeIds];
  if (examIds.length === 0) return [];

  // ── Шалгалтуудыг дэлгэрэнгүй мэдээлэлтэй авах ────────────────────
  const { data: exams } = await supabase
    .from("exams")
    .select(
      `
      id, title, start_time, end_time, duration_minutes, is_published,
      subjects(id, name),
      exam_schedules(room),
      exam_assignments(
        group_id,
        student_groups(id, name)
      )
    `
    )
    .in("id", examIds)
    .order("start_time", { ascending: true });

  if (!exams) return [];

  // ── Нормалчлах ────────────────────────────────────────────────────
  type ExamRow = {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    is_published: boolean;
    subject_name: string | null;
    room: string | null;
    groups: { id: string; name: string }[];
    conflicts: string[];
  };

  const rows: ExamRow[] = exams.map((exam) => {
    const schedule = Array.isArray(exam.exam_schedules)
      ? exam.exam_schedules[0]
      : exam.exam_schedules;
    const subject = Array.isArray(exam.subjects)
      ? exam.subjects[0]
      : exam.subjects;
    const assignments = Array.isArray(exam.exam_assignments)
      ? exam.exam_assignments
      : exam.exam_assignments
      ? [exam.exam_assignments]
      : [];

    const groups = assignments
      .map((a) => {
        const g = Array.isArray(a.student_groups)
          ? a.student_groups[0]
          : a.student_groups;
        return g ? { id: (g as { id: string; name: string }).id, name: (g as { id: string; name: string }).name } : null;
      })
      .filter((g): g is { id: string; name: string } => g !== null);

    return {
      id: exam.id,
      title: exam.title,
      start_time: exam.start_time,
      end_time: exam.end_time,
      duration_minutes: exam.duration_minutes,
      is_published: exam.is_published,
      subject_name: (subject as { name: string } | null)?.name ?? null,
      room: (schedule as { room: string } | null)?.room ?? null,
      groups,
      conflicts: [],
    };
  });

  // ── Бүлгийн давхцал (нэг бүлгийн хоёр шалгалт ижил цагт) ─────────
  for (const exam of rows) {
    const eStart = new Date(exam.start_time).getTime();
    const eEnd = new Date(exam.end_time).getTime();

    for (const other of rows) {
      if (other.id === exam.id) continue;

      const oStart = new Date(other.start_time).getTime();
      const oEnd = new Date(other.end_time).getTime();

      const overlaps = eStart < oEnd && eEnd > oStart;
      if (!overlaps) continue;

      const examGroupIds = new Set(exam.groups.map((g) => g.id));
      const shared = other.groups.some((g) => examGroupIds.has(g.id));

      if (shared && !exam.conflicts.includes(other.title)) {
        exam.conflicts.push(other.title);
      }
    }
  }

  return rows;
}

/** Шалгалтад танхим оноох / шинэчлэх */
export async function setExamRoom(examId: string, room: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Нэвтрээгүй байна" };

  const canManage = await canManageExam(supabase, examId, user.id);
  if (!canManage) return { error: "Энэ шалгалтад өөрчлөлт хийх эрх алга" };

  const { data: exam } = await supabase
    .from("exams")
    .select("start_time, end_time")
    .eq("id", examId)
    .maybeSingle();

  if (!exam) return { error: "Шалгалт олдсонгүй" };

  if (!room || room.trim() === "") {
    await supabase.from("exam_schedules").delete().eq("exam_id", examId);
    revalidatePath("/educator/schedule");
    return { success: true };
  }

  const { error } = await supabase.from("exam_schedules").upsert(
    {
      exam_id: examId,
      room: room.trim(),
      start_time: exam.start_time,
      end_time: exam.end_time,
    },
    { onConflict: "exam_id" }
  );

  if (error) {
    // PostgreSQL EXCLUDE constraint violation (room overlap)
    if (error.code === "23P01") {
      return {
        error: `"${room.trim()}" танхим энэ цагт өөр шалгалтад ашиглагдаж байна`,
      };
    }
    return { error: error.message };
  }

  revalidatePath("/educator/schedule");
  return { success: true };
}
