import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LoginPanel from "./LoginPanel";

export const metadata: Metadata = {
  title: "로그인 | Ploovo!",
  description: "Ploovo! 역할 선택과 로그인 페이지입니다.",
};

type LoginPageProps = {
  searchParams?: Promise<{
    role?: string | string[];
    pin?: string | string[];
    error?: string | string[];
  }>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const role = getParam(params?.role);
  const pin = getParam(params?.pin);
  const error = getParam(params?.error);

  if (!error && role !== "student") {
    const session = await auth();

    if (session?.user) {
      redirect("/dashboard");
    }
  }

  const initialRole = role === "student" || role === "teacher" ? role : pin ? "student" : null;

  return (
    <main className="login-page">
      <header className="login-header">
        <Link href="/" aria-label="Ploovo 홈으로 이동">
          Ploovo!
        </Link>
      </header>

      <LoginPanel initialRole={initialRole} initialPin={pin} authError={error} />

      <footer className="login-footer">
        <Link href="#">이용약관</Link>
        <Link href="#">개인정보 처리방침</Link>
      </footer>
    </main>
  );
}
