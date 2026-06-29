import Link from "next/link";
import { ArrowRight, Clock3, Flame, ShieldCheck, Sparkles } from "lucide-react";
import { DeckCard } from "@/components/deck/deck-card";
import { HeroSearch } from "@/components/home/hero-search";
import { getHomeDeckCatalog } from "@/server/repositories/public-decks";

export const dynamic = "force-dynamic";

export default async function Home() {
  const {
    featured,
    popular,
    beginner,
    latestTrusted,
    source,
    unavailable,
    currentPatch,
  } = await getHomeDeckCatalog();
  const hasDecks =
    featured.length + popular.length + beginner.length + latestTrusted.length > 0;

  return (
    <>
      <section className="page-shell pt-7 sm:pt-10">
        <HeroSearch isDemo={source === "demo"} currentPatch={currentPatch} />
        {source === "demo" && (
          <p className="mt-3 text-center text-xs font-semibold text-amber-800">
            Supabase 미연결 개발 환경이라 UX 검증용 데모 덱을 표시하고 있습니다.
          </p>
        )}
      </section>

      <section className="page-shell py-7">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="surface flex items-center gap-3 rounded-2xl px-4 py-3.5">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck size={19} />
            </span>
            <div>
              <div className="text-sm font-extrabold">
                현재 패치 {currentPatch}
              </div>
              <div className="text-xs text-[var(--muted)]">오래된 덱과 최신 덱을 먼저 구분</div>
            </div>
          </div>
          <div className="surface flex items-center gap-3 rounded-2xl px-4 py-3.5">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <Sparkles size={19} />
            </span>
            <div>
              <div className="text-sm font-extrabold">숫자보다 선택 이유</div>
              <div className="text-xs text-[var(--muted)]">출처·반응·운영 난이도를 함께 표시</div>
            </div>
          </div>
          <div className="surface flex items-center gap-3 rounded-2xl px-4 py-3.5">
            <span className="grid size-10 place-items-center rounded-xl bg-orange-50 text-orange-700">
              <Clock3 size={19} />
            </span>
            <div>
              <div className="text-sm font-extrabold">복사까지 90초 이내</div>
              <div className="text-xs text-[var(--muted)]">모바일에서 보고 바로 게임으로</div>
            </div>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="page-shell py-10">
          <SectionHeader
            eyebrow="Today picks"
            title="오늘 바로 돌릴 추천 덱"
            copy="등반, 안정성, 재미, 제작 비용을 함께 보고 지금 플레이할 덱을 고르세요."
            href="/decks"
          />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {featured.map((deck) => (
              <DeckCard key={deck.slug} deck={deck} featured />
            ))}
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section className="border-y border-[var(--line)] bg-[#efe8dc]/60 py-14">
          <div className="page-shell">
            <SectionHeader
              eyebrow="Player signal"
              title="지금 많이 복사한 덱"
              copy="사이트 안에서 실제 복사가 많은 덱을 보여줘서 체감 인기 흐름을 빠르게 잡습니다."
              href="/decks?sort=copies"
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {popular.map((deck, index) => (
                <DeckCard key={deck.slug} deck={deck} rank={index + 1} />
              ))}
            </div>
          </div>
        </section>
      )}

      {beginner.length > 0 && (
        <section className="page-shell py-16">
          <div className="grid items-start gap-10 lg:grid-cols-[0.7fr_1.3fr]">
            <div className="lg:sticky lg:top-24">
              <span className="eyebrow">
                <Flame size={14} />
                Easy start
              </span>
              <h2 className="section-title mt-3">
                처음이라면,
                <br />
                선택 기준부터 쉽게
              </h2>
              <p className="section-copy mt-4 max-w-md">
                초보 추천 덱은 승률만 높다고 붙이지 않습니다. 운영 목표가
                분명하고, 멀리건과 약점까지 설명된 덱을 우선합니다.
              </p>
              <Link
                href="/decks?tag=초보+추천"
                className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[var(--brand)]"
              >
                초보 추천 전체 보기
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {beginner.map((deck, index) => (
                <div
                  key={deck.slug}
                  className={index === 0 ? "sm:col-span-2" : ""}
                >
                  <DeckCard deck={deck} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {latestTrusted.length > 0 && (
        <section className="border-y border-[var(--line)] bg-white/55 py-14">
          <div className="page-shell">
            <SectionHeader
              eyebrow="Meta context"
              title="출처가 보이는 메타 후보"
              copy="최근 관측된 출처와 현재 패치 여부를 함께 보여줘서 숫자를 맹신하지 않게 합니다."
              href="/decks?trust=verified&sort=trending"
            />
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {latestTrusted.map((deck) => (
                <DeckCard key={deck.slug} deck={deck} />
              ))}
            </div>
          </div>
        </section>
      )}

      {!hasDecks && (
        <section className="page-shell py-14">
          <div className="surface rounded-[1.5rem] px-6 py-12 text-center">
            <h2 className="text-2xl font-black">
              {unavailable
                ? "공개 덱을 잠시 불러오지 못했어요"
                : "첫 공개 덱을 기다리고 있어요"}
            </h2>
            <p className="section-copy mx-auto mt-3 max-w-lg">
              {unavailable
                ? "잠시 후 다시 시도해주세요. 조회 오류를 데모 데이터로 대체하지 않습니다."
                : "직접 플레이한 덱과 운영법을 등록하면 발견 화면에 바로 연결됩니다."}
            </p>
            {!unavailable && (
              <Link
                href="/submit"
                className="mt-6 inline-flex h-11 items-center rounded-xl bg-[var(--brand)] px-5 text-sm font-extrabold text-white"
              >
                첫 덱 등록하기
              </Link>
            )}
          </div>
        </section>
      )}

      <section className="page-shell">
        <div className="relative overflow-hidden rounded-[2rem] bg-[var(--brand)] px-6 py-12 text-white sm:px-12 sm:py-14">
          <div className="soft-grid absolute inset-0 opacity-10" />
          <div className="relative z-10 flex flex-col items-start justify-between gap-7 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/65">
                Contributor beta
              </p>
              <h2 className="mt-3 max-w-xl text-3xl font-black leading-tight tracking-[-0.05em] sm:text-4xl">
                직접 사용한 덱과
                <br />
                운영 노하우가 있나요?
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-6 text-white/75">
                등록 기능은 기여자 베타에서 열립니다. 코드만 모으지 않고
                실제 판단에 도움이 되는 가이드를 함께 만듭니다.
              </p>
            </div>
            <Link
              href="/submit"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-[var(--brand-dark)] transition hover:bg-[#fff8eb]"
            >
              덱 코드 분석하기
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeader({
  eyebrow,
  title,
  copy,
  href,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  href: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="section-title mt-2">{title}</h2>
        <p className="section-copy mt-2">{copy}</p>
      </div>
      <Link
        href={href}
        className="hidden shrink-0 items-center gap-1.5 text-sm font-extrabold text-[var(--brand)] sm:flex"
      >
        전체 보기
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
