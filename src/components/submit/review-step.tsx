"use client";

import { useState } from "react";
import { ArrowLeft, Eye, LoaderCircle, Save, Send } from "lucide-react";
import { trackProductEvent } from "@/components/analytics/product-event-tracker";
import type { EvidenceValues, GuideValues } from "@/components/submit/types";
import { calculateRecord } from "@/components/submit/evidence-step";

export function ReviewStep({
  deckCode,
  className,
  cardCount,
  guide,
  evidence,
  onBack,
}: {
  deckCode: string;
  className: string;
  cardCount: number;
  guide: GuideValues;
  evidence: EvidenceValues;
  onBack: () => void;
}) {
  const [pending, setPending] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState("");
  const record = calculateRecord(
    evidence.wins?.toString() ?? "",
    evidence.losses?.toString() ?? "",
  );

  async function save(intent: "draft" | "publish") {
    setPending(intent);
    setError("");
    try {
      const response = await fetch("/api/decks/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deckCode, ...guide, ...evidence, intent }),
      });
      const data = (await response.json()) as {
        deckId?: string;
        slug?: string;
        status?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "저장하지 못했습니다.");
      trackProductEvent({
        eventName: "deck_draft_created",
        deckSlug: data.slug,
        metadata: {
          intent,
          status: data.status ?? null,
          className,
          sourceType: evidence.sourceType,
          hasSourceUrl: Boolean(evidence.sourceUrl),
          hasRecord: Boolean(record),
        },
      });
      sessionStorage.removeItem("hearthdeck-submit-code");
      window.location.assign(
        intent === "publish" && data.slug
          ? `/decks/${data.slug}?published=1`
          : `/my/decks?created=${data.deckId ?? ""}`,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "저장하지 못했습니다.",
      );
      setPending(null);
    }
  }

  return (
    <section className="surface rounded-[1.5rem] p-5 sm:p-7">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--muted)]"
      >
        <ArrowLeft size={15} />
        플레이 근거로 돌아가기
      </button>
      <div className="mt-5">
        <span className="eyebrow">
          <Eye size={14} />
          Final review
        </span>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">
          {guide.title}
        </h2>
        <p className="mt-2 text-sm font-bold text-[var(--muted)]">
          {className} · 정규전 · {cardCount}장
        </p>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        <ReviewCard title="추천 대상" content={guide.recommendedFor} />
        <ReviewCard
          title="근거 표시"
          content={evidence.sourceUrl ? "출처 연결" : "작성자 입력"}
        />
        <ReviewCard title="한 줄 요약" content={guide.summary} wide />
        <ReviewCard title="핵심 운영법" content={guide.gamePlan} wide />
        <ReviewCard title="멀리건" content={guide.mulliganGuide} wide />
        <ReviewCard
          title="플레이 기록"
          content={
            record
              ? `${evidence.wins}승 ${evidence.losses}패 · ${record.winRate}%`
              : "기록 입력 없음"
          }
        />
        <ReviewCard
          title="출처"
          content={
            evidence.sourceName ||
            evidence.sourceUrl ||
            sourceTypeLabel(evidence.sourceType)
          }
        />
      </div>

      <div className="mt-6 rounded-xl bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-950">
        공개하면 누구나 덱을 찾고 코드를 복사할 수 있습니다. 승률과 등급은
        플랫폼 검증 기록이 아니라 입력한 근거 수준에 맞춰 표시됩니다.
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => save("draft")}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white text-sm font-extrabold disabled:opacity-50"
        >
          {pending === "draft" ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          초안으로 저장
        </button>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => save("publish")}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] text-sm font-extrabold text-white disabled:opacity-50"
        >
          {pending === "publish" ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          지금 공개
        </button>
      </div>
    </section>
  );
}

function ReviewCard({
  title,
  content,
  wide = false,
}: {
  title: string;
  content: string;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-xl bg-[#f4eee5] p-4 ${wide ? "md:col-span-2" : ""}`}>
      <div className="text-xs font-extrabold text-[var(--muted)]">{title}</div>
      <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6">
        {content}
      </p>
    </div>
  );
}

function sourceTypeLabel(sourceType: EvidenceValues["sourceType"]) {
  return {
    community: "커뮤니티 덱",
    ranked: "등급전·랭커 덱",
    creator: "콘텐츠 제작자 덱",
    tournament: "대회 덱",
    external_stats: "외부 통계 덱",
  }[sourceType];
}
