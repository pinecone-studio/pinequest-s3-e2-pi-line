# PineExam

Learning management and online exam MVP for school environments.

## Cron setup on Vercel Hobby

`vercel.json` keeps only the weekly digest job on Vercel:

- `GET /api/notifications/weekly-parent-digest` on `0 0 * * 1`

`student-learning` and `exam-results` no longer rely on scheduled cron jobs:

- `student-learning` work is drained by `after(...)` plus in-app polling while the student is on the learning/practice pages.
- `exam-results` processing is handled by submit-time `after(...)` plus result page/list refreshes while grading is pending.

The protected ops routes still exist for manual recovery:

- `GET /api/student-learning/process`
- `GET /api/student-learning/recompute-mastery`
- `GET /api/exam-results/process`

They still require:

```text
Authorization: Bearer ${CRON_SECRET}
```

This keeps Hobby deployment simple without an external scheduler, while preserving a manual fallback for backlog recovery.
