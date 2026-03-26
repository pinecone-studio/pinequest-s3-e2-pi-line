import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getExamById, updateExam } from "@/lib/exam/actions";
import { getExamReadiness } from "@/lib/exam-readiness";
import { getTeacherSubjects } from "@/lib/subject/actions";
import { getExamCreationGroups } from "@/lib/group/actions";
import ExamReadinessPanel from "@/components/exams/exam-readiness-panel";
import ExamScheduleFields from "@/components/exams/ExamScheduleFields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, School2 } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditExamPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error: pageError } = await searchParams;
  const [exam, subjects, groups] = await Promise.all([
    getExamById(id),
    getTeacherSubjects(),
    getExamCreationGroups(),
  ]);

  if (!exam) notFound();
  if (exam.is_published) redirect(`/educator/exams/${id}/questions`);

  const readiness = await getExamReadiness(id, {
    exam: {
      id: exam.id,
      title: exam.title,
      subject_id: exam.subject_id,
      start_time: exam.start_time,
      end_time: exam.end_time,
      duration_minutes: exam.duration_minutes,
      is_published: exam.is_published,
    },
    questions: (exam.questions ?? []).map((question: { type: string; points: number | null }) => ({
      type: question.type,
      points: question.points,
    })),
  });

  const assignedGroupIds = Array.from(
    new Set(
      (Array.isArray(exam.exam_assignments) ? exam.exam_assignments : [])
        .map((assignment: { group_id: string }) => String(assignment.group_id))
        .filter(Boolean)
    )
  );
  const assignedGroupSet = new Set(assignedGroupIds);

  async function handleUpdate(formData: FormData) {
    "use server";
    const result = await updateExam(id, formData);
    if (result?.error) {
      redirect(`/educator/exams/${id}/edit?error=${encodeURIComponent(result.error)}`);
    }
    redirect(`/educator/exams/${id}/questions`);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/educator/exams/${id}/questions`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Буцах
        </Link>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          Шалгалт засах
        </h2>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Шалгалтын мэдээлэл</CardTitle>
          </CardHeader>
          <CardContent>
            {pageError && (
              <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {pageError}
              </div>
            )}
            <form action={handleUpdate} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Шалгалтын нэр *</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={exam.title}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject_id">Хичээл *</Label>
                <select
                  id="subject_id"
                  name="subject_id"
                  defaultValue={exam.subject_id ?? "__none"}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Тайлбар</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={exam.description ?? ""}
                  rows={3}
                />
              </div>

              <div className="space-y-3 rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <Label>Оноох анги / бүлгүүд</Label>
                    <p className="text-sm text-muted-foreground">
                      Энэ шалгалтыг ямар анги, сонгон бүлгүүдэд өгөхөө эндээс шинэчилнэ.
                    </p>
                  </div>
                  <Badge variant="outline" className="h-auto py-1">
                    {assignedGroupIds.length} бүлэг сонгосон
                  </Badge>
                </div>
                {groups.length === 0 ? (
                  <div className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
                    Таны заадаг бүлэг одоогоор олдсонгүй.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {groups.map((group) => (
                      <label
                        key={group.id}
                        className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                          assignedGroupSet.has(group.id)
                            ? "border-primary bg-primary/5"
                            : "bg-background hover:border-primary/40 hover:bg-muted/20"
                        }`}
                      >
                        <span className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            name="group_ids"
                            value={group.id}
                            defaultChecked={assignedGroupSet.has(group.id)}
                            className="mt-0.5 h-4 w-4 rounded border"
                          />
                          <span className="space-y-1">
                            <span className="block font-medium">{group.name}</span>
                            <span className="block text-muted-foreground">
                              {group.grade ? `${group.grade}-р анги` : "Ангийн түвшин заагаагүй"}
                              {group.allowed_subject_ids.length > 0
                                ? ` · ${group.allowed_subject_ids.length} хичээл`
                                : ""}
                            </span>
                          </span>
                        </span>
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            assignedGroupSet.has(group.id)
                              ? "bg-primary/10 text-primary"
                              : "bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          <School2 className="h-4 w-4" />
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <ExamScheduleFields
                initialStartTime={exam.start_time}
                initialEndTime={exam.end_time}
                initialDurationMinutes={exam.duration_minutes}
                initialPassingScore={exam.passing_score ?? 60}
                initialMaxAttempts={exam.max_attempts ?? 1}
                initialShuffleQuestions={exam.shuffle_questions}
                initialShuffleOptions={exam.shuffle_options}
              />

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Хадгалах
                </Button>
                <Link href={`/educator/exams/${id}/questions`}>
                  <Button type="button" variant="outline">
                    Цуцлах
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {readiness && (
          <ExamReadinessPanel
            readiness={readiness}
            examId={id}
            className="xl:sticky xl:top-6"
          />
        )}
      </div>
    </div>
  );
}
