import { createAdminClient } from "@/lib/supabase/admin";
import { writeExamDraftDeltaToRedis } from "@/lib/exam-runtime-cache";
import { verifyStudentRuntimeToken } from "@/lib/student-runtime-token";
import type { AnswerChangeAnalytics } from "@/lib/proctoring";

type ExamRuntimeFlushBody = {
  sessionId?: unknown;
  runtimeToken?: unknown;
  answers?: unknown;
  answerAnalytics?: unknown;
  reason?: unknown;
};

function normalizeAnswerMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, string>;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([questionId, answer]) => [
      questionId,
      String(answer ?? ""),
    ]),
  );
}

function normalizeAnswerAnalytics(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, AnswerChangeAnalytics>;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(
      ([questionId, analytics]) => [
        questionId,
        {
          changeCount: Number(
            (analytics as { changeCount?: number } | null)?.changeCount ?? 0,
          ),
          firstAnsweredAt:
            typeof (analytics as { firstAnsweredAt?: unknown } | null)
              ?.firstAnsweredAt === "string"
              ? ((analytics as { firstAnsweredAt?: string }).firstAnsweredAt ??
                null)
              : null,
          lastChangedAt:
            typeof (analytics as { lastChangedAt?: unknown } | null)
              ?.lastChangedAt === "string"
              ? ((analytics as { lastChangedAt?: string }).lastChangedAt ??
                null)
              : null,
        } satisfies AnswerChangeAnalytics,
      ],
    ),
  );
}

async function readRequestJson(request: Request) {
  try {
    return (await request.json()) as ExamRuntimeFlushBody;
  } catch {
    try {
      const raw = await request.text();
      return raw ? (JSON.parse(raw) as ExamRuntimeFlushBody) : {};
    } catch {
      return {};
    }
  }
}

export async function POST(request: Request) {
  const body = await readRequestJson(request);
  const sessionId = String(body.sessionId ?? "").trim();
  const runtimeToken = String(body.runtimeToken ?? "").trim();

  if (!sessionId || !runtimeToken) {
    return Response.json({ error: "Missing sessionId or runtimeToken" }, {
      status: 400,
    });
  }

  const verifiedToken = verifyStudentRuntimeToken(runtimeToken, sessionId);
  if (!verifiedToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("exam_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .eq("user_id", verifiedToken.userId)
    .maybeSingle();

  if (!session || session.status !== "in_progress") {
    return new Response(null, { status: 204 });
  }

  await writeExamDraftDeltaToRedis({
    sessionId,
    userId: verifiedToken.userId,
    answers: normalizeAnswerMap(body.answers),
    answerAnalytics: normalizeAnswerAnalytics(body.answerAnalytics),
  });

  return new Response(null, { status: 204 });
}
