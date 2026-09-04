import Link from "next/link";
import { ArrowLeft, Gamepad2, Globe2 } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isQuestionComplete, parseQuestionRecord } from "@/lib/question-editor";
import { QuizSetQuestionList } from "../../QuizSetQuestionList";

export default async function PublicQuizSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const set = await prisma.quizSet.findFirst({
    where: { id, isPublic: true },
    select: {
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

  if (!set) {
    notFound();
  }

  const questions = set.questions.map(parseQuestionRecord);
  if (questions.length === 0 || questions.some((question) => !isQuestionComplete(question))) {
    notFound();
  }

  const ownerName = set.owner.name?.trim() || "Ploovo 선생님";

  return (
    <section className="dashboard-content" aria-labelledby="public-set-title">
      <Link className="set-detail-back" href="/dashboard/discover">
        <ArrowLeft aria-hidden="true" /> 세트 둘러보기
      </Link>
      <div className="dashboard-title-row">
        <div>
          <p className="dashboard-kicker public-set-kicker"><Globe2 aria-hidden="true" /> 공개 세트 · {ownerName}</p>
          <h1 id="public-set-title">{set.title}</h1>
        </div>
        <div className="set-detail-actions">
          <Link className="dashboard-title-action" href={`/dashboard/play?set=${id}`}>
            <Gamepad2 aria-hidden="true" /> 라이브 시작
          </Link>
        </div>
      </div>

      <article className="set-detail-panel public-set-detail">
        <div className="public-detail-heading">
          <h2>세트 정보</h2>
          <span><Globe2 aria-hidden="true" /> 공개</span>
        </div>
        <p>{set.description || "설명이 아직 없어요."}</p>
        <div className="set-detail-stats">
          <span>{set._count.questions}문항</span>
          <span>{set._count.gameRooms}번 진행</span>
          <span>{set.updatedAt.toLocaleDateString("ko-KR")} 수정</span>
        </div>

        <QuizSetQuestionList questions={questions} />
      </article>
    </section>
  );
}
