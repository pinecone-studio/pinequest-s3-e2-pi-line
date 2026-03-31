"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MathContent from "@/components/math/MathContent";

function parseStringArray(value: unknown) {
  try {
    const parsed = JSON.parse(String(value ?? "[]")) as string[];
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return String(value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function normalizeTextValue(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function parseMatchingPairs(options: unknown) {
  if (!Array.isArray(options)) return [];

  return options
    .map((option) => {
      const [left, right] = String(option).split("|||");
      if (!left || !right) return null;
      return { left, right };
    })
    .filter((item): item is { left: string; right: string } => Boolean(item));
}

function renderAnswerValue(
  question: Record<string, unknown>,
  rawAnswer: unknown,
  fallback = "Хариулаагүй",
) {
  const type = String(question.type ?? "");
  const hasAnswer = Boolean(rawAnswer && String(rawAnswer).trim() !== "");

  if (type === "multiple_choice") {
    const options = Array.isArray(question.options)
      ? question.options.map((item) => String(item))
      : [];
    const selected = hasAnswer ? normalizeTextValue(rawAnswer) : "";

    if (options.length === 0) {
      return (
        <MathContent
          text={String(rawAnswer)}
          className="prose prose-sm max-w-none font-medium text-foreground"
        />
      );
    }

    return (
      <div className="space-y-4">
        {options.map((option) => {
          const isSelected =
            normalizeTextValue(option) === selected && selected.length > 0;
          return (
            <div
              key={option}
              className={`rounded-2xl px-5 py-4 text-sm ${
                isSelected
                  ? "bg-[#DDEFD9] text-slate-900"
                  : "bg-[#EDEDED] text-slate-900"
              }`}
            >
              <MathContent text={option} className="text-[16px]" />
            </div>
          );
        })}
      </div>
    );
  }

  if (type === "multiple_response") {
    const values = hasAnswer ? parseStringArray(rawAnswer) : [];
    const options = Array.isArray(question.options)
      ? question.options.map((item) => String(item))
      : [];
    if (options.length > 0) {
      const selectedSet = new Set(
        values.map((item) => normalizeTextValue(item)),
      );
      return (
        <div className="space-y-4">
          {options.map((option) => {
            const isSelected = selectedSet.has(normalizeTextValue(option));
            return (
              <div
                key={option}
                className={`rounded-2xl px-5 py-4 text-sm ${
                  isSelected
                    ? "bg-[#DDEFD9] text-slate-900"
                    : "bg-[#EDEDED] text-slate-900"
                }`}
              >
                <MathContent text={option} className="text-[16px]" />
              </div>
            );
          })}
        </div>
      );
    }

    if (values.length === 0) {
      return (
        <span className="font-medium text-muted-foreground">{fallback}</span>
      );
    }

    return (
      <div className="space-y-1">
        {values.map((value) => (
          <MathContent
            key={value}
            text={value}
            className="prose prose-sm max-w-none font-medium text-foreground"
          />
        ))}
      </div>
    );
  }

  if (type === "matching") {
    try {
      const parsed = JSON.parse(String(rawAnswer)) as Record<string, string>;
      const entries = Object.entries(parsed).filter(
        ([, value]) => String(value ?? "").trim() !== "",
      );

      if (entries.length === 0) {
        return (
          <span className="font-medium text-muted-foreground">{fallback}</span>
        );
      }

      return (
        <div className="space-y-1.5">
          {entries.map(([left, right]) => (
            <div
              key={left}
              className="grid gap-1 sm:grid-cols-[1fr_auto_1fr] sm:items-center"
            >
              <MathContent
                text={left}
                className="prose prose-sm max-w-none font-medium text-foreground"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <MathContent
                text={right}
                className="prose prose-sm max-w-none font-medium text-foreground"
              />
            </div>
          ))}
        </div>
      );
    } catch {
      return (
        <MathContent
          text={String(rawAnswer)}
          className="prose prose-sm max-w-none font-medium text-foreground"
        />
      );
    }
  }

  if (!hasAnswer) {
    return (
      <span className="font-medium text-muted-foreground">{fallback}</span>
    );
  }

  return (
    <MathContent
      text={String(rawAnswer)}
      className="prose prose-sm max-w-none font-medium text-foreground"
    />
  );
}

function renderCorrectAnswer(question: Record<string, unknown>) {
  const type = String(question.type ?? "");

  if (type === "matching") {
    const pairs = parseMatchingPairs(question.options);
    if (pairs.length === 0) return null;

    return (
      <div className="space-y-1.5">
        {pairs.map((pair) => (
          <div
            key={`${pair.left}-${pair.right}`}
            className="grid gap-1 sm:grid-cols-[1fr_auto_1fr] sm:items-center"
          >
            <MathContent
              text={pair.left}
              className="prose prose-sm max-w-none font-medium text-green-700"
            />
            <span className="text-xs text-green-700">→</span>
            <MathContent
              text={pair.right}
              className="prose prose-sm max-w-none font-medium text-green-700"
            />
          </div>
        ))}
      </div>
    );
  }

  if (type === "multiple_response") {
    const values = parseStringArray(question.correct_answer);
    if (values.length === 0) return null;

    return (
      <div className="space-y-1">
        {values.map((value) => (
          <MathContent
            key={value}
            text={value}
            className="prose prose-sm max-w-none font-medium text-green-700"
          />
        ))}
      </div>
    );
  }

  if (!question.correct_answer) return null;

  return (
    <MathContent
      text={String(question.correct_answer)}
      className="prose prose-sm max-w-none font-medium text-green-700"
    />
  );
}

interface QuestionStepperProps {
  answers: unknown[];
  canViewDetailedFeedback: boolean;
  isFinalized: boolean;
}

export default function QuestionStepper({
  answers,
  canViewDetailedFeedback,
  isFinalized,
}: QuestionStepperProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const items = answers ?? [];

  if (!canViewDetailedFeedback || items.length === 0) {
    return null;
  }

  const safeIndex = Math.min(activeIndex, items.length - 1);
  const ans = items[safeIndex];
  const q = Array.isArray(ans.questions) ? ans.questions[0] : ans.questions;
  if (!q) return null;

  const isEssay: boolean = q.type === "essay";
  const isCorrect: boolean | null =
    ans.derivedIsCorrect ?? ans.is_correct ?? null;
  const score: number = Number(ans.derivedScore ?? ans.score ?? 0);
  const points: number = Number(q.points ?? 0);
  const isChoiceList =
    q.type === "multiple_choice" || q.type === "multiple_response";

  return (
    <div className="space-y-6">
      <div>
        <div className="pt-4 space-y-2">
          <div className="flex items-start justify-between gap-2 ">
            <div className="flex items-start gap-2 w-201">
              <span className="text-[20px] font-semibold">
                Aсуулт {safeIndex + 1}:
              </span>{" "}
              <div className="text-[20px] mb-15 ">
                <MathContent
                  html={(q.content_html as string | null) ?? null}
                  text={String(q.content ?? "")}
                />
              </div>
            </div>
            <span className="text-[12px] pt-2">
              {score} / {points} оноо
            </span>
          </div>
          <div
            className={
              isChoiceList ? "text-sm" : "rounded bg-muted/50 px-3 py-2 text-sm"
            }
          >
            {!isChoiceList && (
              <span className="text-muted-foreground">Таны хариулт: </span>
            )}
            <div
              className={
                isChoiceList
                  ? ""
                  : isEssay
                    ? ""
                    : isCorrect
                      ? "text-green-700"
                      : "text-red-700"
              }
            >
              {renderAnswerValue(q as Record<string, unknown>, ans.answer)}
            </div>
          </div>
          {!isEssay && !isCorrect && (
            <div className="rounded bg-green-50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Зөв хариулт: </span>
              <div className="mt-1">
                {renderCorrectAnswer(q as Record<string, unknown>)}
              </div>
            </div>
          )}
          {q?.explanation && (
            <div className="text-xs italic text-muted-foreground">
              <MathContent text={String(q.explanation)} />
            </div>
          )}
          {isEssay && ans.feedback && (
            <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
              <span className="font-medium text-blue-700">
                Багшийн тайлбар:{" "}
              </span>
              <span>{String(ans.feedback)}</span>
            </div>
          )}
          {isEssay && !isFinalized && (
            <Badge variant="outline" className="text-xs text-blue-600">
              Багш шалгах хүлээгдэж байна
            </Badge>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
              disabled={safeIndex === 0}
            >
              Өмнөх хариулт
            </Button>
            <Button
              type="button"
              onClick={() =>
                setActiveIndex((prev) => Math.min(items.length - 1, prev + 1))
              }
              disabled={safeIndex === items.length - 1}
            >
              Дараах
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
