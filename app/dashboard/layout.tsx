import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "./DashboardShell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?role=teacher");
  }

  const displayName = session.user.name ?? session.user.email ?? "선생님";

  return <DashboardShell displayName={displayName}>{children}</DashboardShell>;
}
