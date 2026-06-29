import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ClipboardCopy, Mail, ShieldCheck, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "소개와 문의",
  description:
    "HearthDeck Hub가 어떤 하스스톤 덱 사이트를 지향하는지와 베타 운영 문의 경로를 안내합니다.",
};

const promises = [
  {
    icon: ClipboardCopy,
    title: "덱 복사를 먼저 편하게",
    body: "방문자가 긴 설명을 읽기 전에 모바일에서 덱 코드를 빠르게 확인하고 복사할 수 있어야 합니다.",
  },
  {
    icon: ShieldCheck,
    title: "근거 없는 승률을 만들지 않기",
    body: "출처와 표본이 불분명한 수치를 권위처럼 보여주지 않습니다. 패치, 출처, 복사 반응, 운영 난이도를 함께 봅니다.",
  },
  {
    icon: BadgeCheck,
    title: "한국어 해석을 붙이기",
    body: "단순 덱 모음이 아니라 왜 지금 쓸 만한지, 어떤 상황에서는 피해야 하는지 짧고 분명하게 설명합니다.",
  },
];

export default function AboutPage() {
  return (
    <div className="page-shell py-10 sm:py-14">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#211d18] px-6 py-12 text-white sm:px-10 lg:px-14">
        <div className="soft-grid absolute inset-0 opacity-15" />
        <div className="absolute -right-28 -top-24 size-80 rounded-full bg-[var(--brand)] opacity-25 blur-3xl" />
        <div className="relative z-10 max-w-3xl">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-bold text-[#f6dba0]">
            <Sparkles size={14} />
            About HearthDeck Hub
          </span>
          <h1 className="text-[clamp(2.1rem,5vw,4.1rem)] font-black leading-[1.04] tracking-[-0.06em]">
            오늘 돌릴 덱을
            <span className="block text-[#f1bd55]">더 빨리 고르는 곳</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
            HearthDeck Hub는 하스스톤 유저가 현재 패치에서 쓸 덱을 빠르게
            찾고, 운영법을 이해하고, 덱 코드를 바로 복사하도록 돕는 한국어
            모바일 친화 덱 허브입니다.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/decks"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-extrabold text-[var(--brand-dark)] transition hover:bg-[#fff8eb]"
            >
              덱 찾기
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/meta"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-extrabold text-white transition hover:bg-white/10"
            >
              메타 기준 보기
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {promises.map((promise) => {
            const Icon = promise.icon;
            return (
              <article key={promise.title} className="surface rounded-[1.4rem] p-5">
                <span className="mb-4 grid size-10 place-items-center rounded-xl bg-orange-50 text-[var(--brand)]">
                  <Icon size={18} />
                </span>
                <h2 className="text-base font-extrabold tracking-[-0.03em]">
                  {promise.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {promise.body}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="surface rounded-[1.5rem] p-6">
          <h2 className="text-2xl font-black tracking-[-0.04em]">운영 상태</h2>
          <div className="mt-4 space-y-3 text-sm font-semibold leading-7 text-[var(--muted)]">
            <p>
              현재 제품은 공개 베타 전 단계입니다. Supabase가 연결되지 않은
              환경에서는 데모 덱이 표시될 수 있으며, 데모 데이터는 실제 메타
              통계나 라이브 하스스톤 데이터가 아닙니다.
            </p>
            <p>
              정식 배포 전에는 실제 덱 콘텐츠, 문의 채널, 개인정보 처리 기준,
              광고 배치 원칙을 다시 확인해야 합니다.
            </p>
          </div>
        </div>

        <div className="surface rounded-[1.5rem] p-6">
          <h2 className="flex items-center gap-2 text-2xl font-black tracking-[-0.04em]">
            <Mail size={21} />
            문의와 제보
          </h2>
          <div className="mt-4 space-y-3 text-sm font-semibold leading-7 text-[var(--muted)]">
            <p>
              공개 베타 전까지 운영 문의는 저장소의 이슈와 PR 기록을 중심으로
              추적합니다. 실제 사용자 문의용 이메일 또는 폼은 도메인과 운영
              주체가 확정된 뒤 이 페이지에 고지합니다.
            </p>
            <p>
              덱 오류, 출처 문제, 개인정보 노출, 광고 배치 문제는 공개 베타
              전 필수 처리 항목입니다. 긴급한 문제는 우선 콘텐츠 숨김과 기록
              보존을 원칙으로 처리합니다.
            </p>
            <Link
              href="/rules"
              className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--brand)]"
            >
              이용 규칙 확인하기
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
