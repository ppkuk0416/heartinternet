import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
} from "lucide-react";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOperationsStatusSummary } from "@/server/repositories/operations-status";
import type { OperationsSeverity } from "@/server/operations/status-summary";

export const metadata: Metadata = {
  title: "운영 상태",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminOperationsPage() {
  const destination = safeNextPath("/admin/operations");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(destination)}`);

  const client = await createServerSupabaseClient();
  const { data: profile } = client
    ? await client.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  if (profile?.role !== "moderator" && profile?.role !== "admin") {
    redirect("/");
  }

  const summary = await getOperationsStatusSummary({ client: client ?? undefined });

  return (
    <div className="page-shell py-8 sm:py-12">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <span className="eyebrow">
            <Activity size={14} />
            Operations
          </span>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-5xl">
            운영 상태
          </h1>
          <p className="section-copy mt-3 max-w-2xl">
            최근 덱 수집, 신고 큐, 카드 데이터, 패치 전환, 분석 이벤트가 정상
            흐름인지 확인합니다. 이 화면은 공개 베타 전 운영 당번의 첫 체크
            포인트입니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/content-readiness"
            className="inline-flex h-11 items-center rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-extrabold"
          >
            콘텐츠 기준
          </Link>
          <StatusPill severity={summary.overall} />
        </div>
      </div>

      {summary.unavailable && (
        <div className="surface mt-7 rounded-2xl p-5 text-sm font-bold text-amber-900">
          운영 상태를 불러오지 못했습니다. Supabase 연결, 마이그레이션, 운영자
          권한을 먼저 확인해주세요.
        </div>
      )}

      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summary.cards.map((card) => (
          <article key={card.key} className="surface rounded-[1.4rem] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold text-[var(--muted)]">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-black tracking-[-0.055em]">
                  {card.value}
                </p>
              </div>
              <StatusDot severity={card.severity} />
            </div>
            <p className="mt-3 min-h-10 text-sm font-semibold leading-5 text-[var(--muted)]">
              {card.detail}
            </p>
            {card.href && (
              <Link
                href={card.href}
                className="mt-4 inline-flex text-sm font-extrabold text-[var(--brand)]"
              >
                자세히 보기
              </Link>
            )}
          </article>
        ))}
      </div>

      <section className="surface mt-6 rounded-[1.5rem] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <DatabaseZap className="mt-1 shrink-0 text-[var(--brand)]" size={20} />
          <div>
            <h2 className="text-xl font-black tracking-[-0.035em]">
              운영 당번 체크 순서
            </h2>
            <ol className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-[var(--muted)]">
              <li>1. critical 카드가 있으면 해당 관리자 화면에서 원인을 확인한다.</li>
              <li>2. 수집 실패는 GitHub Actions 로그와 출처 URL 상태를 먼저 본다.</li>
              <li>3. 패치 카드 검토가 필요하면 카드 합법성 설정을 갱신한 뒤 활성화한다.</li>
              <li>4. 신고 큐가 10건 이상이면 공개 덱 노출보다 모더레이션을 우선한다.</li>
            </ol>
          </div>
        </div>
        <p className="mt-5 text-xs font-bold text-[var(--muted)]">
          마지막 확인: {formatDate(summary.generatedAt)}
        </p>
      </section>
    </div>
  );
}

function StatusPill({ severity }: { severity: OperationsSeverity }) {
  const meta = severityMeta(severity);
  return (
    <span
      className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-extrabold ${meta.className}`}
    >
      {severity === "ok" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      {meta.label}
    </span>
  );
}

function StatusDot({ severity }: { severity: OperationsSeverity }) {
  const meta = severityMeta(severity);
  return (
    <span
      aria-label={meta.label}
      className={`grid size-10 place-items-center rounded-full ${meta.className}`}
    >
      {severity === "ok" ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
    </span>
  );
}

function severityMeta(severity: OperationsSeverity) {
  return {
    ok: {
      label: "정상",
      className: "bg-emerald-50 text-emerald-800",
    },
    warning: {
      label: "주의",
      className: "bg-amber-50 text-amber-900",
    },
    critical: {
      label: "개입 필요",
      className: "bg-red-50 text-red-800",
    },
  }[severity];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
