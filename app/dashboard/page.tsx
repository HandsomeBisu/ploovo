import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { signOut } from "@/auth";

async function signOutAction() {
  "use server";

  await signOut({ redirectTo: "/" });
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?role=teacher");
  }

  const displayName = session.user.name ?? session.user.email ?? "선생님";

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link href="/" className="brand-mark" aria-label="Ploovo 홈">
          Ploovo!
        </Link>
        <form action={signOutAction}>
          <button type="submit">로그아웃</button>
        </form>
      </header>

      <section className="dashboard-hero">
        <p>Teacher Dashboard</p>
        <h1>{displayName}님, 안녕하세요.</h1>
        <span>퀴즈 만들기와 게임방 관리는 다음 단계에서 연결할 예정입니다.</span>
      </section>

      <section className="dashboard-grid" aria-label="대시보드 준비 항목">
        <article>
          <strong>문제 세트</strong>
          <p>직접 만들거나 라이브러리에서 가져오는 흐름을 준비합니다.</p>
        </article>
        <article>
          <strong>게임 열기</strong>
          <p>PIN을 발급하고 학생 참여를 받는 화면을 연결합니다.</p>
        </article>
        <article>
          <strong>수업 기록</strong>
          <p>게임 결과와 문항별 정답률을 확인할 수 있게 만듭니다.</p>
        </article>
      </section>
    </main>
  );
}
