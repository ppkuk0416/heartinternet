import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, MousePointerClick, Route, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProductAnalyticsSummary } from "@/server/repositories/product-analytics";

export const metadata: Metadata = {
  title: "제품 분석",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const destination = safeNextPath("/admin/analytics");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(destination)}`);

  const client = await createServerSupabaseClient();
  const { data: profile } = client
    ? await client.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  if (profile?.role !== "moderator" && profile?.role !== "admin") {
    redirect("/");
  }

  const summary = await getProductAnalyticsSummary({
    days: 7,
    client: client ?? undefined,
  });
  const detailToCopy = summary.funnel.find(
    (step) => step.label === "상세 -> 복사",
  );

  return (
    <div className="page-shell py-8 sm:py-12">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <span className="eyebrow">
            <BarChart3 size={14} />
            Product analytics
          </span>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-5xl">
            제품 분석
          </h1>
          <p className="section-copy mt-3 max-w-2xl">
            최근 {summary.windowDays}일 기준으로 발견, 상세 확인, 복사,
            등록 흐름을 봅니다. 원문 덱 코드와 개인 입력 본문은 수집하지
            않습니다.
          </p>
        </div>
        <Link
          href="/admin/deck-candidates"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-extrabold"
        >
          최근 덱 검토 큐
        </Link>
      </div>

      {summary.unavailable && (
        <div className="surface mt-7 rounded-2xl p-5 text-sm font-bold text-amber-900">
          분석 이벤트를 불러오지 못했습니다. Supabase 연결, 마이그레이션, 운영자
          권한을 확인해주세요.
        </div>
      )}
      {summary.truncated && (
        <div className="surface mt-7 rounded-2xl p-5 text-sm font-bold text-amber-900">
          최근 이벤트가 5,000건을 넘어 일부만 집계했습니다. 다음 단계에서
          집계용 RPC나 materialized view로 전환해야 합니다.
        </div>
      )}

      <div className="mt-7 grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={<Route size={18} />}
          label="총 이벤트"
          value={summary.totalEvents.toLocaleString("ko-KR")}
          helper={`최근 ${summary.windowDays}일 수집량`}
        />
        <MetricCard
          icon={<UsersRound size={18} />}
          label="고유 방문자"
          value={summary.uniqueActors.toLocaleString("ko-KR")}
          helper="로그인 사용자 + 일일 익명 해시"
        />
        <MetricCard
          icon={<MousePointerClick size={18} />}
          label="상세→복사"
          value={formatPercent(detailToCopy?.rate)}
          helper={`${detailToCopy?.toCount ?? 0}회 복사 / ${detailToCopy?.fromCount ?? 0}회 상세`}
        />
      </div>

      <section className="surface mt-6 rounded-[1.5rem] p-5 sm:p-6">
        <h2 className="text-xl font-black tracking-[-0.035em]">핵심 퍼널</h2>
        <div className="mt-5 grid gap-3">
          {summary.funnel.map((step) => (
            <div key={step.label} className="rounded-2xl bg-[#f5efe6] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-extrabold">{step.label}</p>
                <p className="text-sm font-black text-[var(--brand)]">
                  {formatPercent(step.rate)}
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[var(--brand)]"
                  style={{ width: `${Math.min(step.rate ?? 0, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-bold text-[var(--muted)]">
                {step.fromCount.toLocaleString("ko-KR")} →{" "}
                {step.toCount.toLocaleString("ko-KR")}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="surface rounded-[1.5rem] p-5 sm:p-6">
          <h2 className="text-xl font-black tracking-[-0.035em]">
            일별 흐름
          </h2>
          <div className="mt-5 grid gap-3">
            {summary.daily.map((day) => (
              <div key={day.date} className="grid grid-cols-[6rem_1fr] items-center gap-3 text-sm">
                <span className="font-bold text-[var(--muted)]">
                  {day.date.slice(5)}
                </span>
                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#f5efe6]">
                    <div
                      className="h-full rounded-full bg-[var(--ink)]"
                      style={{ width: `${barWidth(day.events, summary.daily.map((item) => item.events))}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                    이벤트 {day.events} · 복사 {day.copies} · 등록 시작{" "}
                    {day.submissions}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="surface rounded-[1.5rem] p-5 sm:p-6">
          <h2 className="text-xl font-black tracking-[-0.035em]">
            복사 상위 덱
          </h2>
          {summary.topDecks.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {summary.topDecks.map((deck) => (
                <div key={deck.deckId} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {deck.slug ? (
                        <Link
                          href={`/decks/${deck.slug}`}
                          className="font-extrabold hover:text-[var(--brand)]"
                        >
                          {deck.title}
                        </Link>
                      ) : (
                        <p className="font-extrabold">{deck.title}</p>
                      )}
                      <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                        상세 {deck.detailViews} · 복사 {deck.copies}
                      </p>
                    </div>
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-[var(--brand)]">
                      {formatPercent(deck.copyRate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="section-copy mt-4">
              아직 덱 상세 조회나 복사 이벤트가 없습니다.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="surface rounded-[1.4rem] p-5">
      <div className="flex items-center gap-2 text-xs font-extrabold text-[var(--muted)]">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-3xl font-black tracking-[-0.05em]">{value}</p>
      <p className="mt-1 text-xs font-bold text-[var(--muted)]">{helper}</p>
    </div>
  );
}

function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : `${value}%`;
}

function barWidth(value: number, values: number[]) {
  const max = Math.max(1, ...values);
  return Math.max(4, Math.round((value / max) * 100));
}
