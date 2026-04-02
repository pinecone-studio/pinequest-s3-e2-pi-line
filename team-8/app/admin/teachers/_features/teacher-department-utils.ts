import {
  BookMarked,
  Landmark,
  Languages,
  Sigma,
  UsersRound,
} from "lucide-react";
import type {
  Subject,
  TeacherAssignmentTeacher,
} from "./teacher-assignment-types";

export type DepartmentMeta = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  icon: typeof Sigma;
  accentClassName: string;
  surfaceClassName: string;
};

export type DepartmentGroup = DepartmentMeta & {
  teachers: TeacherAssignmentTeacher[];
  subjectCount: number;
};

export const DEPARTMENT_META: DepartmentMeta[] = [
  {
    id: "science-tech",
    title: "Байгалийн ухаан, технологийн тaнхим",
    description: "Математик, физик, хими, биологи, мэдээлэл зүйн багш нар",
    keywords: [
      "математик",
      "физик",
      "хими",
      "биологи",
      "мэдээлэл",
      "информатик",
      "technology",
      "math",
      "physics",
      "chemistry",
      "biology",
    ],
    icon: Sigma,
    accentClassName: "text-[#1d4ed8] bg-[#e9f1ff] border-[#bfd6ff]",
    surfaceClassName: "from-[#f8fbff] to-[#edf5ff]",
  },
  {
    id: "social",
    title: "Нийгмийн ухааны тэнхим",
    description: "Түүх, нийгэм, газарзүй, иргэний боловсролын багш нар",
    keywords: [
      "түүх",
      "нийгэм",
      "газарзүй",
      "иргэний",
      "ёс",
      "geography",
      "history",
      "social",
    ],
    icon: Landmark,
    accentClassName: "text-[#b45309] bg-[#fff3df] border-[#ffd8a8]",
    surfaceClassName: "from-[#fffaf1] to-[#fff3e2]",
  },
  {
    id: "language-humanities",
    title: "Хэл, хүмүүнлэгийн тэнхим",
    description: "Монгол, англи хэл болон хүмүүнлэгийн чиглэлийн багш нар",
    keywords: [
      "монгол",
      "англи",
      "хэл",
      "уран",
      "literature",
      "language",
      "english",
    ],
    icon: Languages,
    accentClassName: "text-[#7c3aed] bg-[#f3ebff] border-[#dccbff]",
    surfaceClassName: "from-[#fbf8ff] to-[#f4eeff]",
  },
  {
    id: "other",
    title: "Бусад хичээлийн тэнхим",
    description: "Дээрх ангилалд ороогүй бусад хичээлүүдийн бүлэг",
    keywords: [],
    icon: BookMarked,
    accentClassName: "text-[#0f766e] bg-[#e8fbf7] border-[#b8efe4]",
    surfaceClassName: "from-[#f5fffc] to-[#ebfbf7]",
  },
  {
    id: "unassigned",
    title: "Хичээл оноогоогүй багш нар",
    description: "Одоогоор хичээл оноолт аваагүй багш нарын жагсаалт",
    keywords: [],
    icon: UsersRound,
    accentClassName: "text-[#475569] bg-[#f1f5f9] border-[#dbe5f0]",
    surfaceClassName: "from-[#fbfdff] to-[#f4f7fb]",
  },
];

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export function inferDepartment(subjects: Subject[]) {
  if (subjects.length === 0) {
    return DEPARTMENT_META.find((item) => item.id === "unassigned")!;
  }

  const scores = new Map<string, number>();

  for (const subject of subjects) {
    const normalized = normalizeText(subject.name);

    for (const meta of DEPARTMENT_META) {
      if (meta.id === "other" || meta.id === "unassigned") continue;
      if (meta.keywords.some((keyword) => normalized.includes(keyword))) {
        scores.set(meta.id, (scores.get(meta.id) ?? 0) + 1);
      }
    }
  }

  const topDepartmentId = [...scores.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0]?.[0];

  if (!topDepartmentId) {
    return DEPARTMENT_META.find((item) => item.id === "other")!;
  }

  return (
    DEPARTMENT_META.find((item) => item.id === topDepartmentId) ??
    DEPARTMENT_META.find((item) => item.id === "other")!
  );
}

export function buildDepartmentGroups(
  teachers: TeacherAssignmentTeacher[],
): DepartmentGroup[] {
  const grouped = new Map<string, TeacherAssignmentTeacher[]>();

  for (const teacher of teachers) {
    const department = inferDepartment(teacher.subjects);
    const existing = grouped.get(department.id) ?? [];
    existing.push(teacher);
    grouped.set(department.id, existing);
  }

  return DEPARTMENT_META.map((meta) => {
    const departmentTeachers = (grouped.get(meta.id) ?? []).sort(
      (left, right) =>
        (left.full_name || left.email).localeCompare(
          right.full_name || right.email,
        ),
    );

    return {
      ...meta,
      teachers: departmentTeachers,
      subjectCount: departmentTeachers.reduce(
        (total, teacher) => total + teacher.subjects.length,
        0,
      ),
    };
  }).filter((department) => department.teachers.length > 0);
}
