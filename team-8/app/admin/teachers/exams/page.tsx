import { getAdminExamOverview } from "@/lib/admin/actions";
import ExamReviewBoard from "./_features/ExamReviewBoard";

export default async function AdminTeacherExamsPage() {
  const exams = await getAdminExamOverview();

  return <ExamReviewBoard exams={exams} />;
}
