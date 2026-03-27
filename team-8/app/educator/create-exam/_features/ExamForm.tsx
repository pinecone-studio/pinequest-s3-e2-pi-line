"use client";

import { useState } from "react";
import { School2 } from "lucide-react";
import { createExam } from "@/lib/exam/actions";
import ExamScheduleFields from "@/components/exams/ExamScheduleFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SubjectOption {
  id: string;
  name: string;
  description: string | null;
}

interface GroupOption {
  id: string;
  name: string;
  grade: number | null;
  group_type: string;
  allowed_subject_ids: string[];
}

function formatGroupTypeLabel(groupType: string) {
  if (groupType === "class") return "Анги";
  if (groupType === "elective") return "Сонгон";
  if (groupType === "mixed") return "Холимог";
  return groupType;
}

export default function ExamForm({
  subjects,
  groups,
}: {
  subjects: SubjectOption[];
  groups: GroupOption[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [subjectId, setSubjectId] = useState("__none");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  function getGroupsForSubject(nextSubjectId: string) {
    if (nextSubjectId === "__none") return [];
    return groups.filter(
      (group) =>
        group.allowed_subject_ids.length === 0 ||
        group.allowed_subject_ids.includes(nextSubjectId)
    );
  }

  const availableGroups = getGroupsForSubject(subjectId);
  const selectedGroups = groups.filter((group) =>
    selectedGroupIds.includes(group.id)
  );

  function handleSubjectChange(nextSubjectId: string) {
    const nextGroups = getGroupsForSubject(nextSubjectId);
    setSubjectId(nextSubjectId);
    setSelectedGroupIds((prev) =>
      prev.filter((groupId) => nextGroups.some((group) => group.id === groupId))
    );
  }

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = await createExam(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-4xl">
      <CardHeader className="space-y-2">
        <CardTitle>Шалгалтын мэдээлэл</CardTitle>
        <CardDescription>
          Бүх шалгалтын үндсэн мэдээллийг нэг ижил бүтэцтэйгээр бөглөөд дараагийн
          шатанд асуултаа нэмнэ.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Шалгалтын нэр *</Label>
            <Input
              id="title"
              name="title"
              placeholder="Жишээ: Математик - 1-р улирал"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Хичээл *</Label>
              <Select value={subjectId} onValueChange={handleSubjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Хичээл сонгох" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Сонгоогүй</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="hidden"
                name="subject_id"
                value={subjectId === "__none" ? "" : subjectId}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border bg-muted/15 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <Label>Оноох анги / бүлгүүд</Label>
                <p className="text-sm text-muted-foreground">
                  Нэг шалгалтыг хэд хэдэн анги, сонгон бүлэгт зэрэг оноож болно.
                </p>
              </div>
              <Badge variant="outline" className="h-auto py-1">
                {selectedGroupIds.length} бүлэг сонгосон
              </Badge>
            </div>

            {selectedGroupIds.map((groupId) => (
              <input key={groupId} type="hidden" name="group_ids" value={groupId} />
            ))}

            {subjectId === "__none" ? (
              <div className="rounded-xl border border-dashed bg-background p-4 text-sm text-muted-foreground">
                Эхлээд хичээлээ сонгоод, дараа нь энэ хичээлд хамрагдах анги,
                сонгон бүлгүүдээ тэмдэглэнэ үү.
              </div>
            ) : availableGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-background p-4 text-sm text-muted-foreground">
                Сонгосон хичээл дээр танд оноогдсон бүлэг одоогоор алга байна.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {availableGroups.map((group) => {
                  const selected = selectedGroupIds.includes(group.id);

                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/40 hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-medium">{group.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {group.grade
                              ? `${group.grade}-р анги`
                              : "Анги заагаагүй"}
                            {` · ${formatGroupTypeLabel(group.group_type)}`}
                          </p>
                        </div>
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                            selected
                              ? "bg-primary/10 text-primary"
                              : "bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          <School2 className="h-4 w-4" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedGroups.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedGroups.map((group) => (
                  <button
                    key={`selected-${group.id}`}
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="rounded-full border bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Тайлбар</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Шалгалтын тухай товч мэдээлэл..."
              rows={3}
            />
          </div>

          <ExamScheduleFields />

          <Button
            type="submit"
            loading={loading}
            loadingText="Үүсгэж байна..."
            className="w-full"
          >
            Үүсгэх ба асуулт нэмэх →
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
