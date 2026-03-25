import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
const EXAM_SCHEDULING_GUARD_ERROR =
  "Шалгалтын давхцал шалгах шинэчлэл идэвхжээгүй байна. Хамгийн сүүлийн DB migration-аа apply хийнэ үү.";

interface ScheduledExam {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
}

interface ConflictRow {
  student_id: string;
  student_name: string | null;
  conflicting_exam_id: string;
  conflicting_exam_title: string | null;
}

function buildConflictError(
  examTitle: string,
  conflicts: Array<{ studentName: string; conflictingExamTitle: string }>
) {
  const examples = conflicts
    .slice(0, 3)
    .map(
      (conflict) =>
        `${conflict.studentName} -> ${conflict.conflictingExamTitle}`
    )
    .join(", ");

  const suffix =
    conflicts.length > 3
      ? ` болон өөр ${conflicts.length - 3} зөрчил`
      : "";

  return `"${examTitle}" шалгалтыг оноох боломжгүй. Давхцаж буй шалгалтын жишээ: ${examples}${suffix}.`;
}

async function getExamSchedule(
  supabase: SupabaseServerClient,
  examId: string
): Promise<ScheduledExam | null> {
  const { data } = await supabase
    .from("exams")
    .select("id, title, start_time, end_time")
    .eq("id", examId)
    .maybeSingle();

  return data;
}

async function getGroupStudentIds(
  supabase: SupabaseServerClient,
  groupId: string
) {
  const { data } = await supabase
    .from("student_group_members")
    .select("student_id")
    .eq("group_id", groupId);

  return Array.from(
    new Set((data ?? []).map((member) => member.student_id))
  );
}

async function getConflictingAssignmentsForStudentsViaRpc(
  supabase: SupabaseServerClient,
  exam: ScheduledExam,
  groupIds: string[]
) {
  if (groupIds.length === 0) return { rows: [] as ConflictRow[] };

  const { data, error } = await supabase.rpc("get_exam_assignment_conflicts", {
    p_exam_id: exam.id,
    p_group_ids: groupIds,
    p_start_time: exam.start_time,
    p_end_time: exam.end_time,
  });

  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      return { error: EXAM_SCHEDULING_GUARD_ERROR };
    }

    return {
      error: `Шалгалтын давхцлыг шалгах үед алдаа гарлаа: ${error.message}`,
    };
  }

  return { rows: (data ?? []) as ConflictRow[] };
}

async function getAssignedGroupIdsForExam(
  supabase: SupabaseServerClient,
  examId: string
) {
  const { data } = await supabase
    .from("exam_assignments")
    .select("group_id")
    .eq("exam_id", examId);

  return Array.from(new Set((data ?? []).map((row) => row.group_id)));
}

export async function getGroupAssignmentConflictError(
  supabase: SupabaseServerClient,
  groupId: string,
  examId: string
) {
  const exam = await getExamSchedule(supabase, examId);
  if (!exam) return "Шалгалтын хуваарь олдсонгүй";

  const studentIds = await getGroupStudentIds(supabase, groupId);
  if (studentIds.length === 0) return null;

  const conflictResult = await getConflictingAssignmentsForStudentsViaRpc(
    supabase,
    exam,
    [groupId]
  );
  if ("error" in conflictResult) return conflictResult.error;

  const conflicts = conflictResult.rows;

  if (conflicts.length === 0) return null;

  return buildConflictError(
    exam.title,
    conflicts.map((conflict) => ({
      studentName: conflict.student_name || "Сурагч",
      conflictingExamTitle: conflict.conflicting_exam_title || "Өөр шалгалт",
    }))
  );
}

export async function getExamAssignmentConflictError(
  supabase: SupabaseServerClient,
  examId: string,
  overrides?: Partial<Pick<ScheduledExam, "title" | "start_time" | "end_time">>
) {
  const exam = await getExamSchedule(supabase, examId);
  if (!exam) return "Шалгалтын хуваарь олдсонгүй";

  const assignedGroupIds = await getAssignedGroupIdsForExam(supabase, examId);
  if (assignedGroupIds.length === 0) return null;

  const targetExam: ScheduledExam = {
    ...exam,
    title: overrides?.title ?? exam.title,
    start_time: overrides?.start_time ?? exam.start_time,
    end_time: overrides?.end_time ?? exam.end_time,
  };

  const conflictResult = await getConflictingAssignmentsForStudentsViaRpc(
    supabase,
    targetExam,
    assignedGroupIds
  );
  if ("error" in conflictResult) return conflictResult.error;

  if (conflictResult.rows.length === 0) return null;

  return buildConflictError(
    targetExam.title,
    conflictResult.rows.map((conflict) => ({
      studentName: conflict.student_name || "Сурагч",
      conflictingExamTitle: conflict.conflicting_exam_title || "Өөр шалгалт",
    }))
  );
}

export async function getGroupMemberConflictError(
  supabase: SupabaseServerClient,
  groupId: string,
  studentId: string
) {
  const { data: assignedExams } = await supabase
    .from("exam_assignments")
    .select("exam_id, exams!inner(id, title, start_time, end_time)")
    .eq("group_id", groupId);

  for (const assignment of assignedExams ?? []) {
    const exam = Array.isArray(assignment.exams)
      ? assignment.exams[0]
      : assignment.exams;

    if (!exam) continue;

    const conflictResult = await getConflictingAssignmentsForStudentsViaRpc(
      supabase,
      exam,
      [groupId]
    );
    if ("error" in conflictResult) return conflictResult.error;

    const conflicts = conflictResult.rows.filter(
      (conflict) => conflict.student_id === studentId
    );

    if (conflicts.length > 0) {
      return buildConflictError(
        exam.title,
        conflicts.map((conflict) => ({
          studentName: conflict.student_name || "Сурагч",
          conflictingExamTitle: conflict.conflicting_exam_title || "Өөр шалгалт",
        }))
      );
    }
  }

  return null;
}
