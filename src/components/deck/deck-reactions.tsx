"use client";

import { Bookmark, LoaderCircle, ThumbsUp } from "lucide-react";
import { useState } from "react";

type ReactionKind = "recommendation" | "favorite";

export function DeckReactions({
  slug,
  authenticated,
  initialRecommended,
  initialFavorited,
  initialRecommendationCount,
  initialFavoriteCount,
}: {
  slug: string;
  authenticated: boolean;
  initialRecommended: boolean;
  initialFavorited: boolean;
  initialRecommendationCount: number;
  initialFavoriteCount: number;
}) {
  const [recommended, setRecommended] = useState(initialRecommended);
  const [favorited, setFavorited] = useState(initialFavorited);
  const [recommendationCount, setRecommendationCount] = useState(
    initialRecommendationCount,
  );
  const [favoriteCount, setFavoriteCount] = useState(initialFavoriteCount);
  const [pending, setPending] = useState<ReactionKind | null>(null);
  const [error, setError] = useState("");

  async function toggle(kind: ReactionKind) {
    if (!authenticated) {
      window.location.assign(`/login?next=${encodeURIComponent(`/decks/${slug}`)}`);
      return;
    }

    const current = kind === "recommendation" ? recommended : favorited;
    setPending(kind);
    setError("");
    try {
      const response = await fetch(
        `/api/public-decks/${slug}/reactions/${kind}`,
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !current }),
        },
      );
      const data = (await response.json()) as {
        active?: boolean;
        count?: number;
        error?: string;
      };
      if (!response.ok || data.active === undefined || data.count === undefined) {
        throw new Error(data.error ?? "반응을 저장하지 못했습니다.");
      }
      if (kind === "recommendation") {
        setRecommended(data.active);
        setRecommendationCount(data.count);
      } else {
        setFavorited(data.active);
        setFavoriteCount(data.count);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "반응을 저장하지 못했습니다.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-2">
        <ReactionButton
          label="추천"
          count={recommendationCount}
          active={recommended}
          pending={pending === "recommendation"}
          icon={<ThumbsUp size={15} />}
          onClick={() => toggle("recommendation")}
        />
        <ReactionButton
          label="저장"
          count={favoriteCount}
          active={favorited}
          pending={pending === "favorite"}
          icon={<Bookmark size={15} />}
          onClick={() => toggle("favorite")}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-center text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function ReactionButton({
  label,
  count,
  active,
  pending,
  icon,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  pending: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={pending}
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border text-xs font-extrabold transition disabled:opacity-60 ${
        active
          ? "border-[var(--brand)] bg-orange-50 text-[var(--brand-dark)]"
          : "border-[var(--line)] bg-white text-[var(--ink)]"
      }`}
    >
      {pending ? <LoaderCircle size={15} className="animate-spin" /> : icon}
      {label} {count.toLocaleString("ko-KR")}
    </button>
  );
}
