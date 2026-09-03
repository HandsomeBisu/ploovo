import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "./DashboardShell";
import { SetLibrary } from "./SetLibrary";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login?role=teacher");
  }

  const teacher = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      name: true,
      email: true,
      quizSets: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          updatedAt: true,
          _count: {
            select: { questions: true, gameRooms: true },
          },
        },
      },
    },
  });

  if (!teacher) {
    redirect("/login?role=teacher");
  }

  const displayName = teacher.name ?? teacher.email ?? "선생님";
  const sets = teacher.quizSets.map((set) => ({
    id: set.id,
    title: set.title,
    description: set.description,
    updatedAt: set.updatedAt.toISOString(),
    updatedLabel: formatDate(set.updatedAt),
    questionCount: set._count.questions,
    playCount: set._count.gameRooms,
  }));

  return (
    <DashboardShell displayName={displayName} current="sets">
      <section className="dashboard-content dashboard-library" aria-labelledby="dashboard-title">
        <header className="dashboard-title-row">
          <div>
            <p className="dashboard-kicker">문제 세트</p>
            <h1 id="dashboard-title">내 문제 세트</h1>
            <p className="dashboard-subtitle">수업에 쓸 문제를 찾고 바로 게임을 열어보세요.</p>
          </div>
          <Link className="dashboard-title-action" href="/dashboard/sets/new">
            <Plus aria-hidden="true" />
            새 문제 세트
          </Link>
        </header>

        <SetLibrary sets={sets} />
      </section>
    </DashboardShell>
  );
}
