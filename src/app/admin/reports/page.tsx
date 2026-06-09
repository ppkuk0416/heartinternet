import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { ReportReviewCard } from "@/components/admin/report-review-card";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getModerationReports,
  REPORT_QUEUE_STATUSES,
  type ReportQueueStatus,
} from "@/server/repositories/moderation-reports";

export const metadata: Metadata = {
  title: "신고 검토",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const destination = safeNextPath("/admin/reports");
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
  const status = REPORT_QUEUE_STATUSES.includes(params.status as ReportQueueStatus)
    ? (params.status as ReportQueueStatus)
    : "open";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const queue = await getModerationReports({ status, page });
  const pageCount = Math.max(1, Math.ceil(queue.total / queue.pageSize));

  return (
    <div className="page-shell py-8 sm:py-12">
      <div>
        <span className="eyebrow">
          <ShieldAlert size={14} />
          Moderation
        </span>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-5xl">
          신고 검토
        </h1>
        <p className="section-copy mt-3 max-w-2xl">
          허위 성적, 스팸, 악성 댓글을 검토하고 필요한 경우 대상 콘텐츠를
          숨깁니다. 모든 처리에는 감사 로그 사유가 남습니다.
        </p>
      </div>

      <nav className="mt-7 flex gap-2">
        {REPORT_QUEUE_STATUSES.map((tab) => (
          <Link
            key={tab}
            href={`/admin/reports?status=${tab}`}
            aria-current={status === tab ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-extrabold ${
              status === tab
                ? "bg-[var(--ink)] text-white"
                : "border border-[var(--line)] bg-white text-[var(--muted)]"
            }`}
          >
            {tab === "open" ? "신규 신고" : "검토 중"}
          </Link>
        ))}
      </nav>

      {queue.unavailable ? (
        <div className="surface mt-6 rounded-2xl p-6 text-sm font-bold text-amber-900">
          신고 큐를 불러오지 못했습니다. Supabase 연결과 권한을 확인해주세요.
        </div>
      ) : queue.items.length > 0 ? (
        <div className="mt-6 grid gap-4">
          {queue.items.map((report) => (
            <ReportReviewCard key={report.id} report={report} />
          ))}
        </div>
      ) : (
        <div className="surface mt-6 grid min-h-64 place-items-center rounded-[1.5rem] p-6 text-center">
          <div>
            <ShieldAlert className="mx-auto text-[var(--muted)]" />
            <h2 className="mt-4 text-xl font-black">처리할 신고가 없습니다</h2>
            <p className="section-copy mt-2">
              열린 신고가 생기면 이곳에서 처리할 수 있습니다.
            </p>
          </div>
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label="신고 목록 페이지" className="mt-8 flex items-center justify-center gap-3">
          <PageLink
            href={`/admin/reports?status=${status}&page=${Math.max(1, page - 1)}`}
            disabled={page <= 1}
          >
            <ChevronLeft size={15} />
            이전
          </PageLink>
          <span className="text-sm font-bold text-[var(--muted)]">
            {page} / {pageCount}
          </span>
          <PageLink
            href={`/admin/reports?status=${status}&page=${Math.min(pageCount, page + 1)}`}
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
