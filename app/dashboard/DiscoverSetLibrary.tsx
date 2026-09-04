"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  BookOpenCheck,
  Eye,
  Gamepad2,
  Globe2,
  Search,
  X,
} from "lucide-react";

export type PublicDashboardSet = {
  id: string;
  title: string;
  description: string | null;
  ownerName: string;
  updatedAt: string;
  updatedLabel: string;
  questionCount: number;
  playCount: number;
};

type SortOption = "recent" | "title" | "questions";

export function DiscoverSetLibrary({ sets }: { sets: PublicDashboardSet[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("recent");

  const visibleSets = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
    const filtered = normalizedQuery
      ? sets.filter((set) =>
          `${set.title} ${set.description ?? ""} ${set.ownerName}`
            .toLocaleLowerCase("ko-KR")
            .includes(normalizedQuery),
        )
      : sets;

    return [...filtered].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "ko-KR");
      if (sort === "questions") return b.questionCount - a.questionCount;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [query, sets, sort]);

  return (
    <div className="set-library discover-library">
      <div className="library-summary" aria-label="공개 세트 요약">
        <span><strong>{sets.length}</strong>개 공개 세트</span>
        <span><Globe2 aria-hidden="true" /> 자유롭게 확인</span>
        <span><Gamepad2 aria-hidden="true" /> 라이브 사용 가능</span>
      </div>

      <div className="library-toolbar">
        <label className="library-search">
          <Search aria-hidden="true" />
          <span className="sr-only">공개 문제 세트 검색</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="세트 이름, 설명 또는 선생님 검색"
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
            <option value="recent">최근 공개순</option>
            <option value="title">이름순</option>
            <option value="questions">문제 많은 순</option>
          </select>
        </label>
      </div>

      {sets.length === 0 ? (
        <div className="library-empty discover-empty">
          <span className="library-empty-icon" aria-hidden="true"><Globe2 /></span>
          <h2>아직 공개된 세트가 없어요.</h2>
          <p>내 문제 세트의 설정에서 공개하면 이곳에 표시됩니다.</p>
        </div>
      ) : visibleSets.length === 0 ? (
        <div className="library-no-results">
          <Search aria-hidden="true" />
          <strong>검색 결과가 없어요.</strong>
          <p>다른 이름이나 선생님 이름으로 찾아보세요.</p>
          <button onClick={() => setQuery("")} type="button">검색 지우기</button>
        </div>
      ) : (
        <ul className="set-list" aria-label="공개 문제 세트 목록">
          {visibleSets.map((set, index) => (
            <li
              className={`set-list-item public-set-item set-accent-${(index % 4) + 1}`}
              key={set.id}
              style={{ "--set-index": index } as CSSProperties}
            >
              <Link className="set-list-main" href={`/dashboard/discover/${set.id}`}>
                <span className="set-list-icon" aria-hidden="true"><BookOpenCheck /></span>
                <span className="set-list-copy">
                  <span className="public-set-byline"><Globe2 aria-hidden="true" /> {set.ownerName}</span>
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
                <Link className="set-action" href={`/dashboard/discover/${set.id}`}>
                  <Eye aria-hidden="true" /><span>문제 확인</span>
                </Link>
                <Link className="set-action set-action-play" href={`/dashboard/play?set=${set.id}`}>
                  <Gamepad2 aria-hidden="true" /><span>라이브</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
