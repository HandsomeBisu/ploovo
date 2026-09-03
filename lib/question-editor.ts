export const questionTypes = ["multiple-choice", "true-false", "short-answer"] as const;

export type QuestionType = (typeof questionTypes)[number];

export type EditorQuestion = {
  id: string;
  quizSetId: string;
  prompt: string;
  type: QuestionType;
  choices: string[];
  answerIndex: number;
  answerText: string;
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

  const answerIndex = Number(answer.index);

  return {
    id: record.id,
    quizSetId: record.quizSetId,
    prompt: record.prompt,
    type,
    choices,
    answerIndex: Number.isInteger(answerIndex) ? answerIndex : 0,
    answerText: typeof answer.text === "string" ? answer.text : "",
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
      !Number.isInteger(question.answerIndex) ||
      question.answerIndex < 0 ||
      question.answerIndex >= question.choices.length
    ) {
      issues.push({ code: "answer", message: "정답 보기를 선택해 주세요." });
    }
  }

  if (question.type === "true-false" && ![0, 1].includes(question.answerIndex)) {
    issues.push({ code: "answer", message: "O 또는 X를 정답으로 선택해 주세요." });
  }

  if (question.type === "short-answer" && !question.answerText.trim()) {
    issues.push({ code: "answer", message: "단답형 정답을 입력해 주세요." });
  }

  return issues;
}

export function isQuestionComplete(question: EditorQuestion) {
  return validateQuestion(question).length === 0;
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
