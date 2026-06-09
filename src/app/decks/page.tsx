import type { Metadata } from "next";
import Link from "next/link";
import { Filter, RotateCcw, Search, X } from "lucide-react";
import { redirect } from "next/navigation";
import { ProductEventTracker } from "@/components/analytics/product-event-tracker";
import { DeckCard } from "@/components/deck/deck-card";
import { DeckFilters } from "@/components/deck/deck-filters";
import type { DeckCatalogSort } from "@/lib/deck-catalog";
import { CLASS_OPTIONS } from "@/lib/decks";
import type { DeckClass, EvidenceStatus } from "@/lib/types";
import { getPublicDecks } from "@/server/repositories/public-decks";

export const metadata: Metadata = {
  title: "덱 찾기",
  description: "직업, 덱 유형, 목적과 최신성으로 하스스톤 덱을 찾아보세요.",
};

type SearchParams = Promise<{
  q?: string;
  class?: string;
  tag?: string;
  evidence?: string;
  trust?: string;
  source?: string;
  patch?: string;
  sort?: string;
  page?: string;
}>;

const TAG_OPTIONS = ["초보 추천", "저가루", "빠른 등반", "쉬운 운영", "전설 유저"];
const EVIDENCE_OPTIONS: EvidenceStatus[] = [
  "운영진 확인",
  "출처 연결",
  "작성자 입력",
];
const SORT_OPTIONS: DeckCatalogSort[] = [
  "recommended",
  "copies",
  "latest",
  "popular",
  "trending",
];
const SOURCE_OPTIONS = [
  { value: "community", label: "커뮤니티 덱" },
  { value: "ranked", label: "등급전·랭커 덱" },
  { value: "creator", label: "콘텐츠 제작자 덱" },
  { value: "tournament", label: "대회 덱" },
  { value: "external_stats", label: "외부 통계 덱" },
] as const;

export default async function DecksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim().toLocaleLowerCase("ko") ?? "";
  const selectedClass = CLASS_OPTIONS.includes(params.class as DeckClass)
    ? (params.class as DeckClass)
    : "";
  const selectedTag = TAG_OPTIONS.includes(params.tag ?? "") ? params.tag ?? "" : "";
  const trustedOnly = params.trust === "verified";
  const selectedEvidence = !trustedOnly && EVIDENCE_OPTIONS.includes(
    params.evidence as EvidenceStatus,
  )
    ? (params.evidence as EvidenceStatus)
    : "";
  const selectedSource = SOURCE_OPTIONS.some(
    (option) => option.value === params.source,
  )
    ? params.source ?? ""
    : "";
  const includeOld = params.patch === "all";
  const sort = SORT_OPTIONS.includes(params.sort as DeckCatalogSort)
    ? (params.sort as DeckCatalogSort)
    : "recommended";
  const page = Math.max(1, Math.min(Number.parseInt(params.page ?? "1", 10) || 1, 100));
  const result = await getPublicDecks({
    query,
    className: selectedClass,
    tag: selectedTag,
    evidence: selectedEvidence || undefined,
    trustedOnly,
    source: selectedSource || undefined,
    includeOld,
    sort,
    page,
  });
  if (result.page !== page) {
    redirect(withParams(params, { page: undefined }));
  }
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  const activeFilters = [
    query ? { label: `검색: ${params.q}`, key: "q" } : null,
    selectedClass ? { label: selectedClass, key: "class" } : null,
    selectedTag ? { label: selectedTag, key: "tag" } : null,
    selectedEvidence ? { label: selectedEvidence, key: "evidence" } : null,
    trustedOnly ? { label: "신뢰 근거만", key: "trust" } : null,
    selectedSource
      ? {
          label: SOURCE_OPTIONS.find((option) => option.value === selectedSource)!
            .label,
          key: "source",
        }
      : null,
    includeOld ? { label: "이전 패치 포함", key: "patch" } : null,
  ].filter(
    (value): value is { label: string; key: string } => value !== null,
  );

  return (
    <div className="page-shell py-8 sm:py-12">
      <ProductEventTracker
        eventName="deck_list_viewed"
        metadata={{
          total: result.total,
          page: result.page,
          sort,
          source: result.source,
          queryPresent: Boolean(query),
          classFiltered: Boolean(selectedClass),
          tagFiltered: Boolean(selectedTag),
          trustedOnly,
          includeOld,
        }}
      />
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <span className="eyebrow">
            <Filter size={14} />
            Deck library
          </span>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-5xl">
            내게 맞는 덱 찾기
          </h1>
          <p className="section-copy mt-3">
            현재 패치 {result.currentPatch} 기준 · 공개 덱 {result.total}개
          </p>
        </div>
        {result.source === "demo" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
            Supabase 미연결 환경이라 UX 검증용 데모 덱을 표시합니다.
          </div>
        )}
        {result.unavailable && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-900">
            공개 덱 조회에 실패했습니다. 데모 데이터로 대체하지 않았습니다.
          </div>
        )}
      </div>

      <DeckFilters
        query={params.q ?? ""}
        selectedClass={selectedClass}
        selectedTag={selectedTag}
        selectedEvidence={selectedEvidence}
        selectedSource={selectedSource}
        trustedOnly={trustedOnly}
        includeOld={includeOld}
        sort={sort}
        classOptions={CLASS_OPTIONS}
        tagOptions={TAG_OPTIONS}
        evidenceOptions={EVIDENCE_OPTIONS}
        sourceOptions={SOURCE_OPTIONS}
      />

      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-extrabold">{result.total}개의 덱</span>
            {activeFilters.map((filter) => (
              <Link
                key={filter.key}
                href={withParams(params, {
                  [filter.key]: undefined,
                  page: undefined,
                })}
                aria-label={`${filter.label} 필터 해제`}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-bold text-[var(--muted)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
              >
                {filter.label}
                <X size={11} />
              </Link>
            ))}
            {activeFilters.length > 0 && (
              <Link
                href="/decks"
                className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand)]"
              >
                <RotateCcw size={12} />
                모두 초기화
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            <PatchToggle params={params} includeOld={includeOld} />
            <SortSelect params={params} value={sort} />
          </div>
        </div>
      </div>

      {result.decks.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.decks.map((deck) => (
              <DeckCard key={deck.slug} deck={deck} />
            ))}
          </div>
          {pageCount > 1 && (
            <nav
              aria-label="덱 목록 페이지"
              className="mt-8 flex items-center justify-center gap-3"
            >
              <PageLink
                href={withParams(params, {
                  page: result.page > 1 ? String(result.page - 1) : undefined,
                })}
                disabled={result.page <= 1}
              >
                이전
              </PageLink>
              <span className="text-sm font-bold text-[var(--muted)]">
                {result.page} / {pageCount}
              </span>
              <PageLink
                href={withParams(params, {
                  page:
                    result.page < pageCount
                      ? String(result.page + 1)
                      : String(result.page),
                })}
                disabled={result.page >= pageCount}
              >
                다음
              </PageLink>
            </nav>
          )}
        </>
      ) : (
        <div className="surface grid min-h-72 place-items-center rounded-[1.5rem] px-6 text-center">
          <div>
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#f2ece2] text-[var(--muted)]">
              <Search size={20} />
            </span>
            <h2 className="mt-4 text-xl font-extrabold">
              {result.unavailable
                ? "덱 목록을 잠시 불러오지 못했어요"
                : "조건에 맞는 덱이 없어요"}
            </h2>
            <p className="section-copy mt-2">
              {result.unavailable
                ? "잠시 후 다시 시도해주세요."
                : "이전 패치를 포함하거나 직업·목적 필터를 초기화해보세요."}
            </p>
            {!result.unavailable && <div className="mt-5 flex justify-center gap-2">
              {!includeOld && (
                <Link
                  href={withParams(params, { patch: "all" })}
                  className="rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-bold"
                >
                  이전 패치 포함
                </Link>
              )}
              <Link
                href="/decks"
                className="rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white"
              >
                모두 초기화
              </Link>
            </div>}
          </div>
        </div>
      )}
    </div>
  );
}

function PatchToggle({
  params,
  includeOld,
}: {
  params: Awaited<SearchParams>;
  includeOld: boolean;
}) {
  return (
    <Link
      href={withParams(params, {
        patch: includeOld ? undefined : "all",
        page: undefined,
      })}
      className={`hidden rounded-lg border px-3 py-2 text-xs font-bold transition sm:block ${
        includeOld
          ? "border-[var(--brand)] bg-orange-50 text-[var(--brand-dark)]"
          : "border-[var(--line)] bg-white text-[var(--muted)]"
      }`}
    >
      이전 패치 포함
    </Link>
  );
}

function SortSelect({
  params,
  value,
}: {
  params: Awaited<SearchParams>;
  value: string;
}) {
  return (
    <div className="flex rounded-lg border border-[var(--line)] bg-white p-1">
      {[
        ["recommended", "추천순"],
        ["trending", "주목순"],
        ["popular", "인기순"],
        ["copies", "복사순"],
        ["latest", "최신순"],
      ].map(([sort, label]) => (
        <Link
          key={sort}
          href={withParams(params, { sort, page: undefined })}
          className={`rounded-md px-2.5 py-1.5 text-xs font-bold ${
            value === sort
              ? "bg-[var(--ink)] text-white"
              : "text-[var(--muted)] hover:text-[var(--ink)]"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return disabled ? (
    <span
      aria-disabled="true"
      className="rounded-lg border border-[var(--line)] bg-[#f2ece2] px-4 py-2 text-sm font-bold text-[var(--muted)] opacity-60"
    >
      {children}
    </span>
  ) : (
    <Link
      href={href}
      className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
    >
      {children}
    </Link>
  );
}

function withParams(
  current: Awaited<SearchParams>,
  changes: Record<string, string | undefined>,
) {
  const next = new URLSearchParams();
  Object.entries(current).forEach(([key, value]) => {
    if (value) next.set(key, value);
  });
  Object.entries(changes).forEach(([key, value]) => {
    if (value) next.set(key, value);
    else next.delete(key);
  });
  const query = next.toString();
  return query ? `/decks?${query}` : "/decks";
}
