import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isQuestionComplete, parseQuestionRecord } from "@/lib/question-editor";
import { DiscoverSetLibrary, type PublicDashboardSet } from "../DiscoverSetLibrary";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(date);
}

export default async function DiscoverPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?role=teacher");
  }

  const publicSets = await prisma.quizSet.findMany({
    where: { isPublic: true },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      updatedAt: true,
      owner: { select: { name: true } },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          quizSetId: true,
          prompt: true,
          choices: true,
          answer: true,
          order: true,
        },
      },
      _count: { select: { questions: true, gameRooms: true } },
    },
  });

  const sets: PublicDashboardSet[] = publicSets
    .filter(
      (set) =>
        set.questions.length > 0 &&
        set.questions.map(parseQuestionRecord).every(isQuestionComplete),
    )
    .map((set) => ({
      id: set.id,
      title: set.title,
      description: set.description,
      ownerName: set.owner.name?.trim() || "Ploovo 선생님",
      updatedAt: set.updatedAt.toISOString(),
      updatedLabel: formatDate(set.updatedAt),
      questionCount: set._count.questions,
      playCount: set._count.gameRooms,
    }));

  return (
    <section className="dashboard-content dashboard-library" aria-labelledby="discover-title">
      <header className="dashboard-title-row">
        <div>
          <p className="dashboard-kicker">DISCOVER</p>
          <h1 id="discover-title">세트 둘러보기</h1>
          <p className="dashboard-subtitle">다른 선생님이 공개한 문제를 확인하고 바로 수업에 사용하세요.</p>
        </div>
        <Link className="dashboard-title-action" href="/dashboard/sets/new">
          <Plus aria-hidden="true" /> 새 문제 세트
        </Link>
      </header>

      <DiscoverSetLibrary sets={sets} />
    </section>
  );
}
