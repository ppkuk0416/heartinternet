"use client";

import { useState } from "react";
import { LoaderCircle, Send } from "lucide-react";

export function PublishDraftButton({ deckId }: { deckId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function publish() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/decks/${deckId}/publish`, {
        method: "POST",
      });
      const data = (await response.json()) as { slug?: string; error?: string };
      if (!response.ok || !data.slug) {
        throw new Error(data.error ?? "공개하지 못했습니다.");
      }
      window.location.assign(`/decks/${data.slug}?published=1`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "공개하지 못했습니다.",
      );
      setPending(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={publish}
        disabled={pending}
        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 text-xs font-extrabold text-white disabled:opacity-50"
      >
        {pending ? (
          <LoaderCircle size={14} className="animate-spin" />
        ) : (
          <Send size={14} />
        )}
        검토 후 공개
      </button>
      {error && (
        <p role="alert" className="mt-2 max-w-56 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
