"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isQuestionComplete,
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

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
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

export async function updateQuizSetSettings(formData: FormData) {
  const teacherId = await getTeacherId();
  const quizSetId = getText(formData, "quizSetId");
  const title = getText(formData, "title");
  const description = getText(formData, "description");
  const isPublic = formData.get("isPublic") === "on";

  if (!quizSetId) {
    redirect("/dashboard");
  }

  if (!title) {
    redirect(`/dashboard/sets/${quizSetId}/settings?error=title`);
  }

  const quizSet = await prisma.quizSet.findFirst({
    where: { id: quizSetId, ownerId: teacherId },
    select: {
      id: true,
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          quizSetId: true,
          prompt: true,
          choices: true,
          answer: true,
          order: true,
        },
      },
    },
  });

  if (!quizSet) {
    redirect("/dashboard");
  }

  if (
    isPublic &&
    (quizSet.questions.length === 0 ||
      quizSet.questions.some((question) => !isQuestionComplete(parseQuestionRecord(question))))
  ) {
    redirect(`/dashboard/sets/${quizSetId}/settings?error=incomplete`);
  }

  await prisma.quizSet.update({
    where: { id: quizSet.id },
    data: {
      title: title.slice(0, 80),
      description: description ? description.slice(0, 180) : null,
      isPublic,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/discover");
  revalidatePath(`/dashboard/sets/${quizSet.id}`);
  revalidatePath(`/dashboard/sets/${quizSet.id}/settings`);
  revalidatePath(`/dashboard/discover/${quizSet.id}`);
  redirect(`/dashboard/sets/${quizSet.id}/settings?saved=1`);
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
  | { ok: true; question?: EditorQuestion; questions?: EditorQuestion[]; savedAt?: string }
  | { ok: false; error: string };

type QuizSetActionResult = { ok: true } | { ok: false; error: string };

function questionJson(question: QuestionSaveInput) {
  if (question.type === "short-answer") {
    const answerTexts = Array.isArray(question.answerTexts) ? question.answerTexts : [""];
    return {
      choices: [],
      answer: {
        type: question.type,
        texts: answerTexts.slice(0, 5).map((answer) => String(answer).slice(0, 120)),
        match: question.shortAnswerMatch === "contains" ? "contains" : "exact",
      },
    };
  }

  if (question.type === "true-false") {
    return {
      choices: ["O", "X"],
      answer: {
        type: question.type,
        index: question.answerIndices[0] === 1 ? 1 : 0,
      },
    };
  }

  const choices = question.choices.slice(0, 6).map((choice) => choice.slice(0, 120));
  const answerIndices = Array.isArray(question.answerIndices) ? question.answerIndices : [];

  return {
    choices: choices.length >= 2 ? choices : [...choices, ...Array(2 - choices.length).fill("")],
    answer: {
      type: question.type,
      indices: [...new Set(answerIndices)]
        .filter((index) => Number.isInteger(index) && index >= 0 && index < choices.length),
    },
  };
}

function changeQuestionType(question: EditorQuestion, type: QuestionType): EditorQuestion {
  if (question.type === type) return question;

  if (type === "multiple-choice") {
    return {
      ...question,
      type,
      choices: ["", "", "", ""],
      answerIndices: [0],
    };
  }

  if (type === "true-false") {
    return {
      ...question,
      type,
      choices: ["O", "X"],
      answerIndices: [0],
    };
  }

  return {
    ...question,
    type,
    choices: [],
    answerTexts: [""],
    shortAnswerMatch: "exact",
  };
}

async function ownsQuizSet(quizSetId: string, teacherId: string) {
  return prisma.quizSet.findFirst({
    where: { id: quizSetId, ownerId: teacherId },
    select: { id: true },
  });
}

export async function deleteQuizSet(
  quizSetId: string,
  confirmationTitle: string,
): Promise<QuizSetActionResult> {
  const teacherId = await getTeacherId();
  const quizSet = await prisma.quizSet.findFirst({
    where: { id: quizSetId, ownerId: teacherId },
    select: { id: true, title: true },
  });

  if (!quizSet) {
    return { ok: false, error: "삭제할 문제 세트를 찾을 수 없어요." };
  }

  if (confirmationTitle.trim() !== quizSet.title) {
    return { ok: false, error: "세트 이름이 일치하지 않아요." };
  }

  try {
    await prisma.quizSet.delete({ where: { id: quizSet.id } });
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { ok: false, error: "문제 세트를 삭제하지 못했어요. 다시 시도해 주세요." };
  }
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
      answerIndices: [0],
      answerTexts: [""],
      shortAnswerMatch: "exact",
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

export async function duplicateQuestionDrafts(
  quizSetId: string,
  questionIds: string[],
): Promise<QuestionActionResult> {
  const teacherId = await getTeacherId();
  const uniqueIds = [...new Set(questionIds)];

  if (uniqueIds.length === 0) {
    return { ok: false, error: "복제할 문제를 선택해 주세요." };
  }

  const sourceQuestions = await prisma.question.findMany({
    where: { id: { in: uniqueIds }, quizSetId, quizSet: { ownerId: teacherId } },
    orderBy: { order: "asc" },
    select: {
      id: true,
      quizSetId: true,
      prompt: true,
      choices: true,
      answer: true,
      order: true,
    },
  });

  if (sourceQuestions.length !== uniqueIds.length) {
    return { ok: false, error: "복제할 문제 목록이 변경됐어요." };
  }

  try {
    const lastQuestion = await prisma.question.aggregate({
      where: { quizSetId },
      _max: { order: true },
    });
    const duplicated = await prisma.$transaction(async (transaction) => {
      const created = [];

      for (const [index, sourceQuestion] of sourceQuestions.entries()) {
        const source = parseQuestionRecord(sourceQuestion);
        const data = questionJson(source);
        created.push(
          await transaction.question.create({
            data: {
              quizSetId,
              prompt: sourceQuestion.prompt,
              choices: data.choices,
              answer: data.answer,
              order: (lastQuestion._max.order ?? -1) + index + 1,
            },
            select: {
              id: true,
              quizSetId: true,
              prompt: true,
              choices: true,
              answer: true,
              order: true,
            },
          }),
        );
      }

      await transaction.quizSet.update({
        where: { id: quizSetId },
        data: { updatedAt: new Date() },
      });
      return created;
    });

    return { ok: true, questions: duplicated.map(parseQuestionRecord) };
  } catch {
    return { ok: false, error: "선택한 문제를 복제하지 못했어요." };
  }
}

export async function changeQuestionDraftTypes(
  quizSetId: string,
  questionIds: string[],
  requestedType: QuestionType,
): Promise<QuestionActionResult> {
  const teacherId = await getTeacherId();
  const uniqueIds = [...new Set(questionIds)];

  if (uniqueIds.length === 0 || !isQuestionType(requestedType)) {
    return { ok: false, error: "유형을 변경할 문제를 선택해 주세요." };
  }

  const questions = await prisma.question.findMany({
    where: { id: { in: uniqueIds }, quizSetId, quizSet: { ownerId: teacherId } },
    orderBy: { order: "asc" },
    select: {
      id: true,
      quizSetId: true,
      prompt: true,
      choices: true,
      answer: true,
      order: true,
    },
  });

  if (questions.length !== uniqueIds.length) {
    return { ok: false, error: "변경할 문제 목록이 달라졌어요. 새로고침 후 다시 시도해 주세요." };
  }

  try {
    const changedQuestions = questions.map((question) =>
      changeQuestionType(parseQuestionRecord(question), requestedType),
    );
    await prisma.$transaction([
      ...changedQuestions.map((question) => {
        const data = questionJson(question);
        return prisma.question.update({
          where: { id: question.id },
          data: { choices: data.choices, answer: data.answer },
        });
      }),
      prisma.quizSet.update({ where: { id: quizSetId }, data: { updatedAt: new Date() } }),
    ]);

    return { ok: true, questions: changedQuestions };
  } catch {
    return { ok: false, error: "선택한 문제의 유형을 변경하지 못했어요." };
  }
}

export async function moveQuestionDrafts(
  sourceQuizSetId: string,
  targetQuizSetId: string,
  questionIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  const teacherId = await getTeacherId();
  const uniqueIds = [...new Set(questionIds)];

  if (sourceQuizSetId === targetQuizSetId || uniqueIds.length === 0) {
    return { ok: false, error: "이동할 문제와 대상 세트를 확인해 주세요." };
  }

  const [sourceSet, targetSet, selectedQuestions, remainingQuestions, targetLastQuestion] =
    await Promise.all([
      ownsQuizSet(sourceQuizSetId, teacherId),
      ownsQuizSet(targetQuizSetId, teacherId),
      prisma.question.findMany({
        where: {
          id: { in: uniqueIds },
          quizSetId: sourceQuizSetId,
          quizSet: { ownerId: teacherId },
        },
        orderBy: { order: "asc" },
        select: { id: true },
      }),
      prisma.question.findMany({
        where: { quizSetId: sourceQuizSetId, id: { notIn: uniqueIds } },
        orderBy: { order: "asc" },
        select: { id: true },
      }),
      prisma.question.aggregate({
        where: { quizSetId: targetQuizSetId },
        _max: { order: true },
      }),
    ]);

  if (!sourceSet || !targetSet || selectedQuestions.length !== uniqueIds.length) {
    return { ok: false, error: "문제 또는 대상 세트를 찾을 수 없어요." };
  }

  try {
    const targetStartOrder = (targetLastQuestion._max.order ?? -1) + 1;
    await prisma.$transaction([
      ...selectedQuestions.map((question, index) =>
        prisma.question.update({
          where: { id: question.id },
          data: { quizSetId: targetQuizSetId, order: targetStartOrder + index },
        }),
      ),
      ...remainingQuestions.map((question, order) =>
        prisma.question.update({ where: { id: question.id }, data: { order } }),
      ),
      prisma.quizSet.update({
        where: { id: sourceQuizSetId },
        data: { updatedAt: new Date() },
      }),
      prisma.quizSet.update({
        where: { id: targetQuizSetId },
        data: { updatedAt: new Date() },
      }),
    ]);
    revalidatePath(`/dashboard/sets/${sourceQuizSetId}/edit`);
    revalidatePath(`/dashboard/sets/${targetQuizSetId}/edit`);
    return { ok: true };
  } catch {
    return { ok: false, error: "선택한 문제를 다른 세트로 이동하지 못했어요." };
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

export async function deleteQuestionDrafts(
  quizSetId: string,
  questionIds: string[],
): Promise<QuestionActionResult> {
  const teacherId = await getTeacherId();
  const uniqueIds = [...new Set(questionIds)];
  const questions = await prisma.question.findMany({
    where: { id: { in: uniqueIds }, quizSetId, quizSet: { ownerId: teacherId } },
    orderBy: { order: "asc" },
    select: {
      id: true,
      quizSetId: true,
      prompt: true,
      choices: true,
      answer: true,
      order: true,
    },
  });

  if (uniqueIds.length === 0 || questions.length !== uniqueIds.length) {
    return { ok: false, error: "삭제할 문제 목록이 변경됐어요." };
  }

  try {
    await prisma.$transaction([
      prisma.question.deleteMany({ where: { id: { in: uniqueIds }, quizSetId } }),
      prisma.quizSet.update({ where: { id: quizSetId }, data: { updatedAt: new Date() } }),
    ]);
    return { ok: true, questions: questions.map(parseQuestionRecord) };
  } catch {
    return { ok: false, error: "선택한 문제를 삭제하지 못했어요." };
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

export async function restoreQuestionDrafts(
  inputs: QuestionSaveInput[],
): Promise<QuestionActionResult> {
  const first = inputs[0];
  const teacherId = await getTeacherId();
  const quizSet = first ? await ownsQuizSet(first.quizSetId, teacherId) : null;

  if (
    !quizSet ||
    inputs.length === 0 ||
    inputs.some(
      (input) =>
        !input.id || input.quizSetId !== first.quizSetId || !isQuestionType(input.type),
    )
  ) {
    return { ok: false, error: "복구할 문제 정보가 올바르지 않아요." };
  }

  try {
    const restored = await prisma.$transaction(async (transaction) => {
      const created = [];

      for (const input of inputs) {
        const data = questionJson(input);
        created.push(
          await transaction.question.create({
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
          }),
        );
      }

      await transaction.quizSet.update({
        where: { id: first.quizSetId },
        data: { updatedAt: new Date() },
      });
      return created;
    });

    return { ok: true, questions: restored.map(parseQuestionRecord) };
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
