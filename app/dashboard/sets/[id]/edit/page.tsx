import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseQuestionRecord } from "@/lib/question-editor";
import { DashboardShell } from "../../../DashboardShell";
import { QuizSetEditor } from "./QuizSetEditor";

export default async function EditQuizSetPage({ params }: { params: Promise<{ id: string }> }) {
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
      questions: {
        orderBy: { order: "asc" },
        select: { id: true, quizSetId: true, prompt: true, choices: true, answer: true, order: true },
      },
    },
  });

  if (!set) {
    notFound();
  }

  const displayName = session.user.name ?? session.user.email ?? "선생님";

  return (
    <DashboardShell displayName={displayName} current="sets" mode="editor">
      <QuizSetEditor
        description={set.description}
        initialQuestions={set.questions.map(parseQuestionRecord)}
        quizSetId={set.id}
        title={set.title}
      />
    </DashboardShell>
  );
}
