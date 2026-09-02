import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/auth";

type DashboardShellProps = {
  children: ReactNode;
  current: "sets" | "discover" | "favorites" | "history" | "homework" | "play" | "settings";
  displayName: string;
};

const navItems = [
  { href: "/dashboard/discover", label: "둘러보기", id: "discover", icon: "compass" },
  { href: "/dashboard", label: "내 세트", id: "sets", icon: "list" },
  { href: "/dashboard/favorites", label: "즐겨찾기", id: "favorites", icon: "star" },
  { href: "/dashboard/history", label: "기록", id: "history", icon: "history" },
  { href: "/dashboard/homework", label: "과제", id: "homework", icon: "document" },
  { href: "/dashboard/play", label: "플레이", id: "play", icon: "play" },
  { href: "/dashboard/settings", label: "설정", id: "settings", icon: "settings" },
] as const;

const dockItems = [
  { label: "통계", icon: "chart" },
  { label: "자료함", icon: "briefcase" },
  { label: "상점", icon: "store" },
  { label: "소식", icon: "news" },
] as const;

async function signOutAction() {
  "use server";

  await signOut({ redirectTo: "/" });
}

export function DashboardShell({ children, current, displayName }: DashboardShellProps) {
  const shortName = displayName.length > 10 ? `${displayName.slice(0, 10)}...` : displayName;

  return (
    <main className="teacher-dashboard">
      <aside className="dashboard-sidebar" aria-label="선생님 메뉴">
        <Link href="/" className="dashboard-brand" aria-label="Ploovo 홈">
          Ploovo!
        </Link>

        <Link className="sidebar-create" href="/dashboard/sets/new">
          <Icon type="edit" />
          만들기
        </Link>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              aria-current={current === item.id ? "page" : undefined}
              className={current === item.id ? "is-active" : undefined}
              href={item.href}
              key={item.id}
            >
              <Icon type={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-dock" aria-label="빠른 메뉴">
            {dockItems.map((item) => (
              <button aria-label={item.label} key={item.label} type="button">
                <Icon type={item.icon} />
              </button>
            ))}
          </div>
          <Link className="teacher-badge" href="/dashboard">
            선생님 모드
          </Link>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-account">
          <form action={signOutAction}>
            <button type="submit">
              <span aria-hidden="true">{shortName.slice(0, 1).toUpperCase()}</span>
              <strong>{shortName}</strong>
              <Icon type="chevron" />
            </button>
          </form>
        </header>
        {children}
      </div>
    </main>
  );
}

function Icon({ type }: { type: string }) {
  if (type === "compass") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" />
      </svg>
    );
  }

  if (type === "list") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 6h12" />
        <path d="M8 12h12" />
        <path d="M8 18h12" />
        <path d="M4 6h.01" />
        <path d="M4 12h.01" />
        <path d="M4 18h.01" />
      </svg>
    );
  }

  if (type === "star") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
      </svg>
    );
  }

  if (type === "history") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12a8 8 0 1 0 2.3-5.7" />
        <path d="M4 4v5h5" />
        <path d="M12 8v5l3 2" />
      </svg>
    );
  }

  if (type === "document") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3h8l4 4v14H6V3Z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
      </svg>
    );
  }

  if (type === "play") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4v16l13-8L7 4Z" />
      </svg>
    );
  }

  if (type === "settings") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7.5 7.5 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8.5 8.5 0 0 0-1.8-1L14.3 3h-4.6L9.3 6a8.5 8.5 0 0 0-1.8 1l-2.4-1-2 3.5 2 1.5a7.5 7.5 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a8.5 8.5 0 0 0 1.8 1l.4 3h4.6l.4-3a8.5 8.5 0 0 0 1.8-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" />
      </svg>
    );
  }

  if (type === "chart") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20V4" />
        <path d="M4 20h16" />
        <path d="M8 16v-5" />
        <path d="M12 16V7" />
        <path d="M16 16v-8" />
      </svg>
    );
  }

  if (type === "briefcase") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 8h16v11H4V8Z" />
        <path d="M9 8V5h6v3" />
        <path d="M4 13h16" />
      </svg>
    );
  }

  if (type === "store") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m4 9 1-5h14l1 5" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
        <path d="M4 9h16" />
      </svg>
    );
  }

  if (type === "news") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5h14v14H5V5Z" />
        <path d="M8 9h8" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </svg>
    );
  }

  if (type === "chevron") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m7 10 5 5 5-5" />
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
