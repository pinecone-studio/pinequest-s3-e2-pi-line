import { getTeachersWithAssignments } from "@/lib/admin/actions";
import TeacherDepartmentBoard from "./_features/TeacherDepartmentBoard";

export default async function AdminTeachersPage() {
  const teachers = await getTeachersWithAssignments();

  return (
    <div className="space-y-6">
      <h2 className="text-[20px] font-medium tracking-tight">
        Багш нарын танхимын оноолт
      </h2>

      {teachers.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          Багш бүртгэлгүй байна.
        </div>
      ) : (
        <TeacherDepartmentBoard teachers={teachers} />
      )}
    </div>
  );
}
