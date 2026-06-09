import Link from "next/link";
import {
  ChevronRight,
  Clock3,
  Copy,
  MessageCircle,
  ShieldCheck,
  ThumbsUp,
} from "lucide-react";
import { ClassEmblem } from "@/components/deck/class-emblem";
import { CopyDeckButton } from "@/components/deck/copy-deck-button";
import { EvidenceBadge } from "@/components/deck/evidence-badge";
import { CLASS_META } from "@/lib/decks";
import type { Deck } from "@/lib/types";

export function DeckCard({
  deck,
  rank,
  featured = false,
}: {
  deck: Deck;
  rank?: number;
  featured?: boolean;
}) {
  const meta = CLASS_META[deck.className];

  return (
    <article
      className={`group relative overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-[var(--surface)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)] ${
        featured ? "min-h-[25rem]" : ""
      }`}
    >
      <div
        className={`relative overflow-hidden ${featured ? "h-36" : "h-2"}`}
        style={{
          background: featured
            ? `radial-gradient(circle at 82% 20%, ${meta.accent}99, transparent 28%), linear-gradient(135deg, ${meta.color}, #211d18 82%)`
            : meta.color,
        }}
      >
        {featured && (
          <>
            <div className="soft-grid absolute inset-0 opacity-30" />
            <div className="absolute left-5 top-5 flex items-center gap-2">
              <ClassEmblem className={deck.className} />
              <span className="rounded-full border border-white/20 bg-black/15 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                {deck.featuredReason}
              </span>
            </div>
            <span className="absolute -bottom-7 right-2 text-[8rem] font-black leading-none text-white/10">
              {meta.glyph}
            </span>
          </>
        )}
      </div>

      {rank && (
        <span className="absolute left-4 top-4 grid size-8 place-items-center rounded-full bg-[var(--ink)] text-xs font-black text-white">
          {rank}
        </span>
      )}

      <div className="flex h-[calc(100%-0.5rem)] flex-col p-5">
        {!featured && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ClassEmblem className={deck.className} size="sm" />
              <div>
                <div className="text-xs font-extrabold">{deck.className}</div>
                <div className="text-[0.68rem] text-[var(--muted)]">
                  {deck.archetype}
                </div>
              </div>
            </div>
            <EvidenceBadge status={deck.evidence} />
          </div>
        )}

        {featured && (
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[var(--muted)]">
              {deck.className} · {deck.archetype}
            </span>
            <EvidenceBadge status={deck.evidence} />
          </div>
        )}

        <Link href={`/decks/${deck.slug}`} className="block">
          <h3 className="text-[1.08rem] font-extrabold leading-snug tracking-[-0.035em] transition group-hover:text-[var(--brand)]">
            {deck.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
            {deck.summary}
          </p>
        </Link>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {(deck.trackingSourceCount ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[0.68rem] font-bold text-emerald-800">
              <Clock3 size={11} />
              최근 14일 · {deck.trackingSourceCount}개 출처 확인
            </span>
          )}
          {deck.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#f2ece2] px-2.5 py-1 text-[0.68rem] font-bold text-[#665c50]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3 border-y border-[var(--line)] py-3 text-xs text-[var(--muted)]">
          <span className="flex items-center gap-1">
            <ShieldCheck size={13} />
            패치 {deck.patch}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp size={13} />
            {deck.recommendations}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={13} />
            {deck.comments}
          </span>
          <span className="ml-auto flex items-center gap-1 font-bold text-[var(--ink)]">
            <Copy size={13} />
            {deck.copies.toLocaleString()}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <CopyDeckButton
            code={deck.deckCode}
            trackingSlug={deck.slug}
            variant="compact"
            label="코드 복사"
            className="flex-1"
          />
          <Link
            href={`/decks/${deck.slug}`}
            aria-label={`${deck.title} 상세 보기`}
            className="grid size-9 place-items-center rounded-lg bg-[var(--ink)] text-white transition hover:bg-[var(--brand)]"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
