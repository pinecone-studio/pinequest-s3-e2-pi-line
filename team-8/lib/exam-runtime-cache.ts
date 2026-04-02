import { createHash } from "node:crypto";
import { redis } from "@/lib/redis";
import type { AnswerChangeAnalytics, ProctorEventType } from "@/lib/proctoring";

type ProctorEventMetadataValue = string | number | boolean | null;
type ProctorEventMetadata = Record<string, ProctorEventMetadataValue>;

const EXAM_RUNTIME_CACHE_TTL_SECONDS = 7200;
const PROCTOR_DEDUPE_METADATA_OMIT_KEYS = new Set([
  "derived_risk_delta",
  "downtime_seconds",
  "risk_level",
  "risk_score",
  "snapshot_url",
]);

export function getSessionAnswersCacheKey(sessionId: string, userId: string) {
  return `session:${sessionId}:user:${userId}:answers`;
}

export function getSessionAnswerMetaCacheKey(sessionId: string, userId: string) {
  return `session:${sessionId}:user:${userId}:answer-meta`;
}

export function getSessionMetaCacheKey(sessionId: string, userId: string) {
  return `session:${sessionId}:user:${userId}:meta`;
}

export function getSessionHeartbeatCacheKey(sessionId: string) {
  return `heartbeat:session:${sessionId}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => left.localeCompare(right),
  );

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(",")}}`;
}

export function getProctorEventDedupeKey(
  sessionId: string,
  eventType: ProctorEventType,
  metadata: ProctorEventMetadata = {},
) {
  const normalizedMetadata = Object.fromEntries(
    Object.entries(metadata).filter(
      ([key, value]) =>
        !PROCTOR_DEDUPE_METADATA_OMIT_KEYS.has(key) && value !== undefined,
    ),
  );
  const hash = createHash("sha1")
    .update(`${eventType}:${stableStringify(normalizedMetadata)}`)
    .digest("hex");

  return `proctor-dedupe:${sessionId}:${eventType}:${hash}`;
}

export async function writeExamDraftDeltaToRedis(input: {
  sessionId: string;
  userId: string;
  answers: Record<string, string>;
  answerAnalytics?: Record<string, AnswerChangeAnalytics>;
}) {
  const {
    sessionId,
    userId,
    answers,
    answerAnalytics = {},
  } = input;
  const redisKey = getSessionAnswersCacheKey(sessionId, userId);
  const analyticsKey = getSessionAnswerMetaCacheKey(sessionId, userId);
  const toSet: Record<string, string> = {};
  const toDelete: string[] = [];
  const analyticsToSet: Record<string, string> = {};

  for (const [questionId, answer] of Object.entries(answers)) {
    if (answer === "") {
      toDelete.push(questionId);
    } else {
      toSet[questionId] = answer;
    }
  }

  for (const [questionId, analytics] of Object.entries(answerAnalytics)) {
    analyticsToSet[questionId] = JSON.stringify(analytics);
  }

  const pipeline = redis.pipeline();
  let hasMutations = false;

  if (Object.keys(toSet).length > 0) {
    pipeline.hset(redisKey, toSet);
    hasMutations = true;
  }

  if (Object.keys(analyticsToSet).length > 0) {
    pipeline.hset(analyticsKey, analyticsToSet);
    pipeline.expire(analyticsKey, EXAM_RUNTIME_CACHE_TTL_SECONDS);
    hasMutations = true;
  }

  for (const questionId of toDelete) {
    pipeline.hdel(redisKey, questionId);
    hasMutations = true;
  }

  if (hasMutations) {
    pipeline.expire(redisKey, EXAM_RUNTIME_CACHE_TTL_SECONDS);
    await pipeline.exec();
  }

  return { success: true as const, mutated: hasMutations };
}
