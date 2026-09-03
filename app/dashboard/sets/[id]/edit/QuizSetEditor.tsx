"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClipboardEvent, DragEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleDashed,
  Copy,
  Eye,
  GripVertical,
  ListChecks,
  LoaderCircle,
  Plus,
  RotateCcw,
  Save,
  TextCursorInput,
  ToggleLeft,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  createQuestionDraft,
  deleteQuestionDraft,
  duplicateQuestionDraft,
  reorderQuestionDrafts,
  restoreQuestionDraft,
  saveQuestionDraft,
} from "../../../actions";
import {
  isQuestionComplete,
  validateQuestion,
  type EditorQuestion,
  type QuestionType,
} from "@/lib/question-editor";
import styles from "./QuizSetEditor.module.css";

type SaveStatus = "saved" | "unsaved" | "saving" | "error";
type MobileView = "list" | "edit" | "preview";

const typeLabels: Record<QuestionType, string> = {
  "multiple-choice": "객관식",
  "true-false": "OX",
  "short-answer": "단답형",
};

export function QuizSetEditor({
  description,
  initialQuestions,
  quizSetId,
  title,
}: {
  description: string | null;
  initialQuestions: EditorQuestion[];
  quizSetId: string;
  title: string;
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initialQuestions);
  const [activeId, setActiveId] = useState(initialQuestions[0]?.id ?? null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("edit");
  const [showValidation, setShowValidation] = useState(false);
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  const [undoItem, setUndoItem] = useState<{ question: EditorQuestion; index: number } | null>(null);
  const saveTimers = useRef(new Map<string, number>());
  const saveVersions = useRef(new Map<string, number>());
  const dirtyIds = useRef(new Set<string>());
  const choiceInputs = useRef<Array<HTMLInputElement | null>>([]);

  const activeQuestion = questions.find((question) => question.id === activeId) ?? null;
  const completeCount = questions.filter(isQuestionComplete).length;
  const activeIssues = activeQuestion ? validateQuestion(activeQuestion) : [];

  useEffect(() => {
    const timers = saveTimers.current;

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!notice && !undoItem) {
      return;
    }

    const timer = window.setTimeout(() => {
      setNotice(null);
      setUndoItem(null);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [notice, undoItem]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (dirtyIds.current.size === 0 && saveStatus !== "saving") {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [saveStatus]);

  function scheduleSave(question: EditorQuestion) {
    const previousTimer = saveTimers.current.get(question.id);
    if (previousTimer) {
      window.clearTimeout(previousTimer);
    }

    const version = (saveVersions.current.get(question.id) ?? 0) + 1;
    saveVersions.current.set(question.id, version);
    dirtyIds.current.add(question.id);
    setSaveStatus("unsaved");

    const timer = window.setTimeout(() => {
      void persistQuestion(question, version);
    }, 800);
    saveTimers.current.set(question.id, timer);
  }

  async function persistQuestion(question: EditorQuestion, version: number) {
    saveTimers.current.delete(question.id);
    setSaveStatus("saving");
    const result = await saveQuestionDraft(question);

    if (saveVersions.current.get(question.id) !== version) {
      return;
    }

    if (!result.ok) {
      setSaveStatus("error");
      setNotice({ message: result.error, error: true });
      return;
    }

    dirtyIds.current.delete(question.id);
    setSavedAt(result.savedAt ? new Date(result.savedAt) : new Date());
    setSaveStatus(dirtyIds.current.size > 0 ? "unsaved" : "saved");
  }

  function updateActive(transform: (question: EditorQuestion) => EditorQuestion) {
    if (!activeQuestion) {
      return;
    }

    const updated = transform(activeQuestion);
    setQuestions((current) =>
      current.map((question) => (question.id === updated.id ? updated : question)),
    );
    scheduleSave(updated);
  }

  function selectQuestion(id: string) {
    setActiveId(id);
    setMobileView("edit");
  }

  async function addQuestion(type: QuestionType = "multiple-choice") {
    setBusyAction("add");
    const result = await createQuestionDraft(quizSetId, type);

    if (!result.ok || !result.question) {
      setBusyAction(null);
      setNotice({ message: result.ok ? "문제를 추가하지 못했어요." : result.error, error: true });
      return;
    }

    const activeIndex = questions.findIndex((question) => question.id === activeId);
    const insertIndex = activeIndex >= 0 ? activeIndex + 1 : questions.length;
    const nextQuestions = [...questions];
    nextQuestions.splice(insertIndex, 0, result.question);
    const normalized = normalizeOrders(nextQuestions);
    setQuestions(normalized);
    setActiveId(result.question.id);
    setMobileView("edit");
    setShowValidation(false);
    if (insertIndex < questions.length) {
      await reorderQuestionDrafts(quizSetId, normalized.map((question) => question.id));
    }
    setBusyAction(null);
    setNotice({ message: "새 문제를 추가했어요." });
  }

  async function duplicateActive() {
    if (!activeQuestion) {
      return;
    }

    setBusyAction("duplicate");
    const result = await duplicateQuestionDraft(quizSetId, activeQuestion.id);

    if (!result.ok || !result.question) {
      setBusyAction(null);
      setNotice({ message: result.ok ? "문제를 복제하지 못했어요." : result.error, error: true });
      return;
    }

    const activeIndex = questions.findIndex((question) => question.id === activeQuestion.id);
    const nextQuestions = [...questions];
    nextQuestions.splice(activeIndex + 1, 0, result.question);
    const normalized = normalizeOrders(nextQuestions);
    setQuestions(normalized);
    setActiveId(result.question.id);
    await reorderQuestionDrafts(quizSetId, normalized.map((question) => question.id));
    setBusyAction(null);
    setNotice({ message: "문제를 복제했어요." });
  }

  async function deleteActive() {
    if (!activeQuestion) {
      return;
    }

    setBusyAction("delete");
    clearQuestionSave(activeQuestion.id);
    const index = questions.findIndex((question) => question.id === activeQuestion.id);
    const result = await deleteQuestionDraft(quizSetId, activeQuestion.id);
    setBusyAction(null);

    if (!result.ok || !result.question) {
      scheduleSave(activeQuestion);
      setNotice({ message: result.ok ? "문제를 삭제하지 못했어요." : result.error, error: true });
      return;
    }

    const remaining = normalizeOrders(questions.filter((question) => question.id !== activeQuestion.id));
    setQuestions(remaining);
    setActiveId(remaining[Math.min(index, remaining.length - 1)]?.id ?? null);
    setUndoItem({ question: result.question, index });
    setNotice({ message: "문제를 삭제했어요." });
  }

  async function undoDelete() {
    if (!undoItem) {
      return;
    }

    setBusyAction("undo");
    const result = await restoreQuestionDraft(undoItem.question);

    if (!result.ok || !result.question) {
      setBusyAction(null);
      setNotice({ message: result.ok ? "문제를 복구하지 못했어요." : result.error, error: true });
      return;
    }

    const restored = [...questions];
    restored.splice(undoItem.index, 0, result.question);
    const normalized = normalizeOrders(restored);
    setQuestions(normalized);
    setActiveId(result.question.id);
    setUndoItem(null);
    await reorderQuestionDrafts(quizSetId, normalized.map((question) => question.id));
    setBusyAction(null);
    setNotice({ message: "문제를 다시 복구했어요." });
  }

  async function moveQuestion(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= questions.length) {
      return;
    }

    const reordered = [...questions];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const normalized = normalizeOrders(reordered);
    setQuestions(normalized);
    const result = await reorderQuestionDrafts(quizSetId, normalized.map((question) => question.id));

    if (!result.ok) {
      setQuestions(questions);
      setNotice({ message: result.error ?? "순서를 저장하지 못했어요.", error: true });
    }
  }

  function handleDrop(targetIndex: number) {
    const fromIndex = questions.findIndex((question) => question.id === draggedId);
    setDraggedId(null);
    if (fromIndex >= 0) {
      void moveQuestion(fromIndex, targetIndex);
    }
  }

  async function finishEditing() {
    setShowValidation(true);

    if (questions.length === 0) {
      setNotice({ message: "완료하려면 문제를 하나 이상 추가해 주세요.", error: true });
      return;
    }

    const firstIncomplete = questions.find((question) => !isQuestionComplete(question));
    if (firstIncomplete) {
      setActiveId(firstIncomplete.id);
      setMobileView("edit");
      setNotice({ message: "입력이 필요한 첫 번째 문제로 이동했어요.", error: true });
      return;
    }

    setBusyAction("finish");
    const dirtyQuestions = questions.filter((question) => dirtyIds.current.has(question.id));
    dirtyQuestions.forEach((question) => clearQuestionSave(question.id, false));
    const results = await Promise.all(dirtyQuestions.map((question) => saveQuestionDraft(question)));

    if (results.some((result) => !result.ok)) {
      setBusyAction(null);
      setSaveStatus("error");
      setNotice({ message: "저장되지 않은 문제가 있어요. 다시 시도해 주세요.", error: true });
      return;
    }

    dirtyIds.current.clear();
    setSaveStatus("saved");
    router.push(`/dashboard/sets/${quizSetId}`);
  }

  function clearQuestionSave(questionId: string, clearDirty = true) {
    const timer = saveTimers.current.get(questionId);
    if (timer) {
      window.clearTimeout(timer);
      saveTimers.current.delete(questionId);
    }
    if (clearDirty) {
      dirtyIds.current.delete(questionId);
    }
    saveVersions.current.set(questionId, (saveVersions.current.get(questionId) ?? 0) + 1);
  }

  return (
    <section className={styles.editorPage} aria-labelledby="quiz-editor-title">
      <header className={styles.editorHeader}>
        <Link className={styles.backLink} href="/dashboard" aria-label="대시보드로 돌아가기">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <div className={styles.titleCopy}>
          <span>문제 세트 편집</span>
          <h1 id="quiz-editor-title">{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        <SaveIndicator savedAt={savedAt} status={saveStatus} />
        <button
          className={styles.finishButton}
          disabled={busyAction === "finish"}
          onClick={() => void finishEditing()}
          title="편집 완료"
          type="button"
        >
          {busyAction === "finish" ? <LoaderCircle className={styles.spin} /> : <Check />}
          편집 완료
        </button>
      </header>

      <div className={styles.progressLine}>
        <span style={{ width: `${questions.length ? (completeCount / questions.length) * 100 : 0}%` }} />
      </div>

      <div className={styles.mobileTabs} aria-label="편집 화면 선택">
        <button aria-pressed={mobileView === "list"} onClick={() => setMobileView("list")} type="button">
          <ListChecks /> 목록
        </button>
        <button aria-pressed={mobileView === "edit"} onClick={() => setMobileView("edit")} type="button">
          <TextCursorInput /> 편집
        </button>
        <button aria-pressed={mobileView === "preview"} onClick={() => setMobileView("preview")} type="button">
          <Eye /> 미리보기
        </button>
      </div>

      <div className={styles.editorWorkspace} data-mobile-view={mobileView}>
        <aside className={styles.questionRail} aria-label="문제 목록">
          <div className={styles.panelHeading}>
            <div>
              <strong>문제</strong>
              <span>{completeCount}/{questions.length} 완성</span>
            </div>
            <button aria-label="새 문제 추가" disabled={busyAction === "add"} onClick={() => void addQuestion()} title="새 문제 추가" type="button">
              {busyAction === "add" ? <LoaderCircle className={styles.spin} /> : <Plus />}
            </button>
          </div>

          {questions.length === 0 ? (
            <div className={styles.railEmpty}>
              <ListChecks />
              <p>아직 문제가 없어요.</p>
              <button onClick={() => void addQuestion()} type="button">첫 문제 추가</button>
            </div>
          ) : (
            <ol className={styles.questionList}>
              {questions.map((question, index) => {
                const complete = isQuestionComplete(question);
                return (
                  <li
                    className={question.id === activeId ? styles.activeQuestion : undefined}
                    draggable
                    key={question.id}
                    onDragEnd={() => setDraggedId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDragStart={(event: DragEvent<HTMLLIElement>) => {
                      event.dataTransfer.effectAllowed = "move";
                      setDraggedId(question.id);
                    }}
                    onDrop={() => handleDrop(index)}
                  >
                    <button className={styles.questionSelect} onClick={() => selectQuestion(question.id)} type="button">
                      <GripVertical className={styles.dragHandle} aria-hidden="true" />
                      <span className={styles.questionNumber}>{index + 1}</span>
                      <span className={styles.questionSummary}>
                        <small>{typeLabels[question.type]}</small>
                        <strong>{question.prompt || "새 문제"}</strong>
                      </span>
                      {complete ? <CheckCircle2 className={styles.completeIcon} aria-label="완성" /> : <CircleDashed className={styles.incompleteIcon} aria-label="미완성" />}
                    </button>
                    <div className={styles.orderButtons}>
                      <button aria-label={`${index + 1}번 문제 위로 이동`} disabled={index === 0} onClick={() => void moveQuestion(index, index - 1)} title="위로 이동" type="button"><ArrowUp /></button>
                      <button aria-label={`${index + 1}번 문제 아래로 이동`} disabled={index === questions.length - 1} onClick={() => void moveQuestion(index, index + 1)} title="아래로 이동" type="button"><ArrowDown /></button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <button className={styles.addQuestionButton} onClick={() => void addQuestion()} type="button"><Plus /> 문제 추가</button>
        </aside>

        <main className={styles.questionCanvas}>
          {activeQuestion ? (
            <QuestionForm
              choiceInputs={choiceInputs}
              issues={activeIssues}
              key={activeQuestion.id}
              onChange={updateActive}
              question={activeQuestion}
              showValidation={showValidation}
            />
          ) : (
            <div className={styles.canvasEmpty}>
              <ListChecks />
              <h2>첫 문제부터 만들어볼까요?</h2>
              <p>문제 유형을 고른 뒤 내용을 입력하면 자동으로 저장돼요.</p>
              <div>
                <button onClick={() => void addQuestion("multiple-choice")} type="button"><ListChecks /> 객관식</button>
                <button onClick={() => void addQuestion("true-false")} type="button"><ToggleLeft /> OX</button>
                <button onClick={() => void addQuestion("short-answer")} type="button"><TextCursorInput /> 단답형</button>
              </div>
            </div>
          )}
        </main>

        <aside className={styles.previewPanel} aria-label="학생 화면 미리보기">
          <div className={styles.previewHeading}>
            <div><Eye /><strong>학생 화면</strong></div>
            {activeQuestion ? <span>{typeLabels[activeQuestion.type]}</span> : null}
          </div>
          <QuestionPreview question={activeQuestion} />
        </aside>
      </div>

      {activeQuestion ? (
        <div className={styles.editorFooter}>
          <div>
            <button disabled={busyAction === "duplicate"} onClick={() => void duplicateActive()} type="button"><Copy /> 문제 복제</button>
            <button className={styles.deleteButton} disabled={busyAction === "delete"} onClick={() => void deleteActive()} type="button"><Trash2 /> 삭제</button>
          </div>
          <span>문제 {questions.findIndex((question) => question.id === activeQuestion.id) + 1} / {questions.length}</span>
        </div>
      ) : null}

      {notice || undoItem ? (
        <div className={`${styles.toast} ${notice?.error ? styles.toastError : ""}`} role="status">
          {notice?.error ? <TriangleAlert /> : <CheckCircle2 />}
          <span>{notice?.message ?? "문제를 삭제했어요."}</span>
          {undoItem ? (
            <button disabled={busyAction === "undo"} onClick={() => void undoDelete()} type="button"><RotateCcw /> 실행 취소</button>
          ) : (
            <button aria-label="알림 닫기" onClick={() => setNotice(null)} type="button"><X /></button>
          )}
        </div>
      ) : null}
    </section>
  );
}

function SaveIndicator({ savedAt, status }: { savedAt: Date | null; status: SaveStatus }) {
  const copy = useMemo(() => {
    if (status === "saving") return "저장 중...";
    if (status === "unsaved") return "변경사항 있음";
    if (status === "error") return "저장 실패";
    if (savedAt) return "저장됨 · 방금 전";
    return "자동 저장";
  }, [savedAt, status]);

  return (
    <span className={`${styles.saveStatus} ${styles[`save_${status}`]}`} aria-live="polite">
      {status === "saving" ? <LoaderCircle className={styles.spin} /> : status === "error" ? <TriangleAlert /> : <Save />}
      {copy}
    </span>
  );
}

function QuestionForm({
  choiceInputs,
  issues,
  onChange,
  question,
  showValidation,
}: {
  choiceInputs: { current: Array<HTMLInputElement | null> };
  issues: ReturnType<typeof validateQuestion>;
  onChange: (transform: (question: EditorQuestion) => EditorQuestion) => void;
  question: EditorQuestion;
  showValidation: boolean;
}) {
  const duplicateIssue = issues.find((issue) => issue.code === "duplicate");
  const visibleIssue = duplicateIssue ?? (showValidation ? issues[0] : undefined);

  function changeType(type: QuestionType) {
    onChange((current) => {
      if (type === "multiple-choice") {
        const previous = current.type === "multiple-choice" ? current.choices : [];
        return { ...current, type, choices: Array.from({ length: Math.max(4, previous.length) }, (_, index) => previous[index] ?? ""), answerIndex: 0 };
      }
      if (type === "true-false") return { ...current, type, choices: ["O", "X"], answerIndex: 0 };
      return { ...current, type, choices: [], answerText: "", answerIndex: 0 };
    });
  }

  function updateChoice(index: number, value: string) {
    onChange((current) => ({ ...current, choices: current.choices.map((choice, choiceIndex) => choiceIndex === index ? value.slice(0, 120) : choice) }));
  }

  function addChoice() {
    if (question.choices.length >= 6) return;
    onChange((current) => ({ ...current, choices: [...current.choices, ""] }));
    window.setTimeout(() => choiceInputs.current[question.choices.length]?.focus(), 0);
  }

  function removeChoice(index: number) {
    if (question.choices.length <= 2) return;
    onChange((current) => {
      const choices = current.choices.filter((_, choiceIndex) => choiceIndex !== index);
      let answerIndex = current.answerIndex;
      if (answerIndex === index) answerIndex = 0;
      else if (answerIndex > index) answerIndex -= 1;
      return { ...current, choices, answerIndex };
    });
  }

  function moveChoice(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= question.choices.length) return;
    onChange((current) => {
      const choices = [...current.choices];
      [choices[index], choices[target]] = [choices[target], choices[index]];
      let answerIndex = current.answerIndex;
      if (answerIndex === index) answerIndex = target;
      else if (answerIndex === target) answerIndex = index;
      return { ...current, choices, answerIndex };
    });
  }

  function handleChoicePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const lines = event.clipboardData.getData("text").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return;
    event.preventDefault();
    onChange((current) => {
      const choices = [...current.choices];
      lines.slice(0, 6 - index).forEach((line, offset) => { choices[index + offset] = line.slice(0, 120); });
      return { ...current, choices: choices.slice(0, 6) };
    });
  }

  function handleChoiceKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const next = choiceInputs.current[index + 1];
    if (next) next.focus();
    else if (question.choices.length < 6) addChoice();
  }

  return (
    <div className={styles.questionForm}>
      <div className={styles.formTopline}>
        <span>문제 유형</span>
        <div className={styles.typeSelector} role="group" aria-label="문제 유형">
          <button aria-pressed={question.type === "multiple-choice"} onClick={() => changeType("multiple-choice")} type="button"><ListChecks /> 객관식</button>
          <button aria-pressed={question.type === "true-false"} onClick={() => changeType("true-false")} type="button"><ToggleLeft /> OX</button>
          <button aria-pressed={question.type === "short-answer"} onClick={() => changeType("short-answer")} type="button"><TextCursorInput /> 단답형</button>
        </div>
      </div>

      <label className={styles.promptField}>
        <span>문제</span>
        <textarea autoFocus maxLength={240} onChange={(event) => onChange((current) => ({ ...current, prompt: event.target.value.slice(0, 240) }))} placeholder="학생들에게 보여줄 문제를 입력하세요." rows={4} value={question.prompt} />
        <small>{question.prompt.length}/240</small>
      </label>

      {question.type === "multiple-choice" ? (
        <fieldset className={styles.choiceEditor}>
          <legend><span>보기</span><small>정답 왼쪽의 원을 눌러 지정하세요.</small></legend>
          {question.choices.map((choice, index) => (
            <div className={`${styles.choiceRow} ${question.answerIndex === index ? styles.correctChoice : ""}`} key={`${question.id}-choice-${index}`}>
              <button aria-label={`${index + 1}번 보기를 정답으로 지정`} aria-pressed={question.answerIndex === index} className={styles.answerToggle} onClick={() => onChange((current) => ({ ...current, answerIndex: index }))} title="정답 지정" type="button">
                {question.answerIndex === index ? <CheckCircle2 /> : <Circle />}<span>{String.fromCharCode(65 + index)}</span>
              </button>
              <input maxLength={120} onChange={(event) => updateChoice(index, event.target.value)} onKeyDown={(event) => handleChoiceKeyDown(index, event)} onPaste={(event) => handleChoicePaste(index, event)} placeholder={`${index + 1}번 보기`} ref={(element) => { choiceInputs.current[index] = element; }} value={choice} />
              <span className={styles.choiceCount}>{choice.length}/120</span>
              <div className={styles.choiceActions}>
                <button aria-label="보기 위로 이동" disabled={index === 0} onClick={() => moveChoice(index, -1)} title="위로" type="button"><ArrowUp /></button>
                <button aria-label="보기 아래로 이동" disabled={index === question.choices.length - 1} onClick={() => moveChoice(index, 1)} title="아래로" type="button"><ArrowDown /></button>
                <button aria-label="보기 삭제" disabled={question.choices.length <= 2} onClick={() => removeChoice(index)} title="삭제" type="button"><X /></button>
              </div>
            </div>
          ))}
          <button className={styles.addChoice} disabled={question.choices.length >= 6} onClick={addChoice} type="button"><Plus /> 보기 추가 {question.choices.length}/6</button>
          <p className={styles.pasteHint}>여러 줄을 붙여넣으면 각 줄이 보기로 자동 입력돼요.</p>
        </fieldset>
      ) : null}

      {question.type === "true-false" ? (
        <fieldset className={styles.trueFalseEditor}>
          <legend>정답 선택</legend>
          {["O", "X"].map((label, index) => (
            <button aria-pressed={question.answerIndex === index} key={label} onClick={() => onChange((current) => ({ ...current, answerIndex: index }))} type="button">
              {question.answerIndex === index ? <CheckCircle2 /> : <Circle />}<strong>{label}</strong>
            </button>
          ))}
        </fieldset>
      ) : null}

      {question.type === "short-answer" ? (
        <label className={styles.shortAnswerField}>
          <span>정답</span>
          <input maxLength={120} onChange={(event) => onChange((current) => ({ ...current, answerText: event.target.value.slice(0, 120) }))} placeholder="정답을 입력하세요." value={question.answerText} />
          <small>{question.answerText.length}/120</small>
        </label>
      ) : null}

      {visibleIssue ? (
        <p className={styles.validationMessage} role="alert"><TriangleAlert /> {visibleIssue.message}</p>
      ) : (
        <p className={styles.validMessage}><CheckCircle2 /> {isQuestionComplete(question) ? "이 문제는 완성됐어요." : "입력한 내용은 자동으로 저장돼요."}</p>
      )}
    </div>
  );
}

function QuestionPreview({ question }: { question: EditorQuestion | null }) {
  if (!question) {
    return <div className={styles.previewEmpty}><Eye /><p>문제를 추가하면 학생 화면이 여기에 보여요.</p></div>;
  }

  return (
    <div className={styles.studentPreview}>
      <div className={styles.previewProgress}><span /></div>
      <p className={styles.previewPrompt}>{question.prompt || "문제 내용이 여기에 표시됩니다."}</p>
      {question.type !== "short-answer" ? (
        <div className={styles.previewChoices}>
          {question.choices.map((choice, index) => (
            <div className={question.answerIndex === index ? styles.previewCorrect : undefined} key={index}>
              <span>{question.type === "true-false" ? choice : String.fromCharCode(65 + index)}</span>
              <strong>{choice || `${index + 1}번 보기`}</strong>
              {question.answerIndex === index ? <Check /> : <ChevronRight />}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.previewShortAnswer}><span>답을 입력하세요.</span><strong>{question.answerText ? `정답: ${question.answerText}` : "정답을 설정해 주세요."}</strong></div>
      )}
    </div>
  );
}

function normalizeOrders(questions: EditorQuestion[]) {
  return questions.map((question, order) => ({ ...question, order }));
}
