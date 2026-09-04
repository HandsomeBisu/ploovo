import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";

const sectionCopy = {
  discover: {
    current: "discover",
    kicker: "DISCOVER",
    title: "세트 찾아보기",
    message: "학교 안에서 함께 쓸 수 있는 공개 세트 흐름을 준비하고 있어요.",
  },
  favorites: {
    current: "favorites",
    kicker: "FAVORITES",
    title: "즐겨찾기",
    message: "자주 쓰는 문제 세트를 한곳에 모아두는 화면으로 연결할 예정입니다.",
  },
  history: {
    current: "history",
    kicker: "HISTORY",
    title: "수업 기록",
    message: "게임 결과와 문항별 정답률을 확인하는 공간이 될 거예요.",
  },
  homework: {
    current: "homework",
    kicker: "HOMEWORK",
    title: "과제",
    message: "학생들이 수업 밖에서도 풀 수 있는 과제 기능을 준비 중입니다.",
  },
  play: {
    current: "play",
    kicker: "PLAY",
    title: "게임 열기",
    message: "세트를 고르고 PIN을 발급하는 흐름을 이어서 붙이면 됩니다.",
  },
  settings: {
    current: "settings",
    kicker: "SETTINGS",
    title: "설정",
    message: "프로필과 교실 기본값을 바꾸는 화면으로 확장할 수 있어요.",
  },
} as const;

export default async function DashboardSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?role=teacher");
  }

  const { section } = await params;
  const copy = sectionCopy[section as keyof typeof sectionCopy];

  if (!copy) {
    notFound();
  }

  return (
      <section className="dashboard-content" aria-labelledby="section-title">
        <div className="dashboard-title-row">
          <div>
            <p className="dashboard-kicker">{copy.kicker}</p>
            <h1 id="section-title">{copy.title}</h1>
          </div>
          <Link className="dashboard-title-action" href="/dashboard/sets/new">
            새 세트
          </Link>
        </div>

        <div className="section-placeholder">
          <article className="section-placeholder-card">
            <strong>곧 사용할 수 있어요.</strong>
            <p>{copy.message}</p>
          </article>
        </div>
      </section>
  );
}
