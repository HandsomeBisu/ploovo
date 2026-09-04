"use client";

import { useRouter } from "next/navigation";
import type { ClipboardEvent, DragEvent, KeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Circle,
  CircleDashed,
  Copy,
  Eye,
  GripVertical,
  ListChecks,
  LoaderCircle,
  MoveRight,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  TextCursorInput,
  ToggleLeft,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  changeQuestionDraftTypes,
  createQuestionDraft,
  deleteQuestionDrafts,
  duplicateQuestionDrafts,
  moveQuestionDrafts,
  reorderQuestionDrafts,
  restoreQuestionDrafts,
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
type DeletedQuestion = { question: EditorQuestion; index: number };
type ContextMenu = { x: number; y: number };

const typeLabels: Record<QuestionType, string> = {
  "multiple-choice": "객관식",
  "true-false": "OX",
  "short-answer": "단답형",
};

export function QuizSetEditor({
  availableSets,
  description,
  initialQuestions,
  quizSetId,
  title,
}: {
  availableSets: Array<{ id: string; title: string }>;
  description: string | null;
  initialQuestions: EditorQuestion[];
  quizSetId: string;
  title: string;
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initialQuestions);
  const [activeId, setActiveId] = useState(initialQuestions[0]?.id ?? null);
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(initialQuestions[0] ? [initialQuestions[0].id] : []),
  );
  const [selectionAnchorId, setSelectionAnchorId] = useState(initialQuestions[0]?.id ?? null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("edit");
  const [showValidation, setShowValidation] = useState(false);
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  const [undoItems, setUndoItems] = useState<DeletedQuestion[] | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkType, setBulkType] = useState<QuestionType>("multiple-choice");
  const [targetSetId, setTargetSetId] = useState(availableSets[0]?.id ?? "");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const saveTimers = useRef(new Map<string, number>());
  const saveVersions = useRef(new Map<string, number>());
  const dirtyIds = useRef(new Set<string>());
  const choiceInputs = useRef<Array<HTMLInputElement | null>>([]);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  const activeQuestion = questions.find((question) => question.id === activeId) ?? null;
  const completeCount = questions.filter(isQuestionComplete).length;
  const activeIssues = activeQuestion ? validateQuestion(activeQuestion) : [];
  const reviewQuestions = useMemo(
    () =>
      questions
        .map((question, index) => ({ question, index, issues: validateQuestion(question) }))
        .filter((item) => item.issues.length > 0),
    [questions],
  );

  useEffect(() => {
    const timers = saveTimers.current;

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!notice && !undoItems) {
      return;
    }

    const timer = window.setTimeout(() => {
      setNotice(null);
      setUndoItems(null);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [notice, undoItems]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const closeMenu = (event?: PointerEvent) => {
      if (
        event?.target instanceof Node &&
        contextMenuRef.current?.contains(event.target)
      ) {
        return;
      }
      setContextMenu(null);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    const closeOnViewportChange = () => setContextMenu(null);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    window.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeMenu);
    return () => {
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
      window.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeMenu);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!reviewOpen && !leaveConfirmOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setReviewOpen(false);
      setLeaveConfirmOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [leaveConfirmOpen, reviewOpen]);

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

  function selectQuestion(id: string, event?: ReactMouseEvent) {
    const index = questions.findIndex((question) => question.id === id);
    const anchorIndex = questions.findIndex((question) => question.id === selectionAnchorId);
    let nextActiveId = id;

    if (event?.shiftKey && anchorIndex >= 0 && index >= 0) {
      const [start, end] = [anchorIndex, index].sort((a, b) => a - b);
      setSelectedIds(new Set(questions.slice(start, end + 1).map((question) => question.id)));
    } else if ((event?.ctrlKey || event?.metaKey) && selectedIds.has(id)) {
      const next = new Set(selectedIds);
      next.delete(id);
      if (next.size > 0) {
        setSelectedIds(next);
        nextActiveId = [...next][0];
      }
      setSelectionAnchorId(id);
    } else if (event?.ctrlKey || event?.metaKey) {
      setSelectedIds(new Set([...selectedIds, id]));
      setSelectionAnchorId(id);
    } else {
      setSelectedIds(new Set([id]));
      setSelectionAnchorId(id);
    }

    setActiveId(nextActiveId);
    setMobileView("edit");
    setContextMenu(null);
  }

  function openQuestionMenu(id: string, event: ReactMouseEvent<HTMLLIElement>) {
    event.preventDefault();
    event.stopPropagation();
    setActiveId(id);
    if (!selectedIds.has(id)) {
      setSelectedIds(new Set([id]));
      setSelectionAnchorId(id);
    }
    setContextMenu({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 188)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 110)),
    });
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
    setSelectedIds(new Set([result.question.id]));
    setSelectionAnchorId(result.question.id);
    setMobileView("edit");
    setShowValidation(false);
    if (insertIndex < questions.length) {
      await reorderQuestionDrafts(quizSetId, normalized.map((question) => question.id));
    }
    setBusyAction(null);
    setNotice({ message: "새 문제를 추가했어요." });
  }

  async function duplicateSelected() {
    const selected = questions.filter((question) => selectedIds.has(question.id));
    if (selected.length === 0 || !(await savePendingQuestions(selected))) {
      return;
    }

    setBusyAction("duplicate");
    setContextMenu(null);
    const result = await duplicateQuestionDrafts(quizSetId, selected.map((question) => question.id));

    if (!result.ok || !result.questions) {
      setBusyAction(null);
      setNotice({ message: result.ok ? "문제를 복제하지 못했어요." : result.error, error: true });
      return;
    }

    const lastSelectedIndex = Math.max(
      ...selected.map((question) => questions.findIndex((item) => item.id === question.id)),
    );
    const nextQuestions = [...questions];
    nextQuestions.splice(lastSelectedIndex + 1, 0, ...result.questions);
    const normalized = normalizeOrders(nextQuestions);
    setQuestions(normalized);
    setActiveId(result.questions[0].id);
    setSelectedIds(new Set(result.questions.map((question) => question.id)));
    setSelectionAnchorId(result.questions[0].id);
    await reorderQuestionDrafts(quizSetId, normalized.map((question) => question.id));
    setBusyAction(null);
    setNotice({ message: `${result.questions.length}개 문제를 복제했어요.` });
  }

  async function savePendingQuestions(items: EditorQuestion[]) {
    const pending = items.filter((question) => dirtyIds.current.has(question.id));
    if (pending.length === 0) return true;

    pending.forEach((question) => clearQuestionSave(question.id, false));
    setSaveStatus("saving");
    const results = await Promise.all(pending.map((question) => saveQuestionDraft(question)));

    if (results.some((result) => !result.ok)) {
      setSaveStatus("error");
      setNotice({ message: "저장되지 않은 문제가 있어 작업을 중단했어요.", error: true });
      return false;
    }

    pending.forEach((question) => dirtyIds.current.delete(question.id));
    setSavedAt(new Date());
    setSaveStatus(dirtyIds.current.size > 0 ? "unsaved" : "saved");
    return true;
  }

  async function changeSelectedType() {
    const selected = questions.filter((question) => selectedIds.has(question.id));
    if (selected.length === 0 || !(await savePendingQuestions(selected))) return;

    setBusyAction("bulk-type");
    const result = await changeQuestionDraftTypes(
      quizSetId,
      selected.map((question) => question.id),
      bulkType,
    );
    setBusyAction(null);

    if (!result.ok || !result.questions) {
      setNotice({ message: result.ok ? "문제 유형을 변경하지 못했어요." : result.error, error: true });
      return;
    }

    const changedById = new Map(result.questions.map((question) => [question.id, question]));
    setQuestions((current) => current.map((question) => changedById.get(question.id) ?? question));
    setBulkOpen(false);
    setShowValidation(false);
    setNotice({ message: `${result.questions.length}개 문제를 ${typeLabels[bulkType]}으로 변경했어요.` });
  }

  async function moveSelectedQuestions() {
    const selected = questions.filter((question) => selectedIds.has(question.id));
    const targetSet = availableSets.find((set) => set.id === targetSetId);
    if (selected.length === 0 || !targetSet || !(await savePendingQuestions(selected))) return;

    setBusyAction("bulk-move");
    const result = await moveQuestionDrafts(
      quizSetId,
      targetSet.id,
      selected.map((question) => question.id),
    );
    setBusyAction(null);

    if (!result.ok) {
      setNotice({ message: result.error ?? "문제를 이동하지 못했어요.", error: true });
      return;
    }

    const firstIndex = Math.min(
      ...selected.map((question) => questions.findIndex((item) => item.id === question.id)),
    );
    const movedIds = new Set(selected.map((question) => question.id));
    const remaining = normalizeOrders(questions.filter((question) => !movedIds.has(question.id)));
    const nextActive = remaining[Math.min(firstIndex, remaining.length - 1)] ?? null;
    setQuestions(remaining);
    setActiveId(nextActive?.id ?? null);
    setSelectedIds(new Set(nextActive ? [nextActive.id] : []));
    setSelectionAnchorId(nextActive?.id ?? null);
    setBulkOpen(false);
    setNotice({ message: `${selected.length}개 문제를 '${targetSet.title}' 세트로 이동했어요.` });
  }

  async function deleteSelected() {
    const deletedItems = questions
      .map((question, index) => ({ question, index }))
      .filter(({ question }) => selectedIds.has(question.id));
    if (deletedItems.length === 0) {
      return;
    }

    setBusyAction("delete");
    setContextMenu(null);
    deletedItems.forEach(({ question }) => clearQuestionSave(question.id));
    const result = await deleteQuestionDrafts(
      quizSetId,
      deletedItems.map(({ question }) => question.id),
    );
    setBusyAction(null);

    if (!result.ok || !result.questions) {
      deletedItems.forEach(({ question }) => scheduleSave(question));
      setNotice({ message: result.ok ? "문제를 삭제하지 못했어요." : result.error, error: true });
      return;
    }

    const firstIndex = deletedItems[0].index;
    const deletedIds = new Set(deletedItems.map(({ question }) => question.id));
    const remaining = normalizeOrders(questions.filter((question) => !deletedIds.has(question.id)));
    const nextActive = remaining[Math.min(firstIndex, remaining.length - 1)] ?? null;
    setQuestions(remaining);
    setActiveId(nextActive?.id ?? null);
    setSelectedIds(new Set(nextActive ? [nextActive.id] : []));
    setSelectionAnchorId(nextActive?.id ?? null);
    setUndoItems(deletedItems);
    setNotice({ message: `${deletedItems.length}개 문제를 삭제했어요.` });
  }

  async function undoDelete() {
    if (!undoItems) {
      return;
    }

    setBusyAction("undo");
    const result = await restoreQuestionDrafts(undoItems.map(({ question }) => question));

    if (!result.ok || !result.questions) {
      setBusyAction(null);
      setNotice({ message: result.ok ? "문제를 복구하지 못했어요." : result.error, error: true });
      return;
    }

    const restored = [...questions];
    undoItems.forEach((item, index) => {
      restored.splice(Math.min(item.index, restored.length), 0, result.questions![index]);
    });
    const normalized = normalizeOrders(restored);
    setQuestions(normalized);
    setActiveId(result.questions[0].id);
    setSelectedIds(new Set(result.questions.map((question) => question.id)));
    setSelectionAnchorId(result.questions[0].id);
    setUndoItems(null);
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

    if (reviewQuestions.length > 0) {
      setReviewOpen(true);
      setNotice({ message: `수정이 필요한 문제가 ${reviewQuestions.length}개 있어요.`, error: true });
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
    setNotice({ message: "세트를 저장했어요." });
    router.push(`/dashboard/sets/${quizSetId}?saved=1`);
  }

  async function requestLeave() {
    setContextMenu(null);
    setBulkOpen(false);

    if (reviewQuestions.length > 0) {
      setLeaveConfirmOpen(true);
      return;
    }

    setBusyAction("leave");
    const saved = await savePendingQuestions(questions);
    if (!saved) {
      setBusyAction(null);
      return;
    }
    router.push("/dashboard");
  }

  async function discardInvalidAndLeave() {
    const invalidQuestions = reviewQuestions.map(({ question }) => question);
    const invalidIds = new Set(invalidQuestions.map((question) => question.id));
    const completeQuestions = questions.filter((question) => !invalidIds.has(question.id));
    const dirtyInvalidQuestions = invalidQuestions.filter((question) =>
      dirtyIds.current.has(question.id),
    );

    setBusyAction("leave");
    invalidQuestions.forEach((question) => clearQuestionSave(question.id, false));

    if (!(await savePendingQuestions(completeQuestions))) {
      dirtyInvalidQuestions.forEach(scheduleSave);
      setBusyAction(null);
      return;
    }

    invalidQuestions.forEach((question) => clearQuestionSave(question.id));
    const result = await deleteQuestionDrafts(
      quizSetId,
      invalidQuestions.map((question) => question.id),
    );

    if (!result.ok) {
      dirtyInvalidQuestions.forEach(scheduleSave);
      setBusyAction(null);
      setNotice({ message: result.error, error: true });
      return;
    }

    setLeaveConfirmOpen(false);
    router.push("/dashboard");
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
        <button
          aria-label="대시보드로 돌아가기"
          className={styles.backLink}
          disabled={busyAction === "leave"}
          onClick={() => void requestLeave()}
          type="button"
        >
          {busyAction === "leave" ? <LoaderCircle className={styles.spin} /> : <ArrowLeft aria-hidden="true" />}
        </button>
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
                const selected = selectedIds.has(question.id);
                return (
                  <li
                    className={`${question.id === activeId ? styles.activeQuestion : ""} ${selected ? styles.selectedQuestion : ""}`}
                    draggable
                    key={question.id}
                    onContextMenu={(event) => openQuestionMenu(question.id, event)}
                    onDragEnd={() => setDraggedId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDragStart={(event: DragEvent<HTMLLIElement>) => {
                      event.dataTransfer.effectAllowed = "move";
                      setDraggedId(question.id);
                    }}
                    onDrop={() => handleDrop(index)}
                  >
                    <button aria-pressed={selected} className={styles.questionSelect} onClick={(event) => selectQuestion(question.id, event)} type="button">
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
          <div className={styles.footerActions}>
            <div className={styles.bulkAction}>
              <button
                aria-expanded={bulkOpen}
                className={styles.bulkToggle}
                disabled={selectedIds.size === 0}
                onClick={() => {
                  setBulkOpen((current) => !current);
                  setContextMenu(null);
                }}
                type="button"
              >
                <SlidersHorizontal /> 일괄 작업 ({selectedIds.size})
              </button>
              {bulkOpen ? (
                <div className={styles.bulkPanel}>
                  <div className={styles.bulkPanelHeading}>
                    <div>
                      <strong>{selectedIds.size}개 문제 일괄 작업</strong>
                      <span>선택한 문제에만 적용돼요.</span>
                    </div>
                    <button aria-label="일괄 작업 닫기" onClick={() => setBulkOpen(false)} type="button">
                      <X />
                    </button>
                  </div>

                  <div className={styles.bulkField}>
                    <span>문제 유형 변경</span>
                    <div className={styles.bulkControlRow}>
                      <select
                        aria-label="변경할 문제 유형"
                        onChange={(event) => setBulkType(event.target.value as QuestionType)}
                        value={bulkType}
                      >
                        <option value="multiple-choice">객관식</option>
                        <option value="true-false">OX</option>
                        <option value="short-answer">단답형</option>
                      </select>
                      <button
                        disabled={busyAction !== null}
                        onClick={() => void changeSelectedType()}
                        type="button"
                      >
                        {busyAction === "bulk-type" ? <LoaderCircle className={styles.spin} /> : <Check />}
                        적용
                      </button>
                    </div>
                    <small>유형이 달라지면 기존 답안은 새 유형에 맞게 초기화돼요.</small>
                  </div>

                  <div className={styles.bulkField}>
                    <span>다른 세트로 이동</span>
                    {availableSets.length > 0 ? (
                      <div className={styles.bulkControlRow}>
                        <select
                          aria-label="이동할 문제 세트"
                          onChange={(event) => setTargetSetId(event.target.value)}
                          value={targetSetId}
                        >
                          {availableSets.map((set) => (
                            <option key={set.id} value={set.id}>{set.title}</option>
                          ))}
                        </select>
                        <button
                          disabled={busyAction !== null || !targetSetId}
                          onClick={() => void moveSelectedQuestions()}
                          type="button"
                        >
                          {busyAction === "bulk-move" ? <LoaderCircle className={styles.spin} /> : <MoveRight />}
                          이동
                        </button>
                      </div>
                    ) : (
                      <p className={styles.bulkEmpty}>이동할 다른 세트가 없어요.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <button disabled={busyAction === "duplicate"} onClick={() => void duplicateSelected()} type="button"><Copy /> 문제 복제 ({selectedIds.size})</button>
            <button className={styles.deleteButton} disabled={busyAction === "delete"} onClick={() => void deleteSelected()} type="button"><Trash2 /> 삭제 ({selectedIds.size})</button>
          </div>
          <span>{selectedIds.size > 1 ? `${selectedIds.size}개 선택` : `문제 ${questions.findIndex((question) => question.id === activeQuestion.id) + 1} / ${questions.length}`}</span>
        </div>
      ) : null}

      {contextMenu && typeof document !== "undefined"
        ? createPortal(
            <div
              aria-label="선택한 문제 메뉴"
              className={styles.contextMenu}
              ref={contextMenuRef}
              role="menu"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button disabled={busyAction === "duplicate"} onClick={() => void duplicateSelected()} role="menuitem" type="button">
                <Copy /> 문제 복제 ({selectedIds.size})
              </button>
              <button className={styles.contextDelete} disabled={busyAction === "delete"} onClick={() => void deleteSelected()} role="menuitem" type="button">
                <Trash2 /> 삭제 ({selectedIds.size})
              </button>
            </div>,
            document.body,
          )
        : null}

      {reviewOpen && typeof document !== "undefined"
        ? createPortal(
            <div className={styles.reviewBackdrop} onMouseDown={() => setReviewOpen(false)}>
              <section
                aria-labelledby="review-panel-title"
                aria-modal="true"
                className={styles.reviewPanel}
                onMouseDown={(event) => event.stopPropagation()}
                role="dialog"
              >
                <header>
                  <span className={styles.reviewIcon}><ClipboardCheck /></span>
                  <div>
                    <h2 id="review-panel-title">완료 전 검토</h2>
                    <p>수정이 필요한 문제 {reviewQuestions.length}개를 찾았어요.</p>
                  </div>
                  <button aria-label="검토 패널 닫기" onClick={() => setReviewOpen(false)} type="button"><X /></button>
                </header>

                <div className={styles.reviewList}>
                  {reviewQuestions.map(({ index, issues, question }) => (
                    <button
                      className={styles.reviewItem}
                      key={question.id}
                      onClick={() => {
                        setReviewOpen(false);
                        setShowValidation(true);
                        selectQuestion(question.id);
                        setMobileView("edit");
                      }}
                      type="button"
                    >
                      <span className={styles.reviewNumber}>{index + 1}</span>
                      <span className={styles.reviewCopy}>
                        <strong>{question.prompt.trim() || "제목이 없는 문제"}</strong>
                        {issues.map((issue) => <small key={issue.code}>{issue.message}</small>)}
                      </span>
                      <ChevronRight />
                    </button>
                  ))}
                </div>

                <footer>
                  <button onClick={() => setReviewOpen(false)} type="button">계속 편집</button>
                  <button
                    className={styles.reviewPrimary}
                    onClick={() => {
                      const first = reviewQuestions[0];
                      if (!first) return;
                      setReviewOpen(false);
                      setShowValidation(true);
                      selectQuestion(first.question.id);
                      setMobileView("edit");
                    }}
                    type="button"
                  >
                    첫 오류 수정 <ChevronRight />
                  </button>
                </footer>
              </section>
            </div>,
            document.body,
          )
        : null}

      {leaveConfirmOpen && typeof document !== "undefined"
        ? createPortal(
            <div className={styles.reviewBackdrop} onMouseDown={() => setLeaveConfirmOpen(false)}>
              <section
                aria-labelledby="leave-dialog-title"
                aria-modal="true"
                className={styles.leaveDialog}
                onMouseDown={(event) => event.stopPropagation()}
                role="alertdialog"
              >
                <header>
                  <span className={styles.leaveIcon}><TriangleAlert /></span>
                  <div>
                    <h2 id="leave-dialog-title">수정이 필요한 문제가 있어요</h2>
                    <p>미완성 문제 {reviewQuestions.length}개가 남아 있어요.</p>
                  </div>
                  <button aria-label="나가기 경고 닫기" onClick={() => setLeaveConfirmOpen(false)} type="button"><X /></button>
                </header>
                <div className={styles.leaveDialogBody}>
                  <strong>지금 나가면 수정이 필요한 문제는 모두 삭제돼요.</strong>
                  <p>삭제한 문제는 복구할 수 없으며, 완성된 문제와 변경사항만 저장됩니다.</p>
                </div>
                <footer>
                  <button disabled={busyAction === "leave"} onClick={() => setLeaveConfirmOpen(false)} type="button">계속 편집</button>
                  <button
                    className={styles.leaveDanger}
                    disabled={busyAction === "leave"}
                    onClick={() => void discardInvalidAndLeave()}
                    type="button"
                  >
                    {busyAction === "leave" ? <LoaderCircle className={styles.spin} /> : <Trash2 />}
                    삭제하고 나가기
                  </button>
                </footer>
              </section>
            </div>,
            document.body,
          )
        : null}

      {notice || undoItems ? (
        <div className={`${styles.toast} ${notice?.error ? styles.toastError : ""}`} role="status">
          {notice?.error ? <TriangleAlert /> : <CheckCircle2 />}
          <span>{notice?.message ?? "문제를 삭제했어요."}</span>
          {undoItems ? (
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
        return { ...current, type, choices: Array.from({ length: Math.max(4, previous.length) }, (_, index) => previous[index] ?? ""), answerIndices: [0] };
      }
      if (type === "true-false") return { ...current, type, choices: ["O", "X"], answerIndices: [0] };
      return { ...current, type, choices: [], answerTexts: [""], shortAnswerMatch: "exact" };
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
      const answerIndices = current.answerIndices
        .filter((answerIndex) => answerIndex !== index)
        .map((answerIndex) => (answerIndex > index ? answerIndex - 1 : answerIndex));
      return { ...current, choices, answerIndices };
    });
  }

  function moveChoice(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= question.choices.length) return;
    onChange((current) => {
      const choices = [...current.choices];
      [choices[index], choices[target]] = [choices[target], choices[index]];
      const answerIndices = current.answerIndices.map((answerIndex) => {
        if (answerIndex === index) return target;
        if (answerIndex === target) return index;
        return answerIndex;
      });
      return { ...current, choices, answerIndices };
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

  function toggleCorrectChoice(index: number) {
    onChange((current) => ({
      ...current,
      answerIndices: current.answerIndices.includes(index)
        ? current.answerIndices.filter((answerIndex) => answerIndex !== index)
        : [...current.answerIndices, index].sort((a, b) => a - b),
    }));
  }

  function updateShortAnswer(index: number, value: string) {
    onChange((current) => ({
      ...current,
      answerTexts: current.answerTexts.map((answer, answerIndex) =>
        answerIndex === index ? value.slice(0, 120) : answer,
      ),
    }));
  }

  function addShortAnswer() {
    if (question.answerTexts.length >= 5) return;
    onChange((current) => ({ ...current, answerTexts: [...current.answerTexts, ""] }));
  }

  function removeShortAnswer(index: number) {
    if (question.answerTexts.length <= 1) return;
    onChange((current) => ({
      ...current,
      answerTexts: current.answerTexts.filter((_, answerIndex) => answerIndex !== index),
    }));
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
          <legend><span>보기</span><small>정답은 여러 개 선택할 수 있어요.</small></legend>
          {question.choices.map((choice, index) => (
            <div className={`${styles.choiceRow} ${question.answerIndices.includes(index) ? styles.correctChoice : ""}`} key={`${question.id}-choice-${index}`}>
              <button aria-label={`${index + 1}번 보기를 정답으로 전환`} aria-pressed={question.answerIndices.includes(index)} className={styles.answerToggle} onClick={() => toggleCorrectChoice(index)} title="정답 전환" type="button">
                {question.answerIndices.includes(index) ? <CheckCircle2 /> : <Circle />}<span>{String.fromCharCode(65 + index)}</span>
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
            <button aria-pressed={question.answerIndices[0] === index} key={label} onClick={() => onChange((current) => ({ ...current, answerIndices: [index] }))} type="button">
              {question.answerIndices[0] === index ? <CheckCircle2 /> : <Circle />}<strong>{label}</strong>
            </button>
          ))}
        </fieldset>
      ) : null}

      {question.type === "short-answer" ? (
        <fieldset className={styles.shortAnswerEditor}>
          <legend>정답 판정</legend>
          <div className={styles.matchSelector} role="group" aria-label="단답형 정답 판정 방식">
            <button aria-pressed={question.shortAnswerMatch === "exact"} onClick={() => onChange((current) => ({ ...current, shortAnswerMatch: "exact" }))} type="button">완전히 일치</button>
            <button aria-pressed={question.shortAnswerMatch === "contains"} onClick={() => onChange((current) => ({ ...current, shortAnswerMatch: "contains" }))} type="button">답에 포함</button>
          </div>
          <p>{question.shortAnswerMatch === "exact" ? "학생 답이 작성한 정답과 정확히 같아야 해요." : "학생 답에 작성한 정답이 들어 있으면 맞게 처리해요."}</p>
          <div className={styles.shortAnswerList}>
            {question.answerTexts.map((answer, index) => (
              <div className={styles.shortAnswerRow} key={`${question.id}-answer-${index}`}>
                <span>{index + 1}</span>
                <input aria-label={`${index + 1}번 허용 정답`} maxLength={120} onChange={(event) => updateShortAnswer(index, event.target.value)} placeholder="허용할 정답을 입력하세요." value={answer} />
                <small>{answer.length}/120</small>
                <button aria-label={`${index + 1}번 정답 삭제`} disabled={question.answerTexts.length <= 1} onClick={() => removeShortAnswer(index)} title="정답 삭제" type="button"><X /></button>
              </div>
            ))}
          </div>
          <button className={styles.addChoice} disabled={question.answerTexts.length >= 5} onClick={addShortAnswer} type="button"><Plus /> 정답 추가 {question.answerTexts.length}/5</button>
        </fieldset>
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
            <div className={question.answerIndices.includes(index) ? styles.previewCorrect : undefined} key={index}>
              <span>{question.type === "true-false" ? choice : String.fromCharCode(65 + index)}</span>
              <strong>{choice || `${index + 1}번 보기`}</strong>
              {question.answerIndices.includes(index) ? <Check /> : <ChevronRight />}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.previewShortAnswer}>
          <span>답을 입력하세요.</span>
          <strong>{question.answerTexts.some((answer) => answer.trim()) ? `정답 ${question.answerTexts.filter((answer) => answer.trim()).join(" · ")} · ${question.shortAnswerMatch === "exact" ? "일치" : "포함"}` : "정답을 설정해 주세요."}</strong>
        </div>
      )}
    </div>
  );
}

function normalizeOrders(questions: EditorQuestion[]) {
  return questions.map((question, order) => ({ ...question, order }));
}
