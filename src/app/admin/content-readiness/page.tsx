import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ClipboardCheck, CircleAlert, XCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getContentReadinessSummary } from "@/server/repositories/content-readiness";
import type { ContentReadinessSeverity } from "@/server/content/readiness-summary";

export const metadata: Metadata = {
  title: "콘텐츠 출시 기준",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ContentReadinessPage() {
  const destination = safeNextPath("/admin/content-readiness");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(destination)}`);

  const client = await createServerSupabaseClient();
  const { data: profile } = client
    ? await client.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  if (profile?.role !== "moderator" && profile?.role !== "admin") {
    redirect("/");
  }

  const summary = await getContentReadinessSummary({ client: client ?? undefined });

  return (
    <div className="page-shell py-8 sm:py-12">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <span className="eyebrow">
            <ClipboardCheck size={14} />
            Launch content
          </span>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-5xl">
            콘텐츠 출시 기준
          </h1>
          <p className="section-copy mt-3 max-w-2xl">
            공개 베타 전에 현재 패치 덱 수, 직업 분포, 신뢰 근거, 초보 추천,
            가이드 완성도를 확인합니다.
          </p>
        </div>
        <ReadinessPill ready={summary.ready} />
      </div>

      {summary.unavailable && (
        <div className="surface mt-7 rounded-2xl p-5 text-sm font-bold text-amber-900">
          콘텐츠 기준을 불러오지 못했습니다. Supabase 연결, 마이그레이션,
          운영자 권한을 확인해주세요.
        </div>
      )}

      <div className="mt-7 grid gap-4 md:grid-cols-3">
        <Metric label="전체 공개 덱" value={summary.totals.published} />
        <Metric
          label={`현재 패치${summary.currentPatch ? ` ${summary.currentPatch}` : ""}`}
          value={summary.totals.currentPatchPublished}
        />
        <Metric label="대표 직업 수" value={summary.totals.representedClasses} />
      </div>

      <section className="surface mt-6 rounded-[1.5rem] p-5 sm:p-6">
        <h2 className="text-xl font-black tracking-[-0.035em]">
          공개 베타 콘텐츠 체크리스트
        </h2>
        <div className="mt-5 grid gap-3">
          {summary.checks.map((check) => (
            <article
              key={check.key}
              className="rounded-2xl border border-[var(--line)] bg-white/70 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <SeverityIcon severity={check.severity} />
                  <div>
                    <p className="font-extrabold">{check.label}</p>
                    <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                      {check.detail}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-black">
                  {check.value}
                  <span className="text-[var(--muted)]"> / {check.target}</span>
                </p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#f5efe6]">
                <div
                  className={`h-full rounded-full ${barClass(check.severity)}`}
                  style={{
                    width: `${Math.min(100, Math.round((check.value / check.target) * 100))}%`,
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="surface mt-6 rounded-[1.5rem] p-5 sm:p-6">
        <h2 className="text-xl font-black tracking-[-0.035em]">
          부족할 때의 실행 순서
        </h2>
        <ol className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-[var(--muted)]">
          <li>1. 현재 패치 덱 30개를 먼저 채운다. 이전 패치 덱은 출시 기준에 넣지 않는다.</li>
          <li>2. 비어 있는 직업부터 후보 큐와 공식 이벤트 매니페스트로 보강한다.</li>
          <li>3. 출처 연결 또는 운영진 확인 덱 10개를 확보해 첫 방문 신뢰를 만든다.</li>
          <li>4. 초보 추천 5개는 쉬움 난이도와 멀리건이 명확한 덱만 넣는다.</li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/admin/deck-candidates"
            className="rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-extrabold"
          >
            후보 큐 보기
          </Link>
          <Link
            href="/admin/official-events"
            className="rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-extrabold text-white"
          >
            공식 대회 덱 가져오기
          </Link>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface rounded-[1.4rem] p-5">
      <p className="text-xs font-extrabold text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-[-0.055em]">
        {value.toLocaleString("ko-KR")}
      </p>
    </div>
  );
}

function ReadinessPill({ ready }: { ready: boolean }) {
  return (
    <span
      className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-extrabold ${
        ready ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
      }`}
    >
      {ready ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
      {ready ? "콘텐츠 기준 충족" : "콘텐츠 보강 필요"}
    </span>
  );
}

function SeverityIcon({ severity }: { severity: ContentReadinessSeverity }) {
  const className = {
    pass: "bg-emerald-50 text-emerald-800",
    warning: "bg-amber-50 text-amber-900",
    fail: "bg-red-50 text-red-800",
  }[severity];
  const Icon = severity === "pass" ? CheckCircle2 : severity === "warning" ? CircleAlert : XCircle;
  return (
    <span className={`grid size-10 shrink-0 place-items-center rounded-full ${className}`}>
      <Icon size={17} />
    </span>
  );
}

function barClass(severity: ContentReadinessSeverity) {
  return {
    pass: "bg-emerald-500",
    warning: "bg-amber-500",
    fail: "bg-red-500",
  }[severity];
}
