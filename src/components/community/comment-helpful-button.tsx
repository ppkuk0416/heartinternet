"use client";

import { LoaderCircle, ThumbsUp } from "lucide-react";
import { useState } from "react";

export function CommentHelpfulButton({
  commentId,
  authenticated,
  canReact,
  initialActive,
  initialCount,
  returnPath,
}: {
  commentId: string;
  authenticated: boolean;
  canReact: boolean;
  initialActive: boolean;
  initialCount: number;
  returnPath: string;
}) {
  const [active, setActive] = useState(initialActive);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    if (!authenticated) {
      window.location.assign(`/login?next=${encodeURIComponent(returnPath)}`);
      return;
    }
    if (!canReact) return;

    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/comments/${commentId}/helpful`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      const data = (await response.json()) as {
        active?: boolean;
        count?: number;
        error?: string;
      };
      if (!response.ok || data.active === undefined || data.count === undefined) {
        throw new Error(data.error ?? "도움됨을 저장하지 못했습니다.");
      }
      setActive(data.active);
      setCount(data.count);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "도움됨을 저장하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-pressed={active}
        disabled={pending || (authenticated && !canReact)}
        title={authenticated && !canReact ? "내 댓글에는 표시할 수 없습니다." : undefined}
        onClick={toggle}
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
          active
            ? "border-[var(--brand)] bg-orange-50 text-[var(--brand-dark)]"
            : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
        }`}
      >
        {pending ? <LoaderCircle size={12} className="animate-spin" /> : <ThumbsUp size={12} />}
        도움됨 {count.toLocaleString("ko-KR")}
      </button>
      {error && (
        <span role="alert" className="text-xs font-semibold text-red-700">
          {error}
        </span>
      )}
    </div>
  );
}
