import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getTeachersWithAssignments } from "@/lib/admin/actions";
import { getSubjects } from "@/lib/subject/actions";
import TeacherAssignmentPanel from "../_features/TeacherAssignmentPanel";
import { buildDepartmentGroups } from "../_features/teacher-department-utils";
import { ChevronDown } from "lucide-react";

export default async function AdminTeacherDepartmentPage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  const { departmentId } = await params;
  const [teachers, subjects] = await Promise.all([
    getTeachersWithAssignments(),
    getSubjects(),
  ]);

  const departments = buildDepartmentGroups(teachers);
  const department = departments.find((item) => item.id === departmentId);

  if (!department) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="w-31 h-10 bg-[#F0EEEE] py-2.5 px-4 flex gap-3 font-medium items-center rounded-lg">
        <p>Ангилах</p>
        <ChevronDown size={16} />
      </div>
      <section className="rounded-xl shadow-sm bg-white p-4">
        <div className="flex flex-col gap-3  md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[20px] font-semibold tracking-tight text-zinc-950">
              {department.title}
            </h2>
            <p className="mt-1 text-[16px] text-zinc-500">
              {department.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-full bg-[#F2F8FF] text-[#6B6B6B] text-[14px] font-semibold py-4 px-7">
              {department.teachers.length} багш
            </Badge>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {department.teachers.map((teacher) => (
            <TeacherAssignmentPanel
              key={teacher.id}
              teacher={teacher}
              allSubjects={subjects}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
