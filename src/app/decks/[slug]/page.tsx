import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Flame,
  Gamepad2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Swords,
} from "lucide-react";
import { ProductEventTracker } from "@/components/analytics/product-event-tracker";
import { DeckDiscussion } from "@/components/community/deck-discussion";
import { ReportButton } from "@/components/community/report-button";
import { ClassEmblem } from "@/components/deck/class-emblem";
import { CopyDeckButton } from "@/components/deck/copy-deck-button";
import { DeckCard } from "@/components/deck/deck-card";
import { DeckReactions } from "@/components/deck/deck-reactions";
import { EvidenceBadge } from "@/components/deck/evidence-badge";
import { CLASS_META, decks, getDeck } from "@/lib/decks";
import { getPublishedDeck } from "@/server/repositories/published-deck";
import { getDeckReactionState } from "@/server/repositories/deck-reactions";
import { getDeckDiscussion } from "@/server/repositories/deck-comments";

type PageParams = Promise<{ slug: string }>;

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return decks.map((deck) => ({ slug: deck.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const deck = getDeck(slug) ?? (await getPublishedDeck(slug));
  if (!deck) return {};

  return {
    title: deck.title,
    description: deck.summary,
  };
}

export default async function DeckDetailPage({ params }: { params: PageParams }) {
  const { slug } = await params;
  const deck = getDeck(slug) ?? (await getPublishedDeck(slug));
  if (!deck) notFound();
  const [reactions, discussion] = await Promise.all([
    getDeckReactionState(slug),
    getDeckDiscussion(slug),
  ]);

  const meta = CLASS_META[deck.className];
  const related = decks
    .filter(
      (candidate) =>
        candidate.slug !== deck.slug &&
        candidate.patchStatus === "현재 패치" &&
        (candidate.className === deck.className ||
          candidate.difficulty === deck.difficulty),
    )
    .slice(0, 3);

  const totalCards = deck.cards.reduce(
    (sum, card) => sum + card.quantity,
    0,
  );

  return (
    <>
      <ProductEventTracker
        eventName="deck_detail_viewed"
        deckSlug={deck.slug}
        metadata={{
          className: deck.className,
          patchStatus: deck.patchStatus,
          evidence: deck.evidence,
          sourceType: deck.sourceType,
        }}
      />
      <div className="border-b border-[var(--line)] bg-[#efe8dc]/55">
        <div className="page-shell py-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
            <Link href="/decks" className="inline-flex items-center gap-1 hover:text-[var(--brand)]">
              <ArrowLeft size={13} />
              덱 찾기
            </Link>
            <ChevronRight size={12} />
            <span>{deck.className}</span>
            <ChevronRight size={12} />
            <span className="truncate text-[var(--ink)]">{deck.archetype}</span>
          </div>
        </div>
      </div>

      {deck.patchStatus === "이전 패치" && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="page-shell flex gap-3 py-3 text-sm text-amber-950">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
              <strong>이 덱은 패치 {deck.patch} 기록입니다.</strong>
              <span className="ml-1 text-amber-800">
                현재 카드와 메타에서 그대로 작동하는지 확인되지 않았어요.
              </span>
            </div>
          </div>
        </div>
      )}

      <section
        className="relative overflow-hidden border-b border-[var(--line)]"
        style={{
          background: `radial-gradient(circle at 85% 10%, ${meta.accent}33, transparent 28rem), linear-gradient(180deg, #fffdf8, #f7f3eb)`,
        }}
      >
        <div className="soft-grid absolute inset-0 opacity-50" />
        <div className="page-shell relative z-10 grid gap-8 py-10 lg:grid-cols-[1fr_21rem] lg:py-14">
          <div>
            <div className="flex items-start gap-4">
              <ClassEmblem className={deck.className} size="lg" />
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold text-[var(--muted)]">
                    {deck.className} · {deck.archetype} · 정규전
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[0.68rem] font-extrabold ${
                      deck.patchStatus === "현재 패치"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {deck.patchStatus}
                  </span>
                </div>
                <h1 className="max-w-3xl text-[clamp(2rem,5vw,3.8rem)] font-black leading-[1.08] tracking-[-0.065em]">
                  {deck.title}
                </h1>
              </div>
            </div>

            <p className="mt-6 max-w-3xl text-base leading-7 text-[var(--muted)] sm:text-lg">
              {deck.summary}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {deck.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-bold"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-[var(--line)] pt-5 text-sm">
              <span className="inline-flex items-center gap-2 font-bold">
                <CircleUserRound size={18} className="text-[var(--brand)]" />
                {deck.author}
                <small className="font-medium text-[var(--muted)]">
                  {deck.authorRole}
                </small>
              </span>
              <span className="text-[var(--muted)]">업데이트 {deck.updatedAt}</span>
            </div>
          </div>

          <aside className="surface rounded-[1.4rem] p-5 shadow-[var(--shadow)] lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[var(--muted)]">
                이 덱의 근거
              </span>
              <EvidenceBadge status={deck.evidence} />
            </div>
            <div className="mt-4 rounded-xl bg-[#f4efe7] p-4">
              <div className="font-extrabold">{deck.sourceType}</div>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                {deck.sourceLabel}
              </p>
              {deck.sourceUrl && (
                <a
                  href={deck.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-xs font-extrabold text-[var(--brand)]"
                >
                  원본 출처 보기
                </a>
              )}
              {(deck.rank || deck.record) && (
                <div className="mt-3 flex gap-2">
                  {deck.rank && (
                    <span className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold">
                      {deck.rank}
                    </span>
                  )}
                  {deck.record && (
                    <span className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold">
                      {deck.record}
                    </span>
                  )}
                </div>
              )}
            </div>
            <CopyDeckButton
              code={deck.deckCode}
              trackingSlug={deck.slug}
              className="mt-4 w-full"
            />
            <p className="mt-3 text-center text-[0.68rem] leading-4 text-[var(--muted)]">
              하스스톤에서 새 덱을 만들면 자동으로 불러옵니다.
            </p>
            <DeckReactions
              slug={deck.slug}
              authenticated={reactions.authenticated}
              initialRecommended={reactions.recommended}
              initialFavorited={reactions.favorited}
              initialRecommendationCount={deck.recommendations}
              initialFavoriteCount={deck.favorites ?? 0}
            />
            <div className="mt-3 text-center">
              <ReportButton
                target={{ targetType: "deck", deckSlug: deck.slug }}
                authenticated={reactions.authenticated}
                returnPath={`/decks/${deck.slug}`}
                label="이 덱 신고"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-4 text-center">
              <Stat value={deck.comments} label="댓글" icon={<MessageCircle size={14} />} />
              <Stat value={deck.copies} label="복사" icon={<Gamepad2 size={14} />} />
            </div>
          </aside>
        </div>
      </section>

      <div className="page-shell grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-7">
          <section className="surface rounded-[1.5rem] p-5 sm:p-7">
            <div className="grid gap-4 sm:grid-cols-3">
              <FitItem
                label="추천 대상"
                value={deck.recommendedFor}
                icon={<Sparkles size={18} />}
              />
              <FitItem
                label="운영 난이도"
                value={deck.difficulty}
                icon={<Swords size={18} />}
              />
              <FitItem
                label="패치"
                value={`${deck.patch} · ${deck.patchStatus}`}
                icon={<ShieldCheck size={18} />}
              />
            </div>
            <div className="mt-6 grid gap-4 border-t border-[var(--line)] pt-6 sm:grid-cols-2">
              <ProsCons title="이 덱의 장점" items={deck.strengths} positive />
              <ProsCons title="알아둘 약점" items={deck.weaknesses} />
            </div>
          </section>

          <ContentSection
            eyebrow="Game plan"
            title="운영 핵심"
            icon={<Flame size={18} />}
          >
            <ol className="space-y-4">
              {deck.gamePlan.map((item, index) => (
                <li key={item} className="flex gap-4">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <p className="pt-0.5 text-sm leading-7 text-[#514b44]">{item}</p>
                </li>
              ))}
            </ol>
          </ContentSection>

          <ContentSection eyebrow="Mulligan" title="시작 카드 선택" icon={<Sparkles size={18} />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <GuideList title="항상 찾는 카드" items={deck.mulligan.core} />
              <GuideList
                title="상황에 따라"
                items={deck.mulligan.situational}
                muted
              />
            </div>
          </ContentSection>

          <ContentSection eyebrow="Card choices" title="카드 선택과 교체" icon={<Bookmark size={18} />}>
            <GuideList items={deck.cardChoices} />
          </ContentSection>

          <ContentSection eyebrow="Matchups" title="상성과 주의점" icon={<Swords size={18} />}>
            <GuideList items={deck.matchupNotes} />
          </ContentSection>

          <DeckDiscussion
            slug={deck.slug}
            comments={discussion.comments}
            authenticated={discussion.authenticated}
            unavailable={discussion.unavailable}
          />
        </div>

        <aside className="order-first lg:order-last">
          <section className="surface rounded-[1.4rem] p-4 lg:sticky lg:top-24">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <span className="text-xs font-extrabold text-[var(--muted)]">
                  덱 구성
                </span>
                <h2 className="mt-1 text-xl font-black">{totalCards}장</h2>
              </div>
              <span className="text-xs font-bold text-[var(--muted)]">
                평균 {averageCost(deck.cards)}
              </span>
            </div>
            <div className="max-h-[35rem] space-y-1.5 overflow-y-auto pr-1">
              {deck.cards.map((card) => (
                <div
                  key={`${card.cost}-${card.name}`}
                  className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 text-xs"
                >
                  <span
                    className="grid size-6 shrink-0 place-items-center rounded-full text-[0.68rem] font-black text-white"
                    style={{ backgroundColor: meta.color }}
                  >
                    {card.cost}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate font-bold ${
                      card.legendary ? "text-amber-700" : ""
                    }`}
                  >
                    {card.name}
                  </span>
                  <span className="font-black text-[var(--muted)]">
                    ×{card.quantity}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-[0.68rem] leading-5 text-amber-900">
              알파의 카드명과 구성은 파서 UX 검증용 예시입니다.
            </div>
          </section>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="border-t border-[var(--line)] bg-[#efe8dc]/55 py-14">
          <div className="page-shell">
            <span className="eyebrow">Keep exploring</span>
            <h2 className="section-title mt-2">함께 살펴볼 덱</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <DeckCard key={item.slug} deck={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[rgba(255,253,248,.94)] p-3 backdrop-blur-xl lg:hidden">
        <div className="page-shell flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-extrabold">{deck.title}</div>
            <div className="text-[0.68rem] text-[var(--muted)]">
              패치 {deck.patch} · {deck.evidence}
            </div>
          </div>
          <CopyDeckButton
            code={deck.deckCode}
            trackingSlug={deck.slug}
            className="h-11 shrink-0 rounded-xl"
          />
        </div>
      </div>
    </>
  );
}

function Stat({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1 text-sm font-black">
        {icon}
        {value.toLocaleString()}
      </div>
      <div className="mt-1 text-[0.62rem] text-[var(--muted)]">{label}</div>
    </div>
  );
}

function FitItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-[#f4efe7] p-4">
      <span className="flex items-center gap-2 text-xs font-extrabold text-[var(--brand-dark)]">
        {icon}
        {label}
      </span>
      <p className="mt-2 text-sm font-bold leading-6">{value}</p>
    </div>
  );
}

function ProsCons({
  title,
  items,
  positive = false,
}: {
  title: string;
  items: string[];
  positive?: boolean;
}) {
  const Icon = positive ? CheckCircle2 : AlertTriangle;
  return (
    <div>
      <h3 className="mb-3 text-sm font-extrabold">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-[var(--muted)]">
            <Icon
              size={16}
              className={positive ? "text-emerald-600" : "text-amber-600"}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContentSection({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="surface rounded-[1.5rem] p-5 sm:p-7">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">{title}</h2>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-orange-50 text-[var(--brand)]">
          {icon}
        </span>
      </div>
      {children}
    </section>
  );
}

function GuideList({
  title,
  items,
  muted = false,
}: {
  title?: string;
  items: string[];
  muted?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 ${muted ? "bg-[#f4efe7]" : "bg-orange-50/70"}`}>
      {title && <h3 className="mb-3 text-sm font-extrabold">{title}</h3>}
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-6 text-[#514b44]">
            <span
              className={`mt-2 size-1.5 shrink-0 rounded-full ${
                muted ? "bg-[#9c9183]" : "bg-[var(--brand)]"
              }`}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function averageCost(cards: { cost: number; quantity: number }[]) {
  const total = cards.reduce((sum, card) => sum + card.quantity, 0);
  const cost = cards.reduce(
    (sum, card) => sum + card.cost * card.quantity,
    0,
  );
  return (cost / total).toFixed(1);
}
