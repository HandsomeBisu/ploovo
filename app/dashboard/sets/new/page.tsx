import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "../../DashboardShell";
import { createQuizSet } from "../../actions";

export default async function NewQuizSetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?role=teacher");
  }

  const { error } = await searchParams;
  const displayName = session.user.name ?? session.user.email ?? "선생님";

  return (
    <DashboardShell displayName={displayName} current="sets">
      <section className="dashboard-content dashboard-form-content" aria-labelledby="new-set-title">
        <div className="dashboard-title-row">
          <div>
            <p className="dashboard-kicker">CREATE SET</p>
            <h1 id="new-set-title">새 문제 세트</h1>
          </div>
          <Link className="dashboard-title-action is-quiet" href="/dashboard">
            돌아가기
          </Link>
        </div>

        <form className="set-form-card" action={createQuizSet}>
          <label htmlFor="title">세트 이름</label>
          <input
            id="title"
            maxLength={80}
            name="title"
            placeholder="예: 조선 후기 핵심 정리"
            required
          />
          {error === "title" ? <p className="form-error">세트 이름을 입력해 주세요.</p> : null}

          <label htmlFor="description">설명</label>
          <textarea
            id="description"
            maxLength={180}
            name="description"
            placeholder="학생들이 어떤 내용을 풀게 될지 짧게 적어주세요."
            rows={4}
          />

          <button type="submit">세트 저장</button>
        </form>
      </section>
    </DashboardShell>
  );
}
