import Link from "next/link";
import { ArrowLeft, Check, ChevronDown, FilePenLine } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseQuestionRecord } from "@/lib/question-editor";
import { DeleteQuizSetDialog } from "../../DeleteQuizSetDialog";
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
            <Link className="dashboard-title-action" href={`/dashboard/sets/${id}/edit`}>
              <FilePenLine aria-hidden="true" />
              문제 편집
            </Link>
            <DeleteQuizSetDialog quizSetId={id} title={set.title} />
          </div>
        </div>

        <article className="set-detail-panel">
          <h2>세트 정보</h2>
          <p>{set.description || "설명이 아직 없어요."}</p>
          <div className="set-detail-stats">
            <span>{set._count.questions}문항</span>
            <span>{set._count.gameRooms}번 진행</span>
            <span>{set.updatedAt.toLocaleDateString("ko-KR")} 수정</span>
          </div>

          {questions.length > 0 ? (
            <ul className="question-preview-list" aria-label="문항 미리보기">
              {questions.map((question, index) => (
                <li key={question.id}>
                  <details className="question-preview-item">
                    <summary>
                      <span>{index + 1}</span>
                      <strong>{question.prompt || "내용이 없는 문제"}</strong>
                      <small>{questionTypeLabel(question.type)}</small>
                      <ChevronDown aria-hidden="true" />
                    </summary>
                    <div className="question-preview-content">
                      {question.type === "short-answer" ? (
                        <>
                          <p>{question.shortAnswerMatch === "exact" ? "학생 답이 아래 정답과 완전히 일치해야 합니다." : "학생 답에 아래 정답 중 하나가 포함되어야 합니다."}</p>
                          <div className="question-answer-tags">
                            {question.answerTexts.map((answer, answerIndex) => (
                              <span key={answerIndex}>{answer || "입력되지 않은 정답"}</span>
                            ))}
                          </div>
                        </>
                      ) : (
                        <ol>
                          {question.choices.map((choice, choiceIndex) => (
                            <li className={question.answerIndices.includes(choiceIndex) ? "is-correct" : undefined} key={choiceIndex}>
                              <span>{question.type === "true-false" ? choice : String.fromCharCode(65 + choiceIndex)}</span>
                              <strong>{choice || "입력되지 않은 보기"}</strong>
                              {question.answerIndices.includes(choiceIndex) ? <Check aria-label="정답" /> : null}
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          ) : (
            <p>아직 문제가 없어요. 문제 편집에서 첫 문제를 추가해 보세요.</p>
          )}
        </article>
        <SavedSetToast show={saved === "1"} />
      </section>
  );
}

function questionTypeLabel(type: "multiple-choice" | "true-false" | "short-answer") {
  if (type === "true-false") return "OX";
  if (type === "short-answer") return "단답형";
  return "객관식";
}
