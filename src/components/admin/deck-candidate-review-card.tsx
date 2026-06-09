"use client";

import {
  BadgeCheck,
  Ban,
  ExternalLink,
  Link2,
  LoaderCircle,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CopyDeckButton } from "@/components/deck/copy-deck-button";
import { CandidateDraftPanel } from "@/components/admin/candidate-draft-panel";
import type {
  DeckCandidateQueueItem,
  DeckLinkTarget,
} from "@/server/repositories/deck-candidates";

type Decision = "approved" | "linked" | "duplicate" | "rejected";

export function DeckCandidateReviewCard({
  candidate,
  linkTargets,
}: {
  candidate: DeckCandidateQueueItem;
  linkTargets: DeckLinkTarget[];
}) {
  const exactMatch = useMemo(
    () =>
      candidate.codeHash
        ? linkTargets.find((target) => target.codeHash === candidate.codeHash)
        : undefined,
    [candidate.codeHash, linkTargets],
  );
  const [targetDeckId, setTargetDeckId] = useState(exactMatch?.id ?? "");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<Decision | null>(null);
  const [error, setError] = useState("");
  const hasValidatedCode = candidate.codeValidationStatus === "valid";

  async function review(decision: Decision) {
    setPending(decision);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/deck-candidates/${candidate.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            targetDeckId: targetDeckId || null,
            note: note || null,
          }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "검토 결과를 저장하지 못했습니다.");
      window.location.reload();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "검토 결과를 저장하지 못했습니다.",
      );
      setPending(null);
    }
  }

  return (
    <article className="surface overflow-hidden rounded-[1.4rem]">
      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:p-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge score={candidate.priorityScore} />
            <span className="rounded-full bg-[#f2ece2] px-2.5 py-1 text-xs font-extrabold text-[var(--muted)]">
              {statusLabel(candidate.status)}
            </span>
            {candidate.currentPatch && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-800">
                현재 패치
              </span>
            )}
          </div>

          <h2 className="mt-4 text-xl font-black tracking-[-0.035em]">
            {candidate.title || candidate.eventName || "제목 미확인 후보 덱"}
          </h2>
          <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
            {[candidate.playerName, candidate.className, candidate.patchVersion]
              .filter(Boolean)
              .join(" · ") || "선수·직업·패치 정보 미확인"}
          </p>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <Meta label="출처">
              {candidate.source.name} · 신뢰도 T{candidate.source.trustTier}
            </Meta>
            <Meta label="관측">
              {candidate.observedCount}회 · 최근 {formatDate(candidate.lastSeenAt)}
            </Meta>
            <Meta label="성적">
              {candidate.wins !== null && candidate.losses !== null
                ? `${candidate.wins}승 ${candidate.losses}패`
                : candidate.claimedRank || "기록 없음"}
            </Meta>
            <Meta label="형식">{formatLabel(candidate.format)}</Meta>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={candidate.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-white px-3 text-xs font-extrabold transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              <ExternalLink size={13} />
              원문 확인
            </a>
            {candidate.rawDeckCode && (
              <CopyDeckButton
                code={candidate.rawDeckCode}
                variant="compact"
                label="후보 코드 복사"
              />
            )}
          </div>
        </div>

        {candidate.status === "approved" ? (
          <CandidateDraftPanel candidate={candidate} />
        ) : (
        <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
          <label className="text-xs font-extrabold text-[var(--muted)]" htmlFor={`target-${candidate.id}`}>
            연결할 공개 덱
          </label>
          <select
            id={`target-${candidate.id}`}
            value={targetDeckId}
            onChange={(event) => setTargetDeckId(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-bold"
          >
            <option value="">선택하지 않음</option>
            {linkTargets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.codeHash === candidate.codeHash ? "[코드 일치] " : ""}
                {target.className} · {target.title}
              </option>
            ))}
          </select>
          {exactMatch && (
            <p className="mt-2 text-xs font-bold text-emerald-700">
              동일한 코드의 공개 덱을 자동으로 찾았습니다.
            </p>
          )}

          <label className="mt-4 block text-xs font-extrabold text-[var(--muted)]" htmlFor={`note-${candidate.id}`}>
            검토 메모
          </label>
          <textarea
            id={`note-${candidate.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            placeholder="출처 확인 내용 또는 반려 사유"
            className="mt-2 min-h-24 w-full resize-y rounded-xl border border-[var(--line)] bg-white p-3 text-sm"
          />

          {!hasValidatedCode && (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">
              {candidate.rawDeckCode
                ? "덱 문자열은 있지만 현재 카드 카탈로그 전체 검증을 통과하지 못했습니다."
                : "덱 코드가 없어 승인·연결할 수 없습니다."}{" "}
              재수집하거나 중복·반려로 분류하세요.
            </p>
          )}
          {candidate.codeValidationIssues.length > 0 && (
            <ul className="mt-3 grid gap-1 text-xs font-semibold text-red-700">
              {candidate.codeValidationIssues.slice(0, 3).map((issue) => (
                <li key={`${issue.code}:${issue.message}`}>{issue.message}</li>
              ))}
            </ul>
          )}
          {error && (
            <p role="alert" className="mt-3 text-xs font-bold text-red-700">
              {error}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <ActionButton
              label="검증 승인"
              icon={BadgeCheck}
              onClick={() => review("approved")}
              pending={pending === "approved"}
              disabled={!hasValidatedCode || pending !== null}
            />
            <ActionButton
              label="공개 덱 연결"
              icon={Link2}
              onClick={() => review("linked")}
              pending={pending === "linked"}
              disabled={!hasValidatedCode || !targetDeckId || pending !== null}
              primary
            />
            <ActionButton
              label="중복 처리"
              icon={Trophy}
              onClick={() => review("duplicate")}
              pending={pending === "duplicate"}
              disabled={pending !== null}
            />
            <ActionButton
              label="반려"
              icon={Ban}
              onClick={() => review("rejected")}
              pending={pending === "rejected"}
              disabled={!note.trim() || pending !== null}
              danger
            />
          </div>
        </div>
        )}
      </div>
    </article>
  );
}

function PriorityBadge({ score }: { score: number }) {
  const className =
    score >= 80
      ? "bg-red-50 text-red-800"
      : score >= 60
        ? "bg-amber-50 text-amber-900"
        : "bg-stone-100 text-stone-700";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${className}`}>
      우선순위 {score}
    </span>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-extrabold text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 font-bold">{children}</dd>
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  pending,
  disabled,
  primary = false,
  danger = false,
}: {
  label: string;
  icon: typeof BadgeCheck;
  onClick: () => void;
  pending: boolean;
  disabled: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  const color = primary
    ? "bg-[var(--brand)] text-white"
    : danger
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-[var(--line)] bg-white text-[var(--ink)]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-transparent px-2 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-45 ${color}`}
    >
      {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Icon size={14} />}
      {label}
    </button>
  );
}

function statusLabel(status: DeckCandidateQueueItem["status"]) {
  return {
    ready_for_review: "검토 가능",
    needs_validation: "코드 검증 필요",
    needs_code: "코드 필요",
    reviewing: "검토 중",
    discovered: "신규 발견",
    approved: "초안 생성 대기",
  }[status];
}

function formatLabel(format: string) {
  return { standard: "정규", wild: "야생", twist: "변칙" }[format] ?? format;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
