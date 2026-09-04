export const questionTypes = ["multiple-choice", "true-false", "short-answer"] as const;

export type QuestionType = (typeof questionTypes)[number];
export type ShortAnswerMatch = "exact" | "contains";

export type EditorQuestion = {
  id: string;
  quizSetId: string;
  prompt: string;
  type: QuestionType;
  choices: string[];
  answerIndices: number[];
  answerTexts: string[];
  shortAnswerMatch: ShortAnswerMatch;
  order: number;
};

export type QuestionSaveInput = EditorQuestion;

export type QuestionIssue = {
  code: "prompt" | "choices" | "duplicate" | "answer";
  message: string;
};

export function isQuestionType(value: unknown): value is QuestionType {
  return questionTypes.includes(value as QuestionType);
}

export function parseQuestionRecord(record: {
  id: string;
  quizSetId: string;
  prompt: string;
  choices: unknown;
  answer: unknown;
  order: number;
}): EditorQuestion {
  const answer = getAnswerObject(record.answer);
  const type = isQuestionType(answer.type) ? answer.type : "multiple-choice";
  const storedChoices = Array.isArray(record.choices)
    ? record.choices.map((choice) => String(choice).slice(0, 120))
    : [];

  let choices = storedChoices;

  if (type === "multiple-choice") {
    const choiceCount = Math.min(6, Math.max(2, storedChoices.length || 4));
    choices = Array.from({ length: choiceCount }, (_, index) => storedChoices[index] ?? "");
  } else if (type === "true-false") {
    choices = ["O", "X"];
  } else {
    choices = [];
  }

  const legacyAnswerIndex = Number(answer.index);
  const answerIndices = Array.isArray(answer.indices)
    ? [...new Set(answer.indices.map(Number).filter(Number.isInteger))]
    : Number.isInteger(legacyAnswerIndex)
      ? [legacyAnswerIndex]
      : [];
  const answerTexts = Array.isArray(answer.texts)
    ? answer.texts.map(String).slice(0, 5)
    : typeof answer.text === "string"
      ? [answer.text]
      : [""];
  const shortAnswerMatch: ShortAnswerMatch = answer.match === "contains" ? "contains" : "exact";

  return {
    id: record.id,
    quizSetId: record.quizSetId,
    prompt: record.prompt,
    type,
    choices,
    answerIndices,
    answerTexts,
    shortAnswerMatch,
    order: record.order,
  };
}

export function validateQuestion(question: EditorQuestion): QuestionIssue[] {
  const issues: QuestionIssue[] = [];

  if (!question.prompt.trim()) {
    issues.push({ code: "prompt", message: "문제 내용을 입력해 주세요." });
  }

  if (question.type === "multiple-choice") {
    const normalizedChoices = question.choices.map((choice) => choice.trim().toLocaleLowerCase("ko-KR"));

    if (question.choices.length < 2 || question.choices.some((choice) => !choice.trim())) {
      issues.push({ code: "choices", message: "보기는 두 개 이상 모두 입력해 주세요." });
    }

    const filledChoices = normalizedChoices.filter(Boolean);
    if (new Set(filledChoices).size !== filledChoices.length) {
      issues.push({ code: "duplicate", message: "같은 보기가 두 번 들어가 있어요." });
    }

    if (
      question.answerIndices.length === 0 ||
      question.answerIndices.some(
        (index) => !Number.isInteger(index) || index < 0 || index >= question.choices.length,
      )
    ) {
      issues.push({ code: "answer", message: "정답 보기를 하나 이상 선택해 주세요." });
    }
  }

  if (
    question.type === "true-false" &&
    (question.answerIndices.length !== 1 || ![0, 1].includes(question.answerIndices[0]))
  ) {
    issues.push({ code: "answer", message: "O 또는 X를 정답으로 선택해 주세요." });
  }

  if (
    question.type === "short-answer" &&
    (question.answerTexts.length === 0 || question.answerTexts.some((answer) => !answer.trim()))
  ) {
    issues.push({ code: "answer", message: "추가한 단답형 정답을 모두 입력해 주세요." });
  }

  if (question.type === "short-answer") {
    const normalizedAnswers = question.answerTexts.map((answer) =>
      answer.trim().toLocaleLowerCase("ko-KR"),
    );
    if (new Set(normalizedAnswers).size !== normalizedAnswers.length) {
      issues.push({ code: "duplicate", message: "같은 단답형 정답이 두 번 들어가 있어요." });
    }
  }

  return issues;
}

export function isQuestionComplete(question: EditorQuestion) {
  return validateQuestion(question).length === 0;
}

export function isShortAnswerCorrect(question: EditorQuestion, response: string) {
  if (question.type !== "short-answer") return false;
  const normalizedResponse = response.trim().toLocaleLowerCase("ko-KR");
  if (!normalizedResponse) return false;

  return question.answerTexts.some((answer) => {
    const normalizedAnswer = answer.trim().toLocaleLowerCase("ko-KR");
    if (!normalizedAnswer) return false;
    return question.shortAnswerMatch === "contains"
      ? normalizedResponse.includes(normalizedAnswer)
      : normalizedResponse === normalizedAnswer;
  });
}

function getAnswerObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "number") {
    return { index: value };
  }

  return {};
}
