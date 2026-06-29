import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, ClipboardCopy, Eye, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "오늘의 메타 덱 가이드",
  description:
    "현재 패치에서 덱을 고를 때 봐야 할 하스스톤 메타 신호와 추천 덱 탐색 기준을 한국어로 정리합니다.",
};

const decisionSignals = [
  {
    icon: TrendingUp,
    title: "메타 압력",
    body: "많이 보이는 직업과 덱 유형을 먼저 확인합니다. 단순 인기와 실제 강함은 다를 수 있어 출처와 패치 날짜를 같이 봅니다.",
  },
  {
    icon: ClipboardCopy,
    title: "복사 반응",
    body: "우리 사이트 안에서 실제로 많이 복사된 덱은 플레이 의도가 강한 신호입니다. 초기에는 작은 데이터지만 쌓일수록 유용해집니다.",
  },
  {
    icon: ShieldCheck,
    title: "근거 라벨",
    body: "작성자 입력, 커뮤니티 출처, 대회/공식 이벤트 후보를 구분해서 보여줍니다. 출처가 없는 승률 주장은 메타 판단의 중심에 두지 않습니다.",
  },
  {
    icon: Eye,
    title: "운영 난이도",
    body: "좋은 덱이어도 지금 내가 굴릴 수 없으면 의미가 없습니다. 멀리건, 약점, 승리 플랜이 명확한 덱을 우선합니다.",
  },
];

const pickPaths = [
  {
    label: "안전한 메타 후보 보기",
    description: "최근 출처와 현재 패치 신호가 있는 덱부터 확인합니다.",
    href: "/decks?trust=verified&sort=trending",
  },
  {
    label: "빠른 등반 덱 보기",
    description: "게임 시간이 짧고 플랜이 명확한 덱을 찾습니다.",
    href: "/decks?tag=빠른+등반",
  },
  {
    label: "저가루 덱 보기",
    description: "제작 부담을 줄이고 바로 테스트할 수 있는 덱을 고릅니다.",
    href: "/decks?tag=저가루",
  },
  {
    label: "초보 추천 덱 보기",
    description: "멀리건과 운영 목표가 쉬운 덱을 먼저 봅니다.",
    href: "/decks?tag=초보+추천",
  },
];

const editorialRules = [
  "승률은 출처와 표본을 확인할 수 있을 때만 강한 근거로 사용합니다.",
  "패치가 바뀌면 오래된 덱은 별도로 표시하고 추천 우선순위를 낮춥니다.",
  "복사 수, 추천, 댓글은 사이트 내부의 관심 신호이지 전체 메타 승률이 아닙니다.",
  "광고보다 복사 경험을 먼저 지킵니다. 핵심 행동을 방해하는 배치는 사용하지 않습니다.",
];

export default function MetaPage() {
  return (
    <>
      <section className="page-shell py-10 sm:py-14">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#211d18] px-6 py-12 text-white sm:px-10 lg:px-14">
          <div className="soft-grid absolute inset-0 opacity-15" />
          <div className="absolute -right-28 -top-24 size-80 rounded-full bg-[var(--brand)] opacity-25 blur-3xl" />
          <div className="relative z-10 max-w-3xl">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-bold text-[#f6dba0]">
              <BarChart3 size={14} />
              Meta guide
            </span>
            <h1 className="text-[clamp(2.1rem,5vw,4.1rem)] font-black leading-[1.04] tracking-[-0.06em]">
              숫자를 맹신하지 않고
              <span className="block text-[#f1bd55]">오늘 돌릴 덱을 고르는 법</span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
              HearthDeck Hub의 메타 페이지는 거대한 승률 대시보드를 흉내 내기보다,
              현재 패치에서 덱을 고를 때 필요한 신호를 한국어로 정리하고 바로
              복사 가능한 덱 목록으로 연결합니다.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/decks?sort=trending"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-extrabold text-[var(--brand-dark)] transition hover:bg-[#fff8eb]"
              >
                메타 후보 덱 보기
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/decks?sort=copies"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-extrabold text-white transition hover:bg-white/10"
              >
                많이 복사한 덱 보기
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {decisionSignals.map((signal) => {
            const Icon = signal.icon;
            return (
              <article key={signal.title} className="surface rounded-[1.4rem] p-5">
                <span className="mb-4 grid size-10 place-items-center rounded-xl bg-orange-50 text-[var(--brand)]">
                  <Icon size={18} />
                </span>
                <h2 className="text-base font-extrabold tracking-[-0.03em]">
                  {signal.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {signal.body}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="page-shell py-12">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <span className="eyebrow">
              <Sparkles size={14} />
              Pick by goal
            </span>
            <h2 className="section-title mt-3">
              메타는 하나가 아니라
              <br />내 목적에 따라 달라집니다
            </h2>
            <p className="section-copy mt-4 max-w-lg">
              전설 상위권의 최적 덱, 퇴근 후 빠르게 별을 올릴 덱, 가루를 아낄
              덱은 서로 다를 수 있습니다. 그래서 HearthDeck Hub는 목표별
              진입로를 먼저 제공합니다.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pickPaths.map((path) => (
              <Link
                key={path.href}
                href={path.href}
                className="group surface rounded-[1.25rem] p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow)]"
              >
                <span className="flex items-center justify-between gap-3 text-sm font-extrabold text-[var(--ink)]">
                  {path.label}
                  <ArrowRight
                    size={16}
                    className="text-[var(--brand)] transition group-hover:translate-x-0.5"
                  />
                </span>
                <span className="mt-2 block text-sm leading-6 text-[var(--muted)]">
                  {path.description}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-white/55 py-12">
        <div className="page-shell">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <span className="eyebrow">Editorial rules</span>
              <h2 className="section-title mt-3">데이터를 다루는 기준</h2>
              <p className="section-copy mt-4 max-w-md">
                광고 수익화를 하더라도 신뢰를 잃으면 다시 방문할 이유가
                사라집니다. 그래서 메타 해석은 아래 기준을 따릅니다.
              </p>
            </div>
            <div className="grid gap-3">
              {editorialRules.map((rule, index) => (
                <div
                  key={rule}
                  className="surface flex gap-4 rounded-2xl px-5 py-4"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-[var(--muted)]">{rule}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
