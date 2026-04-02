import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

function createRatelimit(limit: number, window: `${number} s` | `${number} m`) {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
  });
}

export const startExamRateLimit = createRatelimit(6, "10 s");
export const submitExamRateLimit = createRatelimit(4, "30 s");
export const proctorEventRateLimit = createRatelimit(40, "60 s");

// Exam-level burst smoothing: 500 сурагч нэгэн зэрэг эхлүүлэхэд burst-ийг зөөлрүүлнэ
// Initial burst: 100 token, дараа нь секундэд 50 token нэмэгдэнэ
// Key: exam-burst:{examId} — per exam, not per user
export const examBurstRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.tokenBucket(50, "1 s", 100),
  analytics: true,
});

// Exam-level submit burst smoothing: олон сурагч нэгэн зэрэг finish дарахад
// session finalize болон answer upsert дээр огцом spike үүсэхээс хамгаална.
// Key: exam-submit:{examId} — per exam, not per user
export const examSubmitBurstRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.tokenBucket(30, "1 s", 60),
  analytics: true,
});

// Backward-compatible generic limiter
export const ratelimit = startExamRateLimit;
