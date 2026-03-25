import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  ListChecks,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ExamReadiness } from "@/lib/exam-readiness";

function getStatusIcon(status: "complete" | "warning" | "blocked") {
  if (status === "complete") {
    return <CheckCircle2 className="h-4 w-4 text-foreground" />;
  }

  return <AlertTriangle className="h-4 w-4 text-amber-600" />;
}

function getStatusBadge(readiness: ExamReadiness) {
  if (readiness.isPublished) {
    return { label: "Нийтэлсэн", variant: "default" as const };
  }

  if (readiness.blockedCount > 0) {
    return { label: "Бэлэн биш", variant: "outline" as const };
  }

  if (readiness.warningCount > 0) {
    return { label: "Анхаарах зүйлтэй", variant: "secondary" as const };
  }

  return { label: "Нийтлэхэд бэлэн", variant: "secondary" as const };
}

function getGroupTypeLabel(groupType: string) {
  if (groupType === "class") return "Анги";
  if (groupType === "elective") return "Сонгон";
  if (groupType === "mixed") return "Холимог";
  return groupType;
}

export default function ExamReadinessPanel({
  readiness,
  examId,
  className,
}: {
  readiness: ExamReadiness;
  examId: string;
  className?: string;
}) {
  const statusBadge = getStatusBadge(readiness);

  return (
    <Card className={cn("border-border/80", className)}>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Шалгалтын бэлэн байдал</CardTitle>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          {readiness.blockedCount > 0 && (
            <Badge variant="outline">{readiness.blockedCount} blocker</Badge>
          )}
          {readiness.warningCount > 0 && (
            <Badge variant="outline">{readiness.warningCount} анхааруулга</Badge>
          )}
        </div>
        <CardDescription>
          Нийтлэхээс өмнө агуулга, assignment, schedule, grading урсгалууд
          бүгд бэлэн эсэхийг эндээс харна.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ClipboardList className="h-3.5 w-3.5" />
              Агуулга
            </div>
            <p className="mt-2 text-lg font-semibold">
              {readiness.questionCount} асуулт
            </p>
            <p className="text-xs text-muted-foreground">
              {readiness.passageCount} passage block · {readiness.totalPoints} оноо
            </p>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Хамрах хүрээ
            </div>
            <p className="mt-2 text-lg font-semibold">
              {readiness.assignedStudentCount} сурагч
            </p>
            <p className="text-xs text-muted-foreground">
              {readiness.assignmentCount} бүлэгт оноосон
            </p>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Засалтын ачаалал
            </div>
            <p className="mt-2 text-lg font-semibold">
              {readiness.essayCount} essay
            </p>
            <p className="text-xs text-muted-foreground">
              {readiness.autoGradedCount} асуулт автоматаар засагдана
            </p>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" />
              Хугацаа
            </div>
            <p className="mt-2 text-lg font-semibold">
              {readiness.durationMinutes} минут
            </p>
            <p className="text-xs text-muted-foreground">
              Нээлттэй цонх {readiness.scheduleWindowMinutes} минут
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {readiness.checks.map((check) => (
            <div
              key={check.key}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5",
                check.status === "blocked" && "border-amber-300/70 bg-amber-50/40",
                check.status === "warning" && "border-amber-200/70 bg-amber-50/20"
              )}
            >
              <div className="mt-0.5">{getStatusIcon(check.status)}</div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{check.label}</p>
                <p className="text-sm text-muted-foreground">{check.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Оноосон бүлгүүд</p>
          {readiness.assignedGroups.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {readiness.assignedGroups.map((group) => (
                <Badge key={group.id} variant="outline" className="h-auto py-1">
                  {group.name}
                  {group.grade ? ` · ${group.grade}-р анги` : ""}
                  {` · ${getGroupTypeLabel(group.group_type)}`}
                  {` · ${group.member_count} сурагч`}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              Одоогоор нэг ч бүлэгт оноогоогүй байна. Бүлэгт оноосны дараа
              шалгалт сурагчдад харагдана.
            </div>
          )}
        </div>

        {readiness.conflictMessage && (
          <div className="rounded-lg border border-amber-300/70 bg-amber-50/40 p-3 text-sm">
            <p className="font-medium">Хуваарийн зөрчил илэрсэн</p>
            <p className="mt-1 text-muted-foreground">{readiness.conflictMessage}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Нийтлэхээс өмнө blocker-уудаа арилгаад, assignment болон schedule-ээ
          баталгаажуулна уу.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/educator/exams/${examId}/edit`}>Хуваарь, тохиргоо</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/educator/groups">Бүлэг сонгох</Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
