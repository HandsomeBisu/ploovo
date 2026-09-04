import { Check, ChevronDown } from "lucide-react";
import type { EditorQuestion } from "@/lib/question-editor";

export function QuizSetQuestionList({
  emptyMessage = "아직 문제가 없어요.",
  questions,
}: {
  emptyMessage?: string;
  questions: EditorQuestion[];
}) {
  if (questions.length === 0) {
    return <p>{emptyMessage}</p>;
  }

  return (
    <ul className="question-preview-list" aria-label="문항 미리보기">
      {questions.map((question, index) => (
        <li key={question.id}>
          <details className="question-preview-item">
            <summary>
              <span>{index + 1}</span>
              <strong>{question.prompt || "내용이 없는 문제"}</strong>
              <small>{questionTypeLabel(question.type)}</small>
              <ChevronDown aria-hidden="true" />
            </summary>
            <div className="question-preview-content">
              {question.type === "short-answer" ? (
                <>
                  <p>
                    {question.shortAnswerMatch === "exact"
                      ? "학생 답이 아래 정답과 완전히 일치해야 합니다."
                      : "학생 답에 아래 정답 중 하나가 포함되어야 합니다."}
                  </p>
                  <div className="question-answer-tags">
                    {question.answerTexts.map((answer, answerIndex) => (
                      <span key={answerIndex}>{answer || "입력되지 않은 정답"}</span>
                    ))}
                  </div>
                </>
              ) : (
                <ol>
                  {question.choices.map((choice, choiceIndex) => (
                    <li
                      className={question.answerIndices.includes(choiceIndex) ? "is-correct" : undefined}
                      key={choiceIndex}
                    >
                      <span>
                        {question.type === "true-false"
                          ? choice
                          : String.fromCharCode(65 + choiceIndex)}
                      </span>
                      <strong>{choice || "입력되지 않은 보기"}</strong>
                      {question.answerIndices.includes(choiceIndex) ? (
                        <Check aria-label="정답" />
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}

function questionTypeLabel(type: EditorQuestion["type"]) {
  if (type === "true-false") return "OX";
  if (type === "short-answer") return "단답형";
  return "객관식";
}
