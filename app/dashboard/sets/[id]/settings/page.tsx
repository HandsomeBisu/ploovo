import Link from "next/link";
import { ArrowLeft, Eye, Globe2, LockKeyhole, Save } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isQuestionComplete, parseQuestionRecord } from "@/lib/question-editor";
import { DeleteQuizSetDialog } from "../../../DeleteQuizSetDialog";
import { SavedSetToast } from "../../../SavedSetToast";
import { updateQuizSetSettings } from "../../../actions";

export default async function QuizSetSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login?role=teacher");
  }

  const { id } = await params;
  const set = await prisma.quizSet.findFirst({
    where: { id, owner: { email: session.user.email } },
    select: {
      id: true,
      title: true,
      description: true,
      isPublic: true,
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
    },
  });

  if (!set) {
    notFound();
  }

  const { error, saved } = await searchParams;
  const completeCount = set.questions.map(parseQuestionRecord).filter(isQuestionComplete).length;
  const canPublish = set.questions.length > 0 && completeCount === set.questions.length;

  return (
    <section className="dashboard-content set-settings-page" aria-labelledby="set-settings-title">
      <Link className="set-detail-back" href={`/dashboard/sets/${set.id}`}>
        <ArrowLeft aria-hidden="true" />
        세트 정보
      </Link>

      <header className="dashboard-title-row">
        <div>
          <p className="dashboard-kicker">SETTINGS</p>
          <h1 id="set-settings-title">세트 설정</h1>
          <p className="dashboard-subtitle">기본 정보와 공개 범위를 관리하세요.</p>
        </div>
        {set.isPublic ? (
          <Link className="dashboard-title-action is-quiet" href={`/dashboard/discover/${set.id}`}>
            <Eye aria-hidden="true" />
            공개 화면 보기
          </Link>
        ) : null}
      </header>

      <form action={updateQuizSetSettings} className="set-settings-form">
        <input name="quizSetId" type="hidden" value={set.id} />

        <section className="settings-section" aria-labelledby="basic-settings-title">
          <div className="settings-section-heading">
            <div>
              <h2 id="basic-settings-title">기본 정보</h2>
              <p>둘러보기와 내 세트 목록에 표시되는 내용입니다.</p>
            </div>
          </div>
          <div className="settings-fields">
            <label>
              <span>세트 이름</span>
              <input defaultValue={set.title} maxLength={80} name="title" required />
              {error === "title" ? <small className="settings-error">세트 이름을 입력해 주세요.</small> : null}
            </label>
            <label>
              <span>설명</span>
              <textarea defaultValue={set.description ?? ""} maxLength={180} name="description" rows={4} />
            </label>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="visibility-settings-title">
          <div className="settings-section-heading">
            <div>
              <h2 id="visibility-settings-title">공개 설정</h2>
              <p>공개 세트는 다른 선생님이 내용을 확인하고 라이브에 사용할 수 있습니다.</p>
            </div>
            <span className={`visibility-status ${set.isPublic ? "is-public" : ""}`}>
              {set.isPublic ? <Globe2 aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
              {set.isPublic ? "공개" : "비공개"}
            </span>
          </div>

          <label className={`visibility-toggle ${!canPublish && !set.isPublic ? "is-disabled" : ""}`}>
            <span>
              <strong>세트 둘러보기에 공개</strong>
              <small>
                {canPublish
                  ? "다른 선생님이 문제를 확인하고 라이브를 시작할 수 있어요."
                  : `${completeCount}/${set.questions.length}문제 완성 · 모든 문제를 완성해야 공개할 수 있어요.`}
              </small>
            </span>
            <input
              defaultChecked={set.isPublic}
              disabled={!canPublish && !set.isPublic}
              name="isPublic"
              type="checkbox"
            />
            <span aria-hidden="true" className="toggle-track"><span /></span>
          </label>
          {error === "incomplete" ? (
            <p className="settings-error settings-error-panel">모든 문제를 완성한 뒤 다시 공개해 주세요.</p>
          ) : null}
        </section>

        <div className="settings-save-row">
          <button className="settings-save-button" type="submit">
            <Save aria-hidden="true" />
            변경사항 저장
          </button>
        </div>
      </form>

      <section className="settings-danger-zone" aria-labelledby="danger-zone-title">
        <div>
          <h2 id="danger-zone-title">위험 구역</h2>
          <p>세트와 모든 문제를 삭제합니다. 삭제 후에는 복구할 수 없습니다.</p>
        </div>
        <DeleteQuizSetDialog quizSetId={set.id} title={set.title} />
      </section>

      <SavedSetToast show={saved === "1"} />
    </section>
  );
}
