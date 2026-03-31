import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import Sidebar from "./_features/Sidebar";
import Header from "./_features/Header";
import MobileHeader from "./_features/MobileHeader";
import MobileBottomNav from "./_features/MobileBottomNav";
import StudentShell from "./_features/StudentShell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUser();

  if (!profile) redirect("/login");
  if (profile.role !== "student") {
    redirect(profile.role === "teacher" ? "/educator" : "/admin");
  }

  return (
    <StudentShell
      sidebar={<Sidebar />}
      header={<Header />}
      mobileHeader={<MobileHeader />}
      bottomNav={<MobileBottomNav />}
    >
      {children}
    </StudentShell>
  );
}
