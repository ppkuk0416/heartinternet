"use client";

import { LoaderCircle, MessageCircle, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CommentHelpfulButton } from "@/components/community/comment-helpful-button";
import { ReportButton } from "@/components/community/report-button";
import type { PublicDeckComment } from "@/server/repositories/deck-comments";

export function DeckDiscussion({
  slug,
  comments,
  authenticated,
  unavailable,
}: {
  slug: string;
  comments: PublicDeckComment[];
  authenticated: boolean;
  unavailable: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const returnPath = `/decks/${slug}#discussion`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authenticated) {
      window.location.assign(`/login?next=${encodeURIComponent(returnPath)}`);
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/public-decks/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !data.id) {
        throw new Error(data.error ?? "댓글을 저장하지 못했습니다.");
      }
      setBody("");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "댓글을 저장하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  async function deleteComment(id: string) {
    setDeletingId(id);
    setError("");
    try {
      const response = await fetch(`/api/comments/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "댓글을 삭제하지 못했습니다.");
      }
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "댓글을 삭제하지 못했습니다.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section id="discussion" className="surface rounded-[1.5rem] p-5 sm:p-7">
      <div className="flex items-center justify-between">
        <div>
          <span className="eyebrow">Discussion</span>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">
            댓글 {comments.length}
          </h2>
        </div>
        <MessageCircle className="text-[var(--brand)]" />
      </div>

      {unavailable ? (
        <div className="mt-6 rounded-xl border border-dashed border-[var(--line)] bg-[#faf7f1] px-5 py-6 text-center">
          <p className="text-sm font-bold">댓글 기능을 불러오지 못했습니다.</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Supabase 연결 환경에서 덱 사용 경험을 남길 수 있습니다.
          </p>
        </div>
      ) : (
        <>
          <form onSubmit={submit} className="mt-6">
            <label htmlFor="deck-comment" className="text-sm font-extrabold">
              사용 경험이나 교체 카드 의견
            </label>
            <textarea
              id="deck-comment"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              minLength={2}
              maxLength={2000}
              required
              placeholder="실제로 플레이하며 도움이 된 운영 팁을 남겨주세요."
              className="mt-2 min-h-24 w-full resize-y rounded-xl border border-[var(--line)] bg-white p-3 text-sm outline-none focus:border-[var(--brand)]"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-[var(--muted)]">
                덱과 무관한 글, 욕설, 허위 정보는 숨김 처리될 수 있습니다.
              </span>
              <button
                type="submit"
                disabled={pending || body.trim().length < 2}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--ink)] px-3 text-xs font-extrabold text-white disabled:opacity-40"
              >
                {pending ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {authenticated ? "댓글 남기기" : "로그인하고 댓글"}
              </button>
            </div>
          </form>

          {error && (
            <p role="alert" className="mt-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          {comments.length > 0 ? (
            <div className="mt-7 divide-y divide-[var(--line)] border-t border-[var(--line)]">
              {comments.map((comment) => (
                <article key={comment.id} className="py-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-extrabold">
                        {comment.authorName}
                      </span>
                      <span className="ml-2 text-xs text-[var(--muted)]">
                        {comment.createdAt}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {comment.canDelete && (
                        <button
                          type="button"
                          onClick={() => deleteComment(comment.id)}
                          disabled={deletingId === comment.id}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[var(--muted)] hover:text-red-700"
                        >
                          {deletingId === comment.id ? (
                            <LoaderCircle size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                          삭제
                        </button>
                      )}
                      <ReportButton
                        target={{
                          targetType: "comment",
                          targetId: comment.id,
                        }}
                        authenticated={authenticated}
                        returnPath={returnPath}
                      />
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#514b44]">
                    {comment.body}
                  </p>
                  <CommentHelpfulButton
                    commentId={comment.id}
                    authenticated={authenticated}
                    canReact={comment.canReact}
                    initialActive={comment.helpful}
                    initialCount={comment.helpfulCount}
                    returnPath={returnPath}
                  />
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-xl bg-[#faf7f1] px-5 py-6 text-center">
              <p className="text-sm font-bold">첫 사용 경험을 남겨주세요.</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                교체 카드와 실제 상성 경험이 다음 유저의 선택을 돕습니다.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
