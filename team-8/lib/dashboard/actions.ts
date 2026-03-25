"use server";

import { createClient } from "@/lib/supabase/server";

function getRelationObject<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

type StudentUpcomingExam = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  session_status: string | null;
};

export async function getEducatorStats() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      totalExams: 0,
      totalQuestions: 0,
      activeExams: 0,
      pendingGrading: 0,
      upcomingExams: [],
      pendingItems: [],
    };
  }

  const now = new Date().toISOString();

  // Own exam IDs (for totalExams, totalQuestions, activeExams)
  const { data: ownExams } = await supabase
    .from("exams")
    .select("id")
    .eq("created_by", user.id);
  const ownExamIds = (ownExams ?? []).map((e) => e.id);

  // Teaching-scope exam IDs (for pendingGrading — includes admin-created exams assigned to teacher's groups)
  const teachingScopeExamIds = new Set<string>(ownExamIds);

  const { data: teachingRows } = await supabase
    .from("teaching_assignments")
    .select("group_id, subject_id")
    .eq("teacher_id", user.id)
    .eq("is_active", true);

  if (teachingRows && teachingRows.length > 0) {
    const groupIds = [...new Set(teachingRows.map((r) => r.group_id))];
    const { data: assignedExams } = await supabase
      .from("exam_assignments")
      .select("exam_id, group_id, exams(subject_id)")
      .in("group_id", groupIds);

    for (const ae of assignedExams ?? []) {
      const subjectId = Array.isArray(ae.exams)
        ? ae.exams[0]?.subject_id
        : (ae.exams as { subject_id: string } | null)?.subject_id;
      // Must match both subject AND group (not just subject)
      if (teachingRows.find((ta) => ta.subject_id === subjectId && ta.group_id === ae.group_id)) {
        teachingScopeExamIds.add(ae.exam_id);
      }
    }
  }

  const scopeExamIds = [...teachingScopeExamIds];

  const [questionsRes, activeRes, pendingRes, upcomingRes, pendingItemsRes] = await Promise.all([
    ownExamIds.length > 0
      ? supabase
          .from("questions")
          .select("id", { count: "exact", head: true })
          .in("exam_id", ownExamIds)
      : Promise.resolve({ count: 0 }),
    ownExamIds.length > 0
      ? supabase
          .from("exams")
          .select("id", { count: "exact", head: true })
          .in("id", ownExamIds)
          .eq("is_published", true)
          .lte("start_time", now)
          .gte("end_time", now)
      : Promise.resolve({ count: 0 }),
    scopeExamIds.length > 0
      ? supabase
          .from("exam_sessions")
          .select("id", { count: "exact", head: true })
          .eq("status", "submitted")
          .in("exam_id", scopeExamIds)
      : Promise.resolve({ count: 0 }),
    scopeExamIds.length > 0
      ? supabase
          .from("exams")
          .select("id, title, start_time, end_time, is_published, subjects(name)")
          .in("id", scopeExamIds)
          .gte("end_time", now)
          .order("start_time", { ascending: true })
          .limit(5)
      : Promise.resolve({ data: [] }),
    scopeExamIds.length > 0
      ? supabase
          .from("exam_sessions")
          .select(
            "id, submitted_at, exam_id, exams(title), profiles!exam_sessions_user_id_fkey(full_name, email)"
          )
          .eq("status", "submitted")
          .in("exam_id", scopeExamIds)
          .order("submitted_at", { ascending: true })
          .limit(5)
      : Promise.resolve({ data: [] }),
  ]);

  const upcomingExams = (upcomingRes.data ?? []).map((exam) => ({
    id: exam.id,
    title: exam.title,
    start_time: exam.start_time,
    end_time: exam.end_time,
    is_published: exam.is_published,
    subject_name: getRelationObject(exam.subjects)?.name ?? null,
  }));

  const pendingItems = (pendingItemsRes.data ?? []).map((session) => {
    const exam = getRelationObject(session.exams);
    const profile = getRelationObject(session.profiles);

    return {
      id: session.id,
      submitted_at: session.submitted_at,
      exam_title: exam?.title ?? "Шалгалт",
      student_label: profile?.full_name || profile?.email || "Сурагч",
    };
  });

  return {
    totalExams: ownExamIds.length,
    totalQuestions: questionsRes.count ?? 0,
    activeExams: activeRes.count ?? 0,
    pendingGrading: pendingRes.count ?? 0,
    upcomingExams,
    pendingItems,
  };
}

export async function getStudentStats() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      activeExams: 0,
      completedExams: 0,
      avgScore: null,
      upcomingExams: [],
      recentResults: [],
    };
  }

  const now = new Date().toISOString();

  const [activeAssignmentsRes, sessionsRes, upcomingAssignmentsRes] = await Promise.all([
    supabase
      .from("exam_recipients")
      .select(
        `
        exam_id,
        exams!inner(id)
      `
      )
      .eq("student_id", user.id)
      .eq("exams.is_published", true)
      .lte("exams.start_time", now)
      .gte("exams.end_time", now),
    supabase
      .from("exam_sessions")
      .select("exam_id, status, submitted_at, total_score, max_score, exams(title, passing_score)")
      .eq("user_id", user.id)
      .in("status", ["submitted", "graded"]),
    supabase
      .from("exam_recipients")
      .select(
        `
        exam_id,
        exams!inner(id, title, start_time, end_time, duration_minutes)
      `
      )
      .eq("student_id", user.id)
      .eq("exams.is_published", true)
      .gte("exams.end_time", now),
  ]);

  const activeExams = new Set(
    (activeAssignmentsRes.data ?? []).map((assignment) => assignment.exam_id)
  ).size;
  const sessions = sessionsRes.data ?? [];
  const upcomingRows = upcomingAssignmentsRes.data ?? [];
  let avgScore: number | null = null;
  if (sessions.length > 0) {
    const totalPct = sessions.reduce((sum, s) => {
      if (s.max_score && s.max_score > 0) {
        return sum + (s.total_score / s.max_score) * 100;
      }
      return sum;
    }, 0);
    avgScore = Math.round(totalPct / sessions.length);
  }

  const latestSessionByExam = new Map<string, string>();
  for (const session of sessions) {
    if (!latestSessionByExam.has(session.exam_id as string)) {
      latestSessionByExam.set(session.exam_id as string, session.status as string);
    }
  }

  const upcomingExams = Array.from(
    new Map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      upcomingRows.map((row: any) => {
        const exam = getRelationObject(row.exams);
        return [
          exam?.id as string,
          exam
            ? {
                id: exam.id,
                title: exam.title,
                start_time: exam.start_time,
                end_time: exam.end_time,
                duration_minutes: exam.duration_minutes,
                session_status: latestSessionByExam.get(exam.id) ?? null,
              }
            : null,
        ];
      })
    ).values()
  )
    .filter((exam): exam is StudentUpcomingExam => Boolean(exam))
    .sort(
      (left, right) =>
        new Date(left.start_time).getTime() -
        new Date(right.start_time).getTime()
    )
    .slice(0, 5);

  const recentResults = sessions
    .slice()
    .sort(
      (left, right) =>
        new Date(right.submitted_at as string).getTime() -
        new Date(left.submitted_at as string).getTime()
    )
    .slice(0, 3)
    .map((session) => {
      const exam = getRelationObject(session.exams);
      const percentage =
        session.max_score && session.max_score > 0
          ? Math.round((session.total_score / session.max_score) * 100)
          : null;

      return {
        id: session.exam_id,
        exam_title: exam?.title ?? "Шалгалт",
        submitted_at: session.submitted_at,
        percentage,
        status: session.status,
      };
    });

  return {
    activeExams,
    completedExams: sessions.length,
    avgScore,
    upcomingExams,
    recentResults,
  };
}
