"use client";

import { useState } from "react";
import { signInWithGoogle } from "./actions";

type Role = "teacher" | "student";

const loginProviders = [
  {
    name: "Google",
    label: "Google로 계속하기",
    className: "provider-google",
    mark: "google",
  },
  {
    name: "Kakao",
    label: "카카오로 계속하기",
    className: "provider-kakao",
    mark: "kakao",
  },
  {
    name: "Naver",
    label: "네이버로 계속하기",
    className: "provider-naver",
    mark: "naver",
  },
];

function ProviderLogo({ type }: { type: string }) {
  if (type === "google") {
    return (
      <svg className="provider-logo google-logo" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z"
        />
        <path
          fill="#34A853"
          d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"
        />
        <path
          fill="#FBBC05"
          d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9.1L6.4 14Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6C7.2 7.7 9.4 5.9 12 5.9Z"
        />
      </svg>
    );
  }

  if (type === "kakao") {
    return (
      <svg className="provider-logo kakao-logo" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4C6.7 4 2.4 7.3 2.4 11.4c0 2.6 1.8 4.9 4.5 6.2l-.8 3c-.1.4.3.7.6.5l3.7-2.4c.5.1 1.1.1 1.6.1 5.3 0 9.6-3.3 9.6-7.4S17.3 4 12 4Z" />
      </svg>
    );
  }

  return (
    <svg className="provider-logo naver-logo" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15.4 12.5 8.3 2.4H2.4v19.2h6.2v-10l7.1 10h5.9V2.4h-6.2v10.1Z" />
    </svg>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="login-back" type="button" onClick={onClick}>
      이전으로
    </button>
  );
}

type LoginPanelProps = {
  initialRole: Role | null;
  initialPin: string;
};

export default function LoginPanel({ initialRole, initialPin }: LoginPanelProps) {
  const [role, setRole] = useState<Role | null>(initialRole);

  if (role === "teacher") {
    return (
      <section className="login-shell" aria-labelledby="login-title">
        <div className="login-card">
          <BackButton onClick={() => setRole(null)} />
          <p className="login-kicker">선생님 계정</p>
          <h1 id="login-title">로그인 또는 회원가입</h1>
          <p className="login-note">퀴즈 만들기와 수업 기록 확인에 사용됩니다.</p>

          <div className="provider-list" aria-label="소셜 로그인">
            {loginProviders.map((provider) => (
              provider.name === "Google" ? (
                <form action={signInWithGoogle} key={provider.name}>
                  <button className={`provider-button ${provider.className}`} type="submit">
                    <ProviderLogo type={provider.mark} />
                    {provider.label}
                  </button>
                </form>
              ) : (
                <button
                  className={`provider-button ${provider.className}`}
                  type="button"
                  disabled
                  key={provider.name}
                  title="곧 지원 예정"
                >
                  <ProviderLogo type={provider.mark} />
                  {provider.label}
                </button>
              )
            ))}
          </div>

          <div className="login-divider">
            <span />
            또는
            <span />
          </div>

          <form className="email-login" aria-label="이메일 로그인">
            <label htmlFor="email" className="sr-only">
              이메일 주소
            </label>
            <input id="email" type="email" placeholder="Email address" />
            <button type="submit">계속</button>
          </form>
        </div>
      </section>
    );
  }

  if (role === "student") {
    return (
      <section className="login-shell" aria-labelledby="student-title">
        <div className="login-card student-card">
          <BackButton onClick={() => setRole(null)} />
          <p className="login-kicker">학생 참여</p>
          <h1 id="student-title">게임 PIN으로 들어가기</h1>
          <p className="login-note">선생님이 알려준 PIN을 입력하면 바로 참여할 수 있습니다.</p>

          <form className="student-join" aria-label="학생 게임 참여">
            <label htmlFor="student-pin" className="sr-only">
              게임 PIN
            </label>
            <input id="student-pin" name="pin" inputMode="numeric" placeholder="Game PIN" defaultValue={initialPin} />
            <label htmlFor="student-name" className="sr-only">
              닉네임
            </label>
            <input id="student-name" name="nickname" placeholder="닉네임" />
            <button type="submit">참여하기</button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="login-shell" aria-labelledby="role-title">
      <div className="login-card role-card">
        <p className="login-kicker">Quizzy! 시작하기</p>
        <h1 id="role-title">어떻게 참여하시나요?</h1>
        <p className="login-note">선생님은 계정으로, 학생은 게임 PIN으로 들어갑니다.</p>

        <div className="role-options">
          <button className="role-option teacher-option" type="button" onClick={() => setRole("teacher")}>
            <span>선생님</span>
            <strong>퀴즈 만들기</strong>
            <small>수업을 열고 결과를 확인합니다.</small>
          </button>
          <button className="role-option student-option" type="button" onClick={() => setRole("student")}>
            <span>학생</span>
            <strong>게임 참여</strong>
            <small>PIN을 입력하고 바로 시작합니다.</small>
          </button>
        </div>
      </div>
    </section>
  );
}
