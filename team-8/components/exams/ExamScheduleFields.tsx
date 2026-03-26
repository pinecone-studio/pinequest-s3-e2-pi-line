"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Clock3, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function splitIsoForUlaanbaatar(iso?: string | null) {
  if (!iso) {
    return { date: "", time: "" };
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { date: "", time: "" };
  }

  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const partMap = new Map(parts.map((part) => [part.type, part.value]));

  return {
    date: `${partMap.get("year")}-${partMap.get("month")}-${partMap.get("day")}`,
    time: `${partMap.get("hour")}:${partMap.get("minute")}`,
  };
}

function joinDateTime(date: string, time: string) {
  if (!date || !time) return "";
  return `${date}T${time}`;
}

function formatDateTime(value: string) {
  if (!value) return "Сонгоогүй";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Сонгоогүй";

  return new Intl.DateTimeFormat("mn-MN", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ulaanbaatar",
  }).format(date);
}

type ExamScheduleFieldsProps = {
  initialStartTime?: string | null;
  initialEndTime?: string | null;
  initialDurationMinutes?: number | null;
  initialPassingScore?: number | null;
  initialMaxAttempts?: number | null;
  initialShuffleQuestions?: boolean;
  initialShuffleOptions?: boolean;
};

const durationPresets = [30, 40, 45, 60, 80];

export default function ExamScheduleFields({
  initialStartTime,
  initialEndTime,
  initialDurationMinutes,
  initialPassingScore,
  initialMaxAttempts,
  initialShuffleQuestions = false,
  initialShuffleOptions = false,
}: ExamScheduleFieldsProps) {
  const [startDate, setStartDate] = useState(
    splitIsoForUlaanbaatar(initialStartTime).date
  );
  const [startClock, setStartClock] = useState(
    splitIsoForUlaanbaatar(initialStartTime).time
  );
  const [endDate, setEndDate] = useState(
    splitIsoForUlaanbaatar(initialEndTime).date
  );
  const [endClock, setEndClock] = useState(
    splitIsoForUlaanbaatar(initialEndTime).time
  );
  const [durationMinutes, setDurationMinutes] = useState(
    initialDurationMinutes ? String(initialDurationMinutes) : ""
  );

  const startTime = joinDateTime(startDate, startClock);
  const endTime = joinDateTime(endDate, endClock);

  const durationSummary = useMemo(() => {
    if (!startTime || !endTime) {
      return {
        minutes: "",
        invalid: false,
        text: "Өдөр, цагаа бүрэн сонгоно уу.",
      };
    }

    const start = new Date(`${startTime}+08:00`);
    const end = new Date(`${endTime}+08:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return {
        minutes: "",
        invalid: true,
        text: "Оруулсан өдөр эсвэл цаг буруу байна.",
      };
    }

    const diff = Math.round((end.getTime() - start.getTime()) / 60000);
    if (diff <= 0) {
      return {
        minutes: "",
        invalid: true,
        text: "Хаагдах хугацаа нь нээгдэх хугацаанаас хойш байх ёстой.",
      };
    }

    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    const parts = [
      hours > 0 ? `${hours} цаг` : null,
      minutes > 0 ? `${minutes} минут` : null,
    ].filter(Boolean);

    return {
      minutes: String(diff),
      invalid: false,
      text: parts.join(" "),
    };
  }, [endTime, startTime]);

  return (
    <div className="space-y-5">
      <input type="hidden" name="start_time" value={startTime} />
      <input type="hidden" name="end_time" value={endTime} />

      <div className="space-y-4 rounded-2xl border p-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">Хуваарь</p>
            <p className="text-sm text-muted-foreground">
              Хэзээнээс хэзээний хооронд шалгалтыг эхлүүлж болох, мөн эхлүүлсний дараа хэдэн минут үргэлжлэхийг энд тохируулна.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border bg-background p-4">
            <p className="text-sm font-medium">Нээгдэх хугацаа</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="exam-start-date">Өдөр</Label>
                <Input
                  id="exam-start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exam-start-time">Цаг</Label>
                <Input
                  id="exam-start-time"
                  type="time"
                  step={60}
                  value={startClock}
                  onChange={(event) => setStartClock(event.target.value)}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(`${startTime}+08:00`)}
            </p>
          </div>

          <div className="space-y-3 rounded-xl border bg-background p-4">
            <p className="text-sm font-medium">Хаагдах хугацаа</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="exam-end-date">Өдөр</Label>
                <Input
                  id="exam-end-date"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exam-end-time">Цаг</Label>
                <Input
                  id="exam-end-time"
                  type="time"
                  step={60}
                  value={endClock}
                  onChange={(event) => setEndClock(event.target.value)}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(`${endTime}+08:00`)}
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border bg-muted/15 p-4">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Шалгалтын үргэлжлэх хугацаа</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Сурагч шалгалтаа эхлүүлсний дараа энэ хугацаа дуустал ажиллаж болно. Энэ хугацаа нээгдэх цонхоос урт байж болно.
          </p>

          <div className="space-y-2">
            <Label htmlFor="duration_minutes">Хугацаа (минут) *</Label>
            <Input
              id="duration_minutes"
              name="duration_minutes"
              type="number"
              min="5"
              max="300"
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {durationPresets.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant={String(preset) === durationMinutes ? "default" : "outline"}
                size="sm"
                onClick={() => setDurationMinutes(String(preset))}
              >
                {preset} мин
              </Button>
            ))}
            {durationMinutes && !durationPresets.includes(Number(durationMinutes)) && (
              <Badge variant="secondary">{durationMinutes} мин</Badge>
            )}
          </div>

          <div className="rounded-lg border bg-background px-3 py-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Нээгдэх цонх</span>
              <span
                className={durationSummary.invalid ? "text-destructive" : "font-medium"}
              >
                {durationSummary.text}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border p-5">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">Дүрэм ба онооны тохиргоо</p>
            <p className="text-sm text-muted-foreground">
              Тэнцэх босго, оролдлогын тоо, санамсаргүй дарааллын тохиргоог энд хийнэ.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="passing_score">Тэнцэх оноо (%)</Label>
            <Input
              id="passing_score"
              name="passing_score"
              type="number"
              min="0"
              max="100"
              defaultValue={initialPassingScore ?? 60}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_attempts">Оролдлогын тоо</Label>
            <Input
              id="max_attempts"
              name="max_attempts"
              type="number"
              min="1"
              max="10"
              defaultValue={initialMaxAttempts ?? 1}
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              id="shuffle_questions"
              name="shuffle_questions"
              defaultChecked={initialShuffleQuestions}
              className="h-4 w-4 rounded border"
            />
            <span>Асуултыг санамсаргүй дарааллаар гаргах</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              id="shuffle_options"
              name="shuffle_options"
              defaultChecked={initialShuffleOptions}
              className="h-4 w-4 rounded border"
            />
            <span>Сонголтуудын дарааллыг холих</span>
          </label>
        </div>
      </div>
    </div>
  );
}
