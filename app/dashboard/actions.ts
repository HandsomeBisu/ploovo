"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function getTeacherId() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login?role=teacher");
  }

  const teacher = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!teacher) {
    redirect("/login?role=teacher");
  }

  return teacher.id;
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getQuestionFields(formData: FormData) {
  const prompt = getText(formData, "prompt");
  const choices = ["choice-0", "choice-1", "choice-2", "choice-3"].map((key) =>
    getText(formData, key),
  );
  const answerIndex = Number(formData.get("answerIndex") ?? 0);

  return { prompt, choices, answerIndex };
}

function isValidQuestion({
  answerIndex,
  choices,
  prompt,
}: {
  answerIndex: number;
  choices: string[];
  prompt: string;
}) {
  return prompt.length > 0 && choices.every(Boolean) && Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex < choices.length;
}

export async function createQuizSet(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title) {
    redirect("/dashboard/sets/new?error=title");
  }

  const teacherId = await getTeacherId();

  const quizSet = await prisma.quizSet.create({
    data: {
      title: title.slice(0, 80),
      description: description ? description.slice(0, 180) : null,
      ownerId: teacherId,
    },
    select: { id: true },
  });

  redirect(`/dashboard/sets/${quizSet.id}/edit`);
}

export async function createQuestion(formData: FormData) {
  const teacherId = await getTeacherId();
  const quizSetId = getText(formData, "quizSetId");
  const fields = getQuestionFields(formData);

  if (!quizSetId) {
    redirect("/dashboard");
  }

  if (!isValidQuestion(fields)) {
    redirect(`/dashboard/sets/${quizSetId}/edit?error=question`);
  }

  const quizSet = await prisma.quizSet.findFirst({
    where: { id: quizSetId, ownerId: teacherId },
    select: {
      id: true,
      _count: {
        select: { questions: true },
      },
    },
  });

  if (!quizSet) {
    redirect("/dashboard");
  }

  await prisma.question.create({
    data: {
      quizSetId: quizSet.id,
      prompt: fields.prompt.slice(0, 240),
      choices: fields.choices.map((choice) => choice.slice(0, 120)),
      answer: { index: fields.answerIndex },
      order: quizSet._count.questions,
    },
  });

  revalidatePath(`/dashboard/sets/${quizSet.id}/edit`);
  redirect(`/dashboard/sets/${quizSet.id}/edit?added=1`);
}

export async function updateQuestion(formData: FormData) {
  const teacherId = await getTeacherId();
  const quizSetId = getText(formData, "quizSetId");
  const questionId = getText(formData, "questionId");
  const fields = getQuestionFields(formData);

  if (!quizSetId || !questionId) {
    redirect("/dashboard");
  }

  if (!isValidQuestion(fields)) {
    redirect(`/dashboard/sets/${quizSetId}/edit?error=question`);
  }

  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      quizSetId,
      quizSet: { ownerId: teacherId },
    },
    select: { id: true },
  });

  if (!question) {
    redirect("/dashboard");
  }

  await prisma.question.update({
    where: { id: question.id },
    data: {
      prompt: fields.prompt.slice(0, 240),
      choices: fields.choices.map((choice) => choice.slice(0, 120)),
      answer: { index: fields.answerIndex },
    },
  });

  revalidatePath(`/dashboard/sets/${quizSetId}/edit`);
  redirect(`/dashboard/sets/${quizSetId}/edit?updated=1`);
}

export async function deleteQuestion(formData: FormData) {
  const teacherId = await getTeacherId();
  const quizSetId = getText(formData, "quizSetId");
  const questionId = getText(formData, "questionId");

  if (!quizSetId || !questionId) {
    redirect("/dashboard");
  }

  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      quizSetId,
      quizSet: { ownerId: teacherId },
    },
    select: { id: true },
  });

  if (!question) {
    redirect("/dashboard");
  }

  await prisma.question.delete({
    where: { id: question.id },
  });

  revalidatePath(`/dashboard/sets/${quizSetId}/edit`);
  redirect(`/dashboard/sets/${quizSetId}/edit?deleted=1`);
}
