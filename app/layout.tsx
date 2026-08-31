import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quizzy! | 한국 교실을 위한 실시간 퀴즈 게임",
  description:
    "Quizzy!는 선생님이 퀴즈를 열고 학생들이 코드로 참여하는 한국 교실 맞춤 실시간 퀴즈 플랫폼입니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
