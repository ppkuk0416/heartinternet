import Link from "next/link";
import { Copy, ExternalLink, MessageCircle } from "lucide-react";
import { ClassEmblem } from "@/components/deck/class-emblem";
import { CopyDeckButton } from "@/components/deck/copy-deck-button";
import { EvidenceBadge } from "@/components/deck/evidence-badge";
import type { Deck } from "@/lib/types";

export function CompactDeckRow({ deck }: { deck: Deck }) {
  return (
    <article className="grid gap-3 border-b border-[var(--line)] px-3 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4">
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <ClassEmblem className={deck.className} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/decks/${deck.slug}`}
                className="truncate text-base font-extrabold tracking-[-0.025em] hover:text-[var(--brand)]"
              >
                {deck.title}
              </Link>
              <EvidenceBadge status={deck.evidence} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
              <strong className="text-[var(--ink)]">{deck.author}</strong>
              <span>{deck.authorRole}</span>
              <span aria-hidden="true">·</span>
              <span>{deck.className}</span>
              <span aria-hidden="true">·</span>
              <span>{deck.archetype}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.7rem] font-bold">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">
                패치 {deck.patch}
              </span>
              <span className="rounded-full bg-[#f2ece2] px-2.5 py-1 text-[#665c50]">
                {deck.sourceType}
              </span>
              {deck.sourceUrl && (
                <a
                  href={deck.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--brand-dark)]"
                >
                  출처
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pl-11 sm:pl-0">
        <div className="flex min-w-24 items-center justify-end gap-3 text-xs text-[var(--muted)]">
          <span className="inline-flex items-center gap-1 font-extrabold text-[var(--ink)]">
            <Copy size={13} />
            {deck.copies.toLocaleString()}회
          </span>
          <Link
            href={`/decks/${deck.slug}#discussion`}
            aria-label={`${deck.title} 댓글 보기`}
            className="inline-flex items-center gap-1 hover:text-[var(--brand)]"
          >
            <MessageCircle size={13} />
            {deck.comments}
          </Link>
        </div>
        <CopyDeckButton
          code={deck.deckCode}
          trackingSlug={deck.slug}
          variant="compact"
          label="복사"
          className="min-w-20"
        />
      </div>
    </article>
  );
}
