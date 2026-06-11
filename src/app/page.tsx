import Link from "next/link";
import { ArrowRight, MessageSquareText, Search, Upload } from "lucide-react";
import { CompactDeckRow } from "@/components/deck/compact-deck-row";
import type { Deck } from "@/lib/types";
import {
  getHomeDeckCatalog,
  getPublicDecks,
} from "@/server/repositories/public-decks";

export const dynamic = "force-dynamic";

const deckTabs = [
  { label: "현재 덱", href: "/decks" },
  { label: "대회 덱", href: "/decks?source=tournament" },
  { label: "커뮤니티 덱", href: "/decks?source=community" },
  { label: "많이 복사", href: "/decks?sort=copies" },
  { label: "최신 등록", href: "/decks?sort=latest" },
];

export default async function Home() {
  const [catalog, feed] = await Promise.all([
    getHomeDeckCatalog(),
    getPublicDecks({ sort: "trending", page: 1, pageSize: 12 }),
  ]);
  const fallbackDecks = mergeDecks([
    ...catalog.featured,
    ...catalog.popular,
    ...catalog.beginner,
    ...catalog.latestTrusted,
  ]);
  const decks = feed.decks.length > 0 ? feed.decks : fallbackDecks.slice(0, 12);
  const currentPatch = feed.currentPatch || catalog.currentPatch;
  const isDemo = feed.source === "demo" || catalog.source === "demo";
  const unavailable = feed.unavailable && catalog.unavailable;

  return (
    <div className="page-shell py-6 sm:py-9">
      <section className="flex flex-col justify-between gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-extrabold text-[var(--brand-dark)]">
            정규전 · 패치 {currentPatch}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.055em] sm:text-4xl">
            지금 쓸 덱을 고르고 바로 복사하세요
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            누구의 덱인지, 어디서 나온 덱인지, 최근 얼마나 주목받는지 먼저 보여드립니다.
          </p>
        </div>
        <form
          action="/decks"
          role="search"
          className="flex w-full max-w-md rounded-xl border border-[var(--line)] bg-white p-1.5"
        >
          <label className="flex min-w-0 flex-1 items-center gap-2 px-2.5">
            <Search
              size={17}
              className="text-[var(--muted)]"
              aria-hidden="true"
            />
            <span className="sr-only">덱 검색</span>
            <input
              name="q"
              placeholder="직업, 선수, 덱 이름 검색"
              className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <button className="rounded-lg bg-[var(--ink)] px-4 text-sm font-extrabold text-white">
            검색
          </button>
        </form>
      </section>

      <nav
        aria-label="덱 바로가기"
        className="flex gap-2 overflow-x-auto py-4 hide-scrollbar"
      >
        {deckTabs.map((tab, index) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-extrabold ${
              index === 0
                ? "bg-[var(--ink)] text-white"
                : "border border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {isDemo && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          Supabase 미연결 환경이라 UX 검증용 데모 덱을 표시하고 있습니다.
        </p>
      )}

      <section className="surface overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <div>
            <h2 className="text-sm font-black">현재 패치 주목 덱</h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              최근 반응, 출처 신뢰도, 최신성을 함께 반영한 순서입니다.
            </p>
          </div>
          <Link
            href="/decks?sort=trending"
            className="inline-flex items-center gap-1 text-xs font-extrabold text-[var(--brand)]"
          >
            전체 보기
            <ArrowRight size={14} />
          </Link>
        </div>

        {decks.length > 0 ? (
          decks.map((deck) => <CompactDeckRow key={deck.slug} deck={deck} />)
        ) : (
          <div className="px-6 py-14 text-center">
            <h2 className="text-lg font-extrabold">
              {unavailable
                ? "덱을 불러오지 못했습니다"
                : "아직 공개된 덱이 없습니다"}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {unavailable
                ? "잠시 후 다시 시도해주세요."
                : "첫 커뮤니티 덱을 등록해보세요."}
            </p>
          </div>
        )}
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href="/submit"
          className="surface flex items-center justify-between rounded-xl px-4 py-4 hover:border-[var(--brand)]"
        >
          <span className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-orange-50 text-[var(--brand)]">
              <Upload size={17} />
            </span>
            <span>
              <strong className="block text-sm">내 덱 올리기</strong>
              <small className="text-[var(--muted)]">
                덱 코드를 검사하고 커뮤니티에 공개
              </small>
            </span>
          </span>
          <ArrowRight size={16} />
        </Link>
        <div className="surface flex items-center justify-between rounded-xl px-4 py-4 opacity-75">
          <span className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-[#f2ece2] text-[var(--muted)]">
              <MessageSquareText size={17} />
            </span>
            <span>
              <strong className="block text-sm">자유게시판</strong>
              <small className="text-[var(--muted)]">
                패치, 대회, 덱 이야기를 나누는 공간 준비 중
              </small>
            </span>
          </span>
          <span className="text-xs font-extrabold text-[var(--muted)]">
            준비 중
          </span>
        </div>
      </section>
    </div>
  );
}

function mergeDecks(decks: Deck[]) {
  const unique = new Map<string, Deck>();
  for (const deck of decks) {
    if (!unique.has(deck.slug)) unique.set(deck.slug, deck);
  }

  return [...unique.values()].sort(
    (left, right) =>
      (right.trendScore ?? 0) - (left.trendScore ?? 0) ||
      right.copies - left.copies,
  );
}
