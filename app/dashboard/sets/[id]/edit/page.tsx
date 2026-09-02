import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "../../../DashboardShell";
import { createQuestion, deleteQuestion, updateQuestion } from "../../../actions";

type EditQuizSetPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    added?: string;
    deleted?: string;
    error?: string;
    updated?: string;
  }>;
};

function getChoices(value: unknown) {
  const choices = Array.isArray(value) ? value.map((choice) => String(choice)) : [];

  return Array.from({ length: 4 }, (_, index) => choices[index] ?? "");
}

function getAnswerIndex(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (value && typeof value === "object" && "index" in value) {
    const index = Number(value.index);
    return Number.isInteger(index) ? index : 0;
  }

  return 0;
}

function getStatusMessage(searchParams: Awaited<EditQuizSetPageProps["searchParams"]>) {
  if (searchParams.error === "question") {
    return "문제와 보기 4개, 정답을 모두 입력해 주세요.";
  }

  if (searchParams.added) {
    return "문제를 추가했습니다.";
  }

  if (searchParams.updated) {
    return "문제를 저장했습니다.";
  }

  if (searchParams.deleted) {
    return "문제를 삭제했습니다.";
  }

  return "";
}

export default async function EditQuizSetPage({ params, searchParams }: EditQuizSetPageProps) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login?role=teacher");
  }

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const set = await prisma.quizSet.findFirst({
    where: {
      id,
      owner: { email: session.user.email },
    },
    select: {
      id: true,
      title: true,
      description: true,
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          prompt: true,
          choices: true,
          answer: true,
          order: true,
        },
      },
    },
  });

  if (!set) {
    notFound();
  }

  const displayName = session.user.name ?? session.user.email ?? "선생님";
  const statusMessage = getStatusMessage(query);

  return (
    <DashboardShell displayName={displayName} current="sets">
      <section className="dashboard-content question-editor" aria-labelledby="edit-set-title">
        <div className="dashboard-title-row">
          <div>
            <p className="dashboard-kicker">QUESTION SETUP</p>
            <h1 id="edit-set-title">{set.title}</h1>
            <p className="dashboard-subtitle">
              {set.description || "문제를 추가해서 바로 수업에 쓸 수 있게 준비하세요."}
            </p>
          </div>
          <Link className="dashboard-title-action is-quiet" href={`/dashboard/sets/${set.id}`}>
            세트 정보
          </Link>
        </div>

        {statusMessage ? <p className="editor-status">{statusMessage}</p> : null}

        <div className="editor-layout">
          <section className="question-add-panel" aria-labelledby="add-question-title">
            <div className="editor-section-heading">
              <span>{set.questions.length + 1}</span>
              <div>
                <h2 id="add-question-title">새 문제 추가</h2>
                <p>문제, 보기, 정답을 입력하면 목록에 바로 저장됩니다.</p>
              </div>
            </div>

            <QuestionForm
              action={createQuestion}
              buttonLabel="문제 추가"
              quizSetId={set.id}
              textareaId="new-question-prompt"
            />
          </section>

          <section className="question-list-panel" aria-labelledby="question-list-title">
            <div className="editor-section-heading">
              <span>{set.questions.length}</span>
              <div>
                <h2 id="question-list-title">저장된 문제</h2>
                <p>수정한 뒤 저장을 누르면 바로 반영됩니다.</p>
              </div>
            </div>

            {set.questions.length === 0 ? (
              <div className="question-empty">
                아직 문제가 없어요. 왼쪽에서 첫 문제를 추가해 보세요.
              </div>
            ) : (
              <div className="question-edit-list">
                {set.questions.map((question, index) => (
                  <article className="question-edit-card" key={question.id}>
                    <div className="question-card-heading">
                      <strong>문제 {index + 1}</strong>
                      <form action={deleteQuestion}>
                        <input name="quizSetId" type="hidden" value={set.id} />
                        <input name="questionId" type="hidden" value={question.id} />
                        <button type="submit">삭제</button>
                      </form>
                    </div>

                    <QuestionForm
                      action={updateQuestion}
                      answerIndex={getAnswerIndex(question.answer)}
                      buttonLabel="저장"
                      choices={getChoices(question.choices)}
                      prompt={question.prompt}
                      questionId={question.id}
                      quizSetId={set.id}
                      textareaId={`question-${question.id}-prompt`}
                    />
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </DashboardShell>
  );
}

function QuestionForm({
  action,
  answerIndex = 0,
  buttonLabel,
  choices = ["", "", "", ""],
  prompt = "",
  questionId,
  quizSetId,
  textareaId,
}: {
  action: (formData: FormData) => Promise<void>;
  answerIndex?: number;
  buttonLabel: string;
  choices?: string[];
  prompt?: string;
  questionId?: string;
  quizSetId: string;
  textareaId: string;
}) {
  return (
    <form action={action} className="question-form">
      <input name="quizSetId" type="hidden" value={quizSetId} />
      {questionId ? <input name="questionId" type="hidden" value={questionId} /> : null}

      <label htmlFor={textareaId}>문제</label>
      <textarea
        defaultValue={prompt}
        id={textareaId}
        maxLength={240}
        name="prompt"
        placeholder="예: 세종대왕이 만든 문자는 무엇인가요?"
        required
        rows={3}
      />

      <div className="choice-fieldset" role="group" aria-label="보기와 정답">
        {choices.map((choice, index) => (
          <div className="choice-row" key={`${textareaId}-choice-${index}`}>
            <input
              aria-label={`${index + 1}번 보기를 정답으로 선택`}
              defaultChecked={answerIndex === index}
              name="answerIndex"
              type="radio"
              value={index}
            />
            <label htmlFor={`${textareaId}-choice-${index}`}>보기 {index + 1}</label>
            <input
              defaultValue={choice}
              id={`${textareaId}-choice-${index}`}
              maxLength={120}
              name={`choice-${index}`}
              placeholder={`${index + 1}번 보기`}
              required
            />
          </div>
        ))}
      </div>

      <button type="submit">{buttonLabel}</button>
    </form>
  );
}
