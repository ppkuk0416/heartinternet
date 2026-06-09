"use client";

import { BookmarkX, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeckCard } from "@/components/deck/deck-card";
import type { Deck } from "@/lib/types";

export function FavoriteDeckCard({ deck }: { deck: Deck }) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function removeFavorite() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(
        `/api/public-decks/${deck.slug}/reactions/favorite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: false }),
        },
      );
      const data = (await response.json()) as {
        active?: boolean;
        error?: string;
      };
      if (!response.ok || data.active !== false) {
        throw new Error(data.error ?? "저장을 해제하지 못했습니다.");
      }
      setVisible(false);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "저장을 해제하지 못했습니다.",
      );
      setPending(false);
    }
  }

  if (!visible) return null;

  return (
    <div>
      <DeckCard deck={deck} />
      <button
        type="button"
        onClick={removeFavorite}
        disabled={pending}
        className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-white text-xs font-extrabold text-[var(--muted)] transition hover:border-red-200 hover:text-red-700 disabled:opacity-50"
      >
        {pending ? (
          <LoaderCircle size={14} className="animate-spin" />
        ) : (
          <BookmarkX size={14} />
        )}
        저장 해제
      </button>
      {error && (
        <p role="alert" className="mt-2 text-center text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
