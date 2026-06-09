import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileJson,
  Radar,
} from "lucide-react";
import { redirect } from "next/navigation";
import { DeckCandidateReviewCard } from "@/components/admin/deck-candidate-review-card";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getDeckCandidateQueue,
  REVIEW_QUEUE_STATUSES,
  type ReviewQueueStatus,
} from "@/server/repositories/deck-candidates";

export const metadata: Metadata = {
  title: "최근 덱 검토",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; page?: string }>;

const STATUS_TABS: Array<{ value: ReviewQueueStatus; label: string }> = [
  { value: "ready_for_review", label: "검토 가능" },
  { value: "needs_validation", label: "검증 필요" },
  { value: "needs_code", label: "코드 필요" },
  { value: "reviewing", label: "검토 중" },
  { value: "discovered", label: "신규 발견" },
  { value: "approved", label: "초안 생성 대기" },
];

export default async function DeckCandidatesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const destination = safeNextPath("/admin/deck-candidates");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(destination)}`);

  const client = await createServerSupabaseClient();
  const { data: profile } = client
    ? await client.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  if (profile?.role !== "moderator" && profile?.role !== "admin") {
    redirect("/");
  }

  const params = await searchParams;
  const status = REVIEW_QUEUE_STATUSES.includes(params.status as ReviewQueueStatus)
    ? (params.status as ReviewQueueStatus)
    : "ready_for_review";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const queue = await getDeckCandidateQueue({ status, page });
  const pageCount = Math.max(1, Math.ceil(queue.total / queue.pageSize));

  return (
    <div className="page-shell py-8 sm:py-12">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <span className="eyebrow">
            <Radar size={14} />
            Deck intelligence
          </span>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-5xl">
            최근 덱 검토 큐
          </h1>
          <p className="section-copy mt-3 max-w-2xl">
            신뢰도, 최신성, 현재 패치, 반복 관측을 합산한 우선순위 순서입니다.
            원문과 덱 코드를 확인한 뒤 공개 덱에 연결하세요.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href="/admin/operations"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-extrabold"
          >
            <Activity size={16} />
            운영 상태
          </Link>
          <Link
            href="/admin/analytics"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-extrabold"
          >
            <BarChart3 size={16} />
            제품 분석
          </Link>
          <Link
            href="/admin/official-events"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-extrabold"
          >
            <FileJson size={16} />
            공식 대회 가져오기
          </Link>
          <div className="rounded-xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm">
            현재 필터 <strong>{queue.total}개</strong>
          </div>
        </div>
      </div>

      <nav
        aria-label="후보 상태"
        className="hide-scrollbar mt-7 flex gap-2 overflow-x-auto pb-2"
      >
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/deck-candidates?status=${tab.value}`}
            aria-current={status === tab.value ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-extrabold transition ${
              status === tab.value
                ? "bg-[var(--ink)] text-white"
                : "border border-[var(--line)] bg-white/70 text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {queue.unavailable ? (
        <div className="surface mt-6 rounded-2xl p-6 text-sm font-bold text-amber-900">
          후보 큐를 불러오지 못했습니다. Supabase 연결과 마이그레이션 상태를
          확인해주세요.
        </div>
      ) : queue.items.length > 0 ? (
        <div className="mt-6 grid gap-4">
          {queue.items.map((candidate) => (
            <DeckCandidateReviewCard
              key={candidate.id}
              candidate={candidate}
              linkTargets={queue.linkTargets}
            />
          ))}
        </div>
      ) : (
        <div className="surface mt-6 grid min-h-64 place-items-center rounded-[1.5rem] p-6 text-center">
          <div>
            <Radar className="mx-auto text-[var(--muted)]" />
            <h2 className="mt-4 text-xl font-black">대기 중인 후보가 없습니다</h2>
            <p className="section-copy mt-2">
              다음 수집 실행 후 우선순위가 높은 후보가 여기에 표시됩니다.
            </p>
          </div>
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label="후보 목록 페이지" className="mt-8 flex items-center justify-center gap-3">
          <PageLink
            href={`/admin/deck-candidates?status=${status}&page=${Math.max(1, page - 1)}`}
            disabled={page <= 1}
          >
            <ChevronLeft size={15} />
            이전
          </PageLink>
          <span className="text-sm font-bold text-[var(--muted)]">
            {page} / {pageCount}
          </span>
          <PageLink
            href={`/admin/deck-candidates?status=${status}&page=${Math.min(pageCount, page + 1)}`}
            disabled={page >= pageCount}
          >
            다음
            <ChevronRight size={15} />
          </PageLink>
        </nav>
      )}
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
    <span className="inline-flex h-10 items-center gap-1 rounded-xl border border-[var(--line)] px-3 text-sm font-bold opacity-40">
      {children}
    </span>
  ) : (
    <Link
      href={href}
      className="inline-flex h-10 items-center gap-1 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-bold"
    >
      {children}
    </Link>
  );
}
