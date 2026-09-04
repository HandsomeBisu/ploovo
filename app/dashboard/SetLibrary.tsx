"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  BookOpenCheck,
  ClipboardList,
  FilePenLine,
  Gamepad2,
  MoreHorizontal,
  Plus,
  Search,
  X,
} from "lucide-react";
import { DeleteQuizSetDialog } from "./DeleteQuizSetDialog";

type DashboardSet = {
  id: string;
  title: string;
  description: string | null;
  updatedAt: string;
  updatedLabel: string;
  questionCount: number;
  playCount: number;
};

type SortOption = "recent" | "title" | "questions";

export function SetLibrary({ sets }: { sets: DashboardSet[] }) {
  const [librarySets, setLibrarySets] = useState(sets);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("recent");

  const visibleSets = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
    const filtered = normalizedQuery
      ? librarySets.filter((set) =>
          `${set.title} ${set.description ?? ""}`.toLocaleLowerCase("ko-KR").includes(normalizedQuery),
        )
      : librarySets;

    return [...filtered].sort((a, b) => {
      if (sort === "title") {
        return a.title.localeCompare(b.title, "ko-KR");
      }

      if (sort === "questions") {
        return b.questionCount - a.questionCount;
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [librarySets, query, sort]);

  const totalQuestions = librarySets.reduce((sum, set) => sum + set.questionCount, 0);
  const totalPlays = librarySets.reduce((sum, set) => sum + set.playCount, 0);

  return (
    <div className="set-library">
      <div className="library-summary" aria-label="문제 세트 요약">
        <span>
          <strong>{librarySets.length}</strong>개 세트
        </span>
        <span>
          <strong>{totalQuestions}</strong>개 문제
        </span>
        <span>
          <strong>{totalPlays}</strong>번 진행
        </span>
      </div>

      {librarySets.length === 0 ? (
        <EmptyLibrary />
      ) : (
        <>
          <div className="library-toolbar">
            <label className="library-search">
              <Search aria-hidden="true" />
              <span className="sr-only">문제 세트 검색</span>
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="세트 이름이나 설명 검색"
                type="search"
                value={query}
              />
              {query ? (
                <button aria-label="검색어 지우기" onClick={() => setQuery("")} type="button">
                  <X aria-hidden="true" />
                </button>
              ) : null}
            </label>

            <label className="library-sort">
              <ArrowUpDown aria-hidden="true" />
              <span className="sr-only">정렬 방법</span>
              <select onChange={(event) => setSort(event.target.value as SortOption)} value={sort}>
                <option value="recent">최근 수정순</option>
                <option value="title">이름순</option>
                <option value="questions">문제 많은 순</option>
              </select>
            </label>
          </div>

          {visibleSets.length === 0 ? (
            <div className="library-no-results">
              <Search aria-hidden="true" />
              <strong>검색 결과가 없어요.</strong>
              <p>다른 이름이나 설명으로 찾아보세요.</p>
              <button onClick={() => setQuery("")} type="button">
                검색 지우기
              </button>
            </div>
          ) : (
            <ul className="set-list" aria-label="내 문제 세트 목록">
              {visibleSets.map((set, index) => (
                <li
                  className={`set-list-item set-accent-${(index % 4) + 1}`}
                  key={set.id}
                  style={{ "--set-index": index } as CSSProperties}
                >
                  <Link className="set-list-main" href={`/dashboard/sets/${set.id}`}>
                    <span className="set-list-icon" aria-hidden="true">
                      <BookOpenCheck />
                    </span>
                    <span className="set-list-copy">
                      <strong>{set.title}</strong>
                      <small>{set.description || "설명이 아직 없어요."}</small>
                    </span>
                  </Link>

                  <div className="set-list-meta" aria-label="세트 정보">
                    <span>{set.questionCount}문제</span>
                    <span>{set.playCount}번 진행</span>
                    <span>{set.updatedLabel} 수정</span>
                  </div>

                  <div className="set-list-actions">
                    <Link className="set-action set-action-play" href={`/dashboard/play?set=${set.id}`}>
                      <Gamepad2 aria-hidden="true" />
                      <span>라이브</span>
                    </Link>
                    <Link className="set-action" href={`/dashboard/homework?set=${set.id}`}>
                      <ClipboardList aria-hidden="true" />
                      <span>과제</span>
                    </Link>
                    <details className="set-more">
                      <summary aria-label={`${set.title} 더보기`} title="더보기">
                        <MoreHorizontal aria-hidden="true" />
                      </summary>
                      <div className="set-more-menu">
                        <Link href={`/dashboard/sets/${set.id}/edit`}>
                          <FilePenLine aria-hidden="true" />
                          문제 편집
                        </Link>
                        <Link href={`/dashboard/sets/${set.id}`}>
                          <BookOpenCheck aria-hidden="true" />
                          세트 정보
                        </Link>
                        <DeleteQuizSetDialog
                          compact
                          onDeleted={() => setLibrarySets((current) => current.filter((item) => item.id !== set.id))}
                          quizSetId={set.id}
                          title={set.title}
                        />
                      </div>
                    </details>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function EmptyLibrary() {
  return (
    <div className="library-empty">
      <span className="library-empty-icon" aria-hidden="true">
        <BookOpenCheck />
      </span>
      <h2>첫 문제 세트를 만들어볼까요?</h2>
      <p>문제를 준비하면 라이브 게임과 과제를 바로 시작할 수 있어요.</p>
      <div className="library-empty-actions">
        <Link className="button button-primary" href="/dashboard/sets/new">
          <Plus aria-hidden="true" />
          세트 만들기
        </Link>
        <Link className="button button-secondary" href="/dashboard/discover">
          세트 둘러보기
        </Link>
      </div>
    </div>
  );
}
