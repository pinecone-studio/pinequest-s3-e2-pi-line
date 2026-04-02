"use client";

import { Fragment } from "react";
import { Trash2 } from "lucide-react";
import MathContent from "@/components/math/MathContent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteQuestion } from "@/lib/question/actions";
import { cn } from "@/lib/utils";
import type { Question, QuestionPassage } from "@/types";
import EditQuestionDialog from "./EditQuestionDialog";

const typeLabels: Record<string, string> = {
  multiple_choice: "Сонгох",
  multiple_response: "Олон зөв",
  essay: "Задгай / Эссэ",
  fill_blank: "Нөхөх",
  matching: "Холбох",
};

interface Props {
  questions: Question[];
  examId: string;
  passages: QuestionPassage[];
  isLocked?: boolean;
  className?: string;
  showSummary?: boolean;
}

export default function QuestionList({
  questions,
  examId,
  passages,
  isLocked = false,
  className,
  showSummary = true,
}: Props) {
  const renderedPassages = new Set<string>();

  async function handleDelete(questionId: string) {
    await deleteQuestion(questionId, examId);
  }

  function formatCorrectAnswer(value: string | null, type: string) {
    if (!value) return null;

    if (type === "multiple_response") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.join(", ");
        }
      } catch {}
    }

    return value;
  }

  if (questions.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed p-10 text-center text-muted-foreground",
          className
        )}
      >
        Асуулт байхгүй байна.
      </div>
    );
  }

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div
      className={cn(
        "min-h-0 overflow-y-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      <div className="space-y-3">
        {showSummary ? (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{questions.length} асуулт</span>
            <span>Нийт оноо: {totalPoints}</span>
          </div>
        ) : null}

        {questions.map((q) => {
          const passage = q.question_passages;
          const shouldRenderPassage =
            Boolean(passage?.id) && !renderedPassages.has(String(passage?.id));

          if (passage?.id) {
            renderedPassages.add(passage.id);
          }

          const correctAnswerText = formatCorrectAnswer(q.correct_answer, q.type);

          return (
            <Fragment key={q.id}>
              {shouldRenderPassage && passage && (
                <Card className="border-dashed bg-muted/20">
                  <CardContent className="space-y-3 pt-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Нийтлэг өгөгдөл</Badge>
                      {passage.title && (
                        <span className="font-medium">{passage.title}</span>
                      )}
                    </div>
                    <MathContent
                      html={passage.content_html}
                      text={passage.content}
                      className="prose prose-sm max-w-none text-foreground"
                    />
                    {passage.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={passage.image_url}
                        alt="Нийтлэг өгөгдлийн зураг"
                        className="max-h-64 rounded-lg border"
                      />
                    )}
                  </CardContent>
                </Card>
              )}

              <Card
                className={cn(
                  "rounded-[28px] border border-[#E2E8F0] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]",
                  q.ai_variant_enabled ? "border-amber-200 bg-amber-50/30" : undefined
                )}
              >
                <CardContent className="grid grid-cols-[minmax(0,1fr)_108px] items-center gap-4 px-6 py-5">
                  <div className="min-w-0 space-y-3">
                    <MathContent
                      html={q.content_html}
                      text={q.content}
                      className="prose prose-sm max-w-none break-words text-[18px] font-semibold text-foreground"
                    />
                    {correctAnswerText ? (
                      <p className="text-[14px] font-medium text-[#1E90FF]">
                        Зөв хариулт: {correctAnswerText}
                      </p>
                    ) : null}
                    {showSummary ? (
                      <div className="flex min-w-0 flex-wrap gap-2">
                        <Badge variant="outline">{typeLabels[q.type] ?? q.type}</Badge>
                        <Badge variant="outline">{q.points} оноо</Badge>
                        {q.ai_variant_enabled ? (
                          <Badge className="border-amber-200 bg-amber-100 text-amber-950 hover:bg-amber-100">
                            AI хувилбар
                          </Badge>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {!isLocked && (
                    <div className="flex min-w-[108px] shrink-0 items-center justify-end gap-2 self-start">
                      <EditQuestionDialog
                        examId={examId}
                        question={q}
                        passages={passages}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-[#EF4444] hover:text-[#DC2626]"
                        onClick={() => handleDelete(q.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
