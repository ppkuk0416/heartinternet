"use client";

import { FilePenLine, LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { DeckCandidateQueueItem } from "@/server/repositories/deck-candidates";

export function CandidateDraftPanel({
  candidate,
}: {
  candidate: DeckCandidateQueueItem;
}) {
  const [title, setTitle] = useState(
    candidate.title || `${candidate.className ?? "하스스톤"} 최신 덱`,
  );
  const [summary, setSummary] = useState(defaultSummary(candidate));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function createDraft() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/deck-candidates/${candidate.id}/draft`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, summary }),
        },
      );
      const result = (await response.json()) as {
        deckId?: string;
        error?: string;
      };
      if (!response.ok || !result.deckId) {
        throw new Error(result.error ?? "큐레이션 초안을 만들지 못했습니다.");
      }
      window.location.assign(`/my/decks/${result.deckId}/edit?created=1`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "큐레이션 초안을 만들지 못했습니다.",
      );
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
      <p className="text-xs font-extrabold text-emerald-900">승인 완료 · 신규 초안 생성</p>
      <label
        className="mt-4 block text-xs font-extrabold text-[var(--muted)]"
        htmlFor={`draft-title-${candidate.id}`}
      >
        큐레이션 제목
      </label>
      <input
        id={`draft-title-${candidate.id}`}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        minLength={3}
        maxLength={120}
        className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-bold"
      />
      <label
        className="mt-4 block text-xs font-extrabold text-[var(--muted)]"
        htmlFor={`draft-summary-${candidate.id}`}
      >
        초기 요약
      </label>
      <textarea
        id={`draft-summary-${candidate.id}`}
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
        maxLength={320}
        className="mt-2 min-h-24 w-full resize-y rounded-xl border border-[var(--line)] bg-white p-3 text-sm"
      />
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
        코드와 출처는 후보에서 자동 저장됩니다. 생성 후 운영법과 멀리건을
        완성해야 공개할 수 있습니다.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-xs font-bold text-red-700">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={createDraft}
        disabled={pending || title.trim().length < 3}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-extrabold text-white disabled:opacity-45"
      >
        {pending ? (
          <LoaderCircle size={16} className="animate-spin" />
        ) : (
          <FilePenLine size={16} />
        )}
        초안 만들고 가이드 작성
      </button>
    </div>
  );
}

function defaultSummary(candidate: DeckCandidateQueueItem) {
  const owner = candidate.playerName || "커뮤니티 유저";
  const source = candidate.source.name;
  return `${owner}가 ${source}에 공유한 현재 패치 ${candidate.className ?? "정규전"} 덱을 운영진이 검토 중입니다.`;
}
