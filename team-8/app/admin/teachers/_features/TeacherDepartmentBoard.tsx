"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  buildDepartmentGroups,
  type DepartmentGroup,
} from "./teacher-department-utils";
import type { TeacherAssignmentTeacher } from "./teacher-assignment-types";

export default function TeacherDepartmentBoard({
  teachers,
}: {
  teachers: TeacherAssignmentTeacher[];
}) {
  const departments = buildDepartmentGroups(teachers);

  if (departments.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-zinc-200 py-16 text-center text-muted-foreground">
        Багш бүртгэлгүй байна.
      </div>
    );
  }

  return (
    <div className="grid gap-7 grid-cols-2">
      {departments.map((department) => (
        <DepartmentCard key={department.id} department={department} />
      ))}
    </div>
  );
}

function DepartmentCard({ department }: { department: DepartmentGroup }) {
  const Icon = department.icon;

  return (
    <Link
      href={`/admin/teachers/${department.id}`}
      className={cn(
        "rounded-[28px] border-2 border-zinc-200 bg-gradient-to-br px-5 py-5 text-left transition-all cursor-pointer hover:border-[#9fc3ff] hover:shadow-[0_16px_40px_rgba(47,128,237,0.08)]",
        department.surfaceClassName,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={cn(
            "rounded-2xl border px-3 py-3",
            department.accentClassName,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <Badge
          variant="outline"
          className="rounded-full bg-white/80 text-zinc-600 text-[14px] font-semibold py-3 px-7"
        >
          {department.teachers.length} багш
        </Badge>
      </div>

      <div className="mt-4 space-y-2">
        <h3 className="text-[20px] font-semibold text-zinc-950">
          {department.title}
        </h3>
        <p className="text-[16px] leading-6 text-[#4A5565]">
          {department.description}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between text-[14px]">
        <span className="text-[#6A7282]">
          {department.subjectCount} хичээл оноолт
        </span>
        <span className="inline-flex items-center gap-2.5 font-semibold text-[16px] text-zinc-600 transition-colors hover:text-[#4078C1]">
          Дэлгэрэнгүй
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
