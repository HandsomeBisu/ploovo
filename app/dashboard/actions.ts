"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isQuestionType,
  parseQuestionRecord,
  type EditorQuestion,
  type QuestionSaveInput,
  type QuestionType,
} from "@/lib/question-editor";

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

type QuestionActionResult =
  | { ok: true; question?: EditorQuestion; savedAt?: string }
  | { ok: false; error: string };

function questionJson(question: QuestionSaveInput) {
  if (question.type === "short-answer") {
    return {
      choices: [],
      answer: {
        type: question.type,
        text: question.answerText.slice(0, 120),
      },
    };
  }

  if (question.type === "true-false") {
    return {
      choices: ["O", "X"],
      answer: {
        type: question.type,
        index: question.answerIndex === 1 ? 1 : 0,
      },
    };
  }

  const choices = question.choices.slice(0, 6).map((choice) => choice.slice(0, 120));

  return {
    choices: choices.length >= 2 ? choices : [...choices, ...Array(2 - choices.length).fill("")],
    answer: {
      type: question.type,
      index: Math.min(Math.max(question.answerIndex, 0), Math.max(choices.length - 1, 0)),
    },
  };
}

async function ownsQuizSet(quizSetId: string, teacherId: string) {
  return prisma.quizSet.findFirst({
    where: { id: quizSetId, ownerId: teacherId },
    select: { id: true },
  });
}

export async function createQuestionDraft(
  quizSetId: string,
  requestedType: QuestionType = "multiple-choice",
): Promise<QuestionActionResult> {
  const teacherId = await getTeacherId();
  const type = isQuestionType(requestedType) ? requestedType : "multiple-choice";
  const quizSet = await ownsQuizSet(quizSetId, teacherId);

  if (!quizSet) {
    return { ok: false, error: "문제 세트를 찾을 수 없어요." };
  }

  try {
    const lastQuestion = await prisma.question.aggregate({
      where: { quizSetId },
      _max: { order: true },
    });
    const initialQuestion: QuestionSaveInput = {
      id: "",
      quizSetId,
      prompt: "",
      type,
      choices: type === "multiple-choice" ? ["", "", "", ""] : type === "true-false" ? ["O", "X"] : [],
      answerIndex: 0,
      answerText: "",
      order: (lastQuestion._max.order ?? -1) + 1,
    };
    const data = questionJson(initialQuestion);
    const question = await prisma.$transaction(async (transaction) => {
      const created = await transaction.question.create({
        data: {
          quizSetId,
          prompt: "",
          choices: data.choices,
          answer: data.answer,
          order: initialQuestion.order,
        },
        select: {
          id: true,
          quizSetId: true,
          prompt: true,
          choices: true,
          answer: true,
          order: true,
        },
      });

      await transaction.quizSet.update({
        where: { id: quizSetId },
        data: { updatedAt: new Date() },
      });

      return created;
    });

    return { ok: true, question: parseQuestionRecord(question) };
  } catch {
    return { ok: false, error: "문제를 추가하지 못했어요. 다시 시도해 주세요." };
  }
}

export async function saveQuestionDraft(input: QuestionSaveInput): Promise<QuestionActionResult> {
  const teacherId = await getTeacherId();

  if (!input.id || !input.quizSetId || !isQuestionType(input.type)) {
    return { ok: false, error: "저장할 문제 정보가 올바르지 않아요." };
  }

  const question = await prisma.question.findFirst({
    where: {
      id: input.id,
      quizSetId: input.quizSetId,
      quizSet: { ownerId: teacherId },
    },
    select: { id: true },
  });

  if (!question) {
    return { ok: false, error: "문제를 찾을 수 없어요." };
  }

  try {
    const data = questionJson(input);
    await prisma.$transaction([
      prisma.question.update({
        where: { id: question.id },
        data: {
          prompt: input.prompt.slice(0, 240),
          choices: data.choices,
          answer: data.answer,
        },
      }),
      prisma.quizSet.update({
        where: { id: input.quizSetId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return { ok: true, savedAt: new Date().toISOString() };
  } catch {
    return { ok: false, error: "자동 저장에 실패했어요." };
  }
}

export async function duplicateQuestionDraft(
  quizSetId: string,
  questionId: string,
): Promise<QuestionActionResult> {
  const teacherId = await getTeacherId();
  const question = await prisma.question.findFirst({
    where: { id: questionId, quizSetId, quizSet: { ownerId: teacherId } },
    select: {
      id: true,
      quizSetId: true,
      prompt: true,
      choices: true,
      answer: true,
      order: true,
    },
  });

  if (!question) {
    return { ok: false, error: "복제할 문제를 찾을 수 없어요." };
  }

  try {
    const lastQuestion = await prisma.question.aggregate({
      where: { quizSetId },
      _max: { order: true },
    });
    const source = parseQuestionRecord(question);
    const data = questionJson(source);
    const duplicated = await prisma.question.create({
      data: {
        quizSetId,
        prompt: question.prompt,
        choices: data.choices,
        answer: data.answer,
        order: (lastQuestion._max.order ?? -1) + 1,
      },
      select: {
        id: true,
        quizSetId: true,
        prompt: true,
        choices: true,
        answer: true,
        order: true,
      },
    });

    return { ok: true, question: parseQuestionRecord(duplicated) };
  } catch {
    return { ok: false, error: "문제를 복제하지 못했어요." };
  }
}

export async function deleteQuestionDraft(
  quizSetId: string,
  questionId: string,
): Promise<QuestionActionResult> {
  const teacherId = await getTeacherId();
  const question = await prisma.question.findFirst({
    where: { id: questionId, quizSetId, quizSet: { ownerId: teacherId } },
    select: {
      id: true,
      quizSetId: true,
      prompt: true,
      choices: true,
      answer: true,
      order: true,
    },
  });

  if (!question) {
    return { ok: false, error: "삭제할 문제를 찾을 수 없어요." };
  }

  try {
    await prisma.$transaction([
      prisma.question.delete({ where: { id: question.id } }),
      prisma.quizSet.update({ where: { id: quizSetId }, data: { updatedAt: new Date() } }),
    ]);
    return { ok: true, question: parseQuestionRecord(question) };
  } catch {
    return { ok: false, error: "문제를 삭제하지 못했어요." };
  }
}

export async function restoreQuestionDraft(input: QuestionSaveInput): Promise<QuestionActionResult> {
  const teacherId = await getTeacherId();
  const quizSet = await ownsQuizSet(input.quizSetId, teacherId);

  if (!quizSet || !input.id || !isQuestionType(input.type)) {
    return { ok: false, error: "복구할 문제 정보가 올바르지 않아요." };
  }

  try {
    const data = questionJson(input);
    const restored = await prisma.$transaction(async (transaction) => {
      const created = await transaction.question.create({
        data: {
          id: input.id,
          quizSetId: input.quizSetId,
          prompt: input.prompt.slice(0, 240),
          choices: data.choices,
          answer: data.answer,
          order: input.order,
        },
        select: {
          id: true,
          quizSetId: true,
          prompt: true,
          choices: true,
          answer: true,
          order: true,
        },
      });

      await transaction.quizSet.update({
        where: { id: input.quizSetId },
        data: { updatedAt: new Date() },
      });

      return created;
    });

    return { ok: true, question: parseQuestionRecord(restored) };
  } catch {
    return { ok: false, error: "삭제한 문제를 복구하지 못했어요." };
  }
}

export async function reorderQuestionDrafts(
  quizSetId: string,
  orderedIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  const teacherId = await getTeacherId();
  const quizSet = await ownsQuizSet(quizSetId, teacherId);

  if (!quizSet || new Set(orderedIds).size !== orderedIds.length) {
    return { ok: false, error: "문제 순서를 저장할 수 없어요." };
  }

  const savedQuestions = await prisma.question.findMany({
    where: { quizSetId },
    select: { id: true },
  });
  const savedIds = new Set(savedQuestions.map((question) => question.id));

  if (savedIds.size !== orderedIds.length || orderedIds.some((id) => !savedIds.has(id))) {
    return { ok: false, error: "문제 목록이 변경됐어요. 새로고침 후 다시 시도해 주세요." };
  }

  try {
    await prisma.$transaction([
      ...orderedIds.map((id, order) =>
        prisma.question.update({ where: { id }, data: { order } }),
      ),
      prisma.quizSet.update({ where: { id: quizSetId }, data: { updatedAt: new Date() } }),
    ]);
    return { ok: true };
  } catch {
    return { ok: false, error: "문제 순서를 저장하지 못했어요." };
  }
}
