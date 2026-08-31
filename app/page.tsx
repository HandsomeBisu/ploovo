import type { CSSProperties } from "react";

const gameCards = [
  {
    title: "다 함께\n접속하기",
    tone: "blue",
    icon: "players",
    delay: "0s",
  },
  {
    title: "재미있게\n배우기",
    tone: "pink",
    icon: "gamepad",
    delay: "0.18s",
  },
  {
    title: "1등은\n나의 것!",
    tone: "yellow",
    icon: "trophy",
    delay: "0.34s",
  },
  {
    title: "+ 더 많은\n모드",
    tone: "white",
    icon: "grid",
    delay: "0.5s",
  },
];

function Icon({ type }: { type: string }) {
  if (type === "players") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M18 21a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" />
        <path d="M5 39v-3c0-7 5-12 13-12s13 5 13 12v3" />
        <path d="M33 24c6 1 10 5 10 11v4" />
        <path d="M31 20a6 6 0 1 0 0-12" />
      </svg>
    );
  }

  if (type === "gamepad") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M15 18h18c5 0 8 4 8 9v5c0 4-3 7-7 7-3 0-5-2-7-5h-6c-2 3-4 5-7 5-4 0-7-3-7-7v-5c0-5 3-9 8-9Z" />
        <path d="M16 27h8" />
        <path d="M20 23v8" />
        <path d="M31 27h.2" />
        <path d="M36 27h.2" />
      </svg>
    );
  }

  if (type === "trophy") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M16 8h16v10c0 6-3 11-8 11s-8-5-8-11V8Z" />
        <path d="M16 12H8v5c0 5 4 8 9 8" />
        <path d="M32 12h8v5c0 5-4 8-9 8" />
        <path d="M24 29v8" />
        <path d="M15 40h18" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M12 12h9v9h-9z" />
      <path d="M27 12h9v9h-9z" />
      <path d="M12 27h9v9h-9z" />
      <path d="M27 27h9v9h-9z" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--ink)]">
      <header className="site-header mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <a href="#" className="brand-mark" aria-label="Quizzy 홈">
          Quizzy!
        </a>
        <a className="host-link" href="/login">
          Host a Game
        </a>
      </header>

      <section className="hero mx-auto grid w-full max-w-7xl items-center gap-10 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:pb-24 lg:pt-16">
        <div className="hero-copy">
          <p className="eyebrow">QUIZZY LIVE CLASS</p>
          <h1>
            교실을 더 신나게,
            <span data-text="LEVEL UP">LEVEL UP</span>
            YOUR
            <br />
            CLASSROOM
          </h1>
          <p className="hero-text">
            게임 PIN만 입력하면 바로 참여. 선생님은 퀴즈를 열고, 학생들은 점수판을 보며 같이
            풀어요.
          </p>

          <form className="pin-form" action="/login" method="get" aria-label="게임 PIN 입력">
            <input type="hidden" name="role" value="student" />
            <div className="pin-group">
              <label htmlFor="game-pin" className="sr-only">
                Game PIN
              </label>
              <input id="game-pin" name="pin" inputMode="numeric" placeholder="Game PIN" />
              <button type="submit" aria-label="게임 참여">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h13" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </button>
            </div>
            <a id="host" href="/login">
              Host a Game
            </a>
          </form>
        </div>

        <div className="card-stage" aria-label="Quizzy 주요 기능">
          <div className="orbit-line orbit-one" aria-hidden="true" />
          <div className="orbit-line orbit-two" aria-hidden="true" />
          {gameCards.map((card, index) => (
            <article
              className={`feature-tile tile-${index + 1} tile-${card.tone}`}
              key={card.title}
              style={{ "--delay": card.delay } as CSSProperties}
            >
              <Icon type={card.icon} />
              <h2>
                {card.title.split("\n").map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h2>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
