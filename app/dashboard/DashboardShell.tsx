import Link from "next/link";
import type { ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  ChevronUp,
  ClipboardList,
  Compass,
  FileClock,
  Gamepad2,
  Heart,
  LogOut,
  Menu,
  Plus,
  Settings,
  UsersRound,
} from "lucide-react";
import { signOut } from "@/auth";

type DashboardSection =
  | "sets"
  | "discover"
  | "favorites"
  | "history"
  | "homework"
  | "play"
  | "settings";

type DashboardShellProps = {
  children: ReactNode;
  current: DashboardSection;
  displayName: string;
};

const primaryNavItems = [
  { href: "/dashboard", label: "내 문제 세트", id: "sets", icon: BookOpen },
  { href: "/dashboard/discover", label: "세트 둘러보기", id: "discover", icon: Compass },
  { href: "/dashboard/play", label: "게임 열기", id: "play", icon: Gamepad2 },
] as const;

const manageNavItems = [
  { href: "/dashboard/homework", label: "과제", id: "homework", icon: ClipboardList },
  { href: "/dashboard/history", label: "수업 기록", id: "history", icon: BarChart3 },
  { href: "/dashboard/favorites", label: "즐겨찾기", id: "favorites", icon: Heart },
] as const;

async function signOutAction() {
  "use server";

  await signOut({ redirectTo: "/" });
}

export function DashboardShell({ children, current, displayName }: DashboardShellProps) {
  const shortName = displayName.length > 14 ? `${displayName.slice(0, 14)}...` : displayName;
  const initial = shortName.slice(0, 1).toUpperCase();

  return (
    <main className="teacher-dashboard">
      <aside className="dashboard-sidebar" aria-label="선생님 메뉴">
        <Brand />

        <Link className="sidebar-create" href="/dashboard/sets/new">
          <Plus aria-hidden="true" />
          새 문제 세트
        </Link>

        <DashboardNav current={current} />

        <div className="sidebar-support">
          <Link href="/dashboard/settings">
            <Settings aria-hidden="true" />
            설정
          </Link>
        </div>

        <AccountMenu displayName={shortName} initial={initial} />
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-mobile-header">
          <Brand />
          <details className="dashboard-mobile-menu">
            <summary aria-label="메뉴 열기" title="메뉴">
              <Menu aria-hidden="true" />
            </summary>
            <div className="dashboard-mobile-popover">
              <Link className="sidebar-create" href="/dashboard/sets/new">
                <Plus aria-hidden="true" />
                새 문제 세트
              </Link>
              <DashboardNav current={current} />
              <AccountMenu displayName={shortName} initial={initial} />
            </div>
          </details>
        </header>
        {children}
      </div>
    </main>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="dashboard-brand" aria-label="Ploovo 대시보드">
      <span aria-hidden="true">P</span>
      Ploovo!
    </Link>
  );
}

function DashboardNav({ current }: { current: DashboardSection }) {
  return (
    <nav className="sidebar-nav" aria-label="대시보드 탐색">
      <p>콘텐츠</p>
      {primaryNavItems.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            aria-current={current === item.id ? "page" : undefined}
            className={current === item.id ? "is-active" : undefined}
            href={item.href}
            key={item.id}
          >
            <Icon aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}

      <p className="sidebar-nav-heading">관리</p>
      {manageNavItems.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            aria-current={current === item.id ? "page" : undefined}
            className={current === item.id ? "is-active" : undefined}
            href={item.href}
            key={item.id}
          >
            <Icon aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AccountMenu({ displayName, initial }: { displayName: string; initial: string }) {
  return (
    <details className="dashboard-account-menu">
      <summary>
        <span className="dashboard-avatar" aria-hidden="true">
          {initial}
        </span>
        <span className="dashboard-account-copy">
          <strong>{displayName}</strong>
          <small>선생님 계정</small>
        </span>
        <ChevronUp aria-hidden="true" className="account-chevron" />
      </summary>
      <div className="dashboard-account-popover">
        <Link href="/dashboard/settings">
          <UsersRound aria-hidden="true" />
          계정 설정
        </Link>
        <Link href="/dashboard/history">
          <FileClock aria-hidden="true" />
          최근 활동
        </Link>
        <form action={signOutAction}>
          <button type="submit">
            <LogOut aria-hidden="true" />
            로그아웃
          </button>
        </form>
      </div>
    </details>
  );
}
