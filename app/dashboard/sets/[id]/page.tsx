import Link from "next/link";
import { ArrowLeft, FilePenLine, Gamepad2, Globe2, LockKeyhole, Settings } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseQuestionRecord } from "@/lib/question-editor";
import { QuizSetQuestionList } from "../../QuizSetQuestionList";
import { SavedSetToast } from "../../SavedSetToast";

export default async function QuizSetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
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
      isPublic: true,
      updatedAt: true,
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
      _count: {
        select: { questions: true, gameRooms: true },
      },
    },
  });

  if (!set) {
    notFound();
  }

  const { saved } = await searchParams;
  const questions = set.questions.map(parseQuestionRecord);

  return (
      <section className="dashboard-content" aria-labelledby="set-title">
        <Link className="set-detail-back" href="/dashboard">
          <ArrowLeft aria-hidden="true" />
          내 문제 세트
        </Link>
        <div className="dashboard-title-row">
          <div>
            <p className="dashboard-kicker">QUIZ SET</p>
            <h1 id="set-title">{set.title}</h1>
          </div>
          <div className="set-detail-actions">
            <Link className="dashboard-title-action is-quiet" href={`/dashboard/play?set=${id}`}>
              <Gamepad2 aria-hidden="true" />
              라이브
            </Link>
            <Link className="dashboard-title-action" href={`/dashboard/sets/${id}/edit`}>
              <FilePenLine aria-hidden="true" />
              문제 편집
            </Link>
            <Link className="dashboard-title-action is-quiet" href={`/dashboard/sets/${id}/settings`}>
              <Settings aria-hidden="true" />
              설정
            </Link>
          </div>
        </div>

        <article className="set-detail-panel">
          <div className="public-detail-heading">
            <h2>세트 정보</h2>
            <span className={set.isPublic ? "is-public" : ""}>
              {set.isPublic ? <Globe2 aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
              {set.isPublic ? "공개" : "비공개"}
            </span>
          </div>
          <p>{set.description || "설명이 아직 없어요."}</p>
          <div className="set-detail-stats">
            <span>{set._count.questions}문항</span>
            <span>{set._count.gameRooms}번 진행</span>
            <span>{set.updatedAt.toLocaleDateString("ko-KR")} 수정</span>
          </div>

          <QuizSetQuestionList
            emptyMessage="아직 문제가 없어요. 문제 편집에서 첫 문제를 추가해 보세요."
            questions={questions}
          />
        </article>
        <SavedSetToast show={saved === "1"} />
      </section>
  );
}
