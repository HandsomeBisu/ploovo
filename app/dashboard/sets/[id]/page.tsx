import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "../../DashboardShell";

export default async function QuizSetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login?role=teacher");
  }

  const { id } = await params;
  const set = await prisma.quizSet.findFirst({
    where: {
      id,
      owner: { email: session.user.email },
    },
    select: {
      title: true,
      description: true,
      updatedAt: true,
      questions: {
        orderBy: { order: "asc" },
        select: { id: true, prompt: true },
        take: 5,
      },
      _count: {
        select: { questions: true, gameRooms: true },
      },
    },
  });

  if (!set) {
    notFound();
  }

  const displayName = session.user.name ?? session.user.email ?? "선생님";

  return (
    <DashboardShell displayName={displayName} current="sets">
      <section className="dashboard-content" aria-labelledby="set-title">
        <div className="dashboard-title-row">
          <div>
            <p className="dashboard-kicker">QUIZ SET</p>
            <h1 id="set-title">{set.title}</h1>
          </div>
          <Link className="dashboard-title-action" href={`/dashboard/sets/${id}/edit`}>
            문제 편집
          </Link>
        </div>

        <article className="set-detail-panel">
          <h2>세트 정보</h2>
          <p>{set.description || "설명이 아직 없어요."}</p>
          <div className="set-detail-stats">
            <span>{set._count.questions}문항</span>
            <span>{set._count.gameRooms}번 진행</span>
            <span>{set.updatedAt.toLocaleDateString("ko-KR")} 수정</span>
          </div>

          {set.questions.length > 0 ? (
            <ul className="question-preview-list" aria-label="문항 미리보기">
              {set.questions.map((question) => (
                <li key={question.id}>{question.prompt}</li>
              ))}
            </ul>
          ) : (
            <p>아직 문제가 없어요. 문제 편집에서 첫 문제를 추가해 보세요.</p>
          )}
        </article>
      </section>
    </DashboardShell>
  );
}
