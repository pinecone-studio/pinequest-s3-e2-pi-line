import Link from "next/link";
import { getStudentExams } from "@/lib/student/actions";
import { formatDateTimeUB } from "@/lib/utils/date";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function StudentExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorParam } = await searchParams;
  const exams = await getStudentExams();
  const now = new Date();
  const readyCount = exams.filter((exam) => {
    const startTime = new Date(exam.start_time);
    const endTime = new Date(exam.end_time);
    const sessionStatus = exam.mySessionStatus as string | null;
    const isSubmitted = sessionStatus === "submitted" || sessionStatus === "graded";
    return !isSubmitted && now >= startTime && now <= endTime;
  }).length;
  const upcomingCount = exams.filter((exam) => now < new Date(exam.start_time)).length;
  const finishedCount = exams.filter((exam) => {
    const sessionStatus = exam.mySessionStatus as string | null;
    return sessionStatus === "submitted" || sessionStatus === "graded";
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Шалгалтууд</h2>
        <p className="text-muted-foreground">
          Танд оноогдсон шалгалтуудын жагсаалт
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="secondary">Одоо өгөх боломжтой {readyCount}</Badge>
        <Badge variant="outline">Удахгүй {upcomingCount}</Badge>
        <Badge variant="outline">Дууссан {finishedCount}</Badge>
      </div>

      {errorParam && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <strong>Шалгалт эхлүүлэхэд алдаа гарлаа:</strong>{" "}
          {decodeURIComponent(errorParam)}
        </div>
      )}

      {exams.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Одоогоор шалгалт байхгүй байна.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => {
            const startTime = new Date(exam.start_time);
            const endTime = new Date(exam.end_time);
            const isActive = now >= startTime && now <= endTime;
            const isUpcoming = now < startTime;
            const isExpired = now > endTime;
            const sessionStatus = exam.mySessionStatus as string | null;
            const isSubmitted =
              sessionStatus === "submitted" || sessionStatus === "graded";
            const isInProgress = sessionStatus === "in_progress";

            return (
              <Card key={exam.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{exam.title}</CardTitle>
                    {isSubmitted && (
                      <Badge variant="secondary">Өгсөн</Badge>
                    )}
                    {!isSubmitted && isActive && (
                      <Badge variant="secondary">Одоо эхэлнэ</Badge>
                    )}
                    {!isSubmitted && isUpcoming && <Badge variant="secondary">Удахгүй</Badge>}
                    {!isSubmitted && isExpired && (
                      <Badge variant="outline">Дууссан</Badge>
                    )}
                  </div>
                  {exam.description && (
                    <CardDescription>{exam.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Эхлэх:</span>
                      <span>{formatDateTimeUB(exam.start_time)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Дуусах:</span>
                      <span>{formatDateTimeUB(exam.end_time)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Хугацаа:</span>
                      <span>{exam.duration_minutes} минут</span>
                    </div>
                    {exam.passing_score && (
                      <div className="flex justify-between">
                        <span>Тэнцэх оноо:</span>
                        <span>{exam.passing_score}%</span>
                      </div>
                    )}
                  </div>

                  {/* Аль хэдийн өгсөн → үр дүн */}
                  {isSubmitted && (
                    <Link href={`/student/exams/${exam.id}/result`}>
                      <Button variant="outline" className="w-full">
                        Үр дүн харах
                      </Button>
                    </Link>
                  )}

                  {/* Үргэлжлүүлэх (in_progress + цаг дуусаагүй) */}
                  {!isSubmitted && isInProgress && isActive && (
                    <Link href={`/student/exams/${exam.id}/take`}>
                      <Button variant="outline" className="w-full">
                        Үргэлжлүүлэх
                      </Button>
                    </Link>
                  )}

                  {/* Шалгалт өгөх (active, session байхгүй) */}
                  {!isSubmitted && !isInProgress && isActive && (
                    <Link href={`/student/exams/${exam.id}/take`}>
                      <Button className="w-full">Шалгалт өгөх</Button>
                    </Link>
                  )}

                  {!isSubmitted && isUpcoming && (
                    <Button disabled variant="outline" className="w-full">
                      Эхлээгүй байна
                    </Button>
                  )}

                  {!isSubmitted && !isInProgress && isExpired && (
                    <Button disabled variant="outline" className="w-full">
                      Дууссан
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
