"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2, TriangleAlert, X } from "lucide-react";
import { deleteQuizSet } from "./actions";

export function DeleteQuizSetDialog({
  compact = false,
  onDeleted,
  quizSetId,
  title,
}: {
  compact?: boolean;
  onDeleted?: () => void;
  quizSetId: string;
  title: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [deleting, open]);

  function closeDialog() {
    if (deleting) return;
    setOpen(false);
    setConfirmation("");
    setError(null);
  }

  async function confirmDelete() {
    if (confirmation !== title) return;
    setDeleting(true);
    setError(null);
    const result = await deleteQuizSet(quizSetId, confirmation);

    if (!result.ok) {
      setDeleting(false);
      setError(result.error);
      return;
    }

    setOpen(false);
    onDeleted?.();
    if (!onDeleted) router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <button
        className={compact ? "set-delete-menu-trigger" : "set-delete-trigger"}
        onClick={(event) => {
          event.currentTarget.closest("details")?.removeAttribute("open");
          setOpen(true);
        }}
        type="button"
      >
        <Trash2 aria-hidden="true" />
        세트 삭제
      </button>

      {open ? createPortal(
        <div className="confirm-dialog-backdrop" onMouseDown={closeDialog} role="presentation">
          <section
            aria-describedby="delete-set-description"
            aria-labelledby="delete-set-title"
            aria-modal="true"
            className="confirm-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header>
              <span aria-hidden="true"><TriangleAlert /></span>
              <div>
                <h2 id="delete-set-title">문제 세트를 삭제할까요?</h2>
                <p id="delete-set-description">삭제한 세트와 문제는 복구할 수 없습니다.</p>
              </div>
              <button aria-label="닫기" disabled={deleting} onClick={closeDialog} type="button"><X /></button>
            </header>

            <div className="confirm-dialog-body">
              <p>계속하려면 아래에 세트 이름을 그대로 입력하세요.</p>
              <strong>{title}</strong>
              <label>
                <span>세트 이름</span>
                <input
                  autoComplete="off"
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder={title}
                  ref={inputRef}
                  value={confirmation}
                />
              </label>
              {error ? <p className="confirm-dialog-error" role="alert">{error}</p> : null}
            </div>

            <footer>
              <button disabled={deleting} onClick={closeDialog} type="button">취소</button>
              <button className="confirm-delete-button" disabled={confirmation !== title || deleting} onClick={() => void confirmDelete()} type="button">
                {deleting ? <LoaderCircle className="dialog-spinner" /> : <Trash2 />}
                영구 삭제
              </button>
            </footer>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
