import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "./DashboardShell";

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
      id: true,
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
  const sets = teacher.quizSets;

  return (
    <DashboardShell displayName={displayName} current="sets">
      <section className="dashboard-content" aria-labelledby="dashboard-title">
        <div className="dashboard-title-row">
          <div>
            <p className="dashboard-kicker">MY SETS</p>
            <h1 id="dashboard-title">내 문제 세트</h1>
          </div>
          <Link className="dashboard-title-action" href="/dashboard/sets/new">
            <Icon type="edit" />
            새 세트
          </Link>
        </div>

        {sets.length === 0 ? (
          <div className="sets-empty-shell">
            <article className="sets-empty-card">
              <p>게임을 열려면 먼저 문제 세트가 필요해요.</p>
              <div className="sets-empty-actions">
                <Link className="button button-primary" href="/dashboard/sets/new">
                  <Icon type="edit" />
                  세트 만들기
                </Link>
                <Link className="button button-secondary" href="/dashboard/discover">
                  <Icon type="compass" />
                  세트 찾아보기
                </Link>
              </div>
              <a className="sets-tutorial-link" href="#quick-start">
                빠른 시작 보기
              </a>
            </article>
          </div>
        ) : (
          <div className="sets-grid" aria-label="내 문제 세트 목록">
            {sets.map((set) => (
              <article className="set-card" key={set.id}>
                <div className="set-card-top">
                  <span>{set._count.questions}문항</span>
                  <small>{formatDate(set.updatedAt)} 수정</small>
                </div>
                <h2>{set.title}</h2>
                <p>{set.description || "설명이 아직 없어요."}</p>
                <div className="set-card-bottom">
                  <span>{set._count.gameRooms}번 진행</span>
                  <Link href={`/dashboard/sets/${set.id}/edit`}>편집</Link>
                </div>
              </article>
            ))}
          </div>
        )}

        <section id="quick-start" className="quick-start" aria-label="빠른 시작">
          <article>
            <strong>1. 세트 만들기</strong>
            <span>수업 주제와 설명을 먼저 적어두세요.</span>
          </article>
          <article>
            <strong>2. 문항 채우기</strong>
            <span>객관식, 정답, 해설 흐름을 이어서 붙이면 됩니다.</span>
          </article>
          <article>
            <strong>3. 게임 열기</strong>
            <span>PIN을 학생들에게 알려주고 바로 참여를 받습니다.</span>
          </article>
        </section>
      </section>
    </DashboardShell>
  );
}

function Icon({ type }: { type: "edit" | "compass" }) {
  if (type === "compass") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m13.5 8.5 2 2" />
    </svg>
  );
}
