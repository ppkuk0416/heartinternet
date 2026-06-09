"use client";

import Link from "next/link";
import { ExternalLink, LoaderCircle, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ModerationReport } from "@/server/repositories/moderation-reports";

type Decision = "reviewing" | "dismissed" | "hidden";

export function ReportReviewCard({ report }: { report: ModerationReport }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<Decision | null>(null);
  const [error, setError] = useState("");

  async function decide(decision: Decision) {
    setPending(decision);
    setError("");
    try {
      const response = await fetch(`/api/admin/reports/${report.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "신고를 처리하지 못했습니다.");
      }
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "신고를 처리하지 못했습니다.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <article className="surface rounded-2xl p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-extrabold text-red-800">
            <ShieldAlert size={13} />
            {report.reason}
          </span>
          <h2 className="mt-3 text-lg font-black">
            {targetTypeLabel(report.targetType)}
          </h2>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-[var(--ink)]">
            {report.targetLabel}
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            신고자 {report.reporterName} · {report.createdAt}
          </p>
          {report.details && (
            <p className="mt-3 rounded-xl bg-[#faf7f1] p-3 text-sm leading-6 text-[#514b44]">
              {report.details}
            </p>
          )}
          {report.targetHref && (
            <Link
              href={report.targetHref}
              className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-[var(--brand)]"
            >
              대상 보기
              <ExternalLink size={12} />
            </Link>
          )}
        </div>

        <div className="w-full shrink-0 md:w-72">
          <label className="text-xs font-extrabold">
            처리 사유
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              minLength={3}
              maxLength={1000}
              placeholder="감사 로그에 남을 사유를 입력하세요."
              className="mt-2 min-h-24 w-full resize-y rounded-xl border border-[var(--line)] bg-white p-3 text-sm outline-none focus:border-[var(--brand)]"
            />
          </label>
          {error && (
            <p role="alert" className="mt-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <DecisionButton
              label="검토 중"
              active={pending === "reviewing"}
              disabled={note.trim().length < 3 || Boolean(pending)}
              onClick={() => decide("reviewing")}
            />
            <DecisionButton
              label="기각"
              active={pending === "dismissed"}
              disabled={note.trim().length < 3 || Boolean(pending)}
              onClick={() => decide("dismissed")}
            />
            <DecisionButton
              label="숨김"
              active={pending === "hidden"}
              danger
              disabled={note.trim().length < 3 || Boolean(pending)}
              onClick={() => decide("hidden")}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function DecisionButton({
  label,
  active,
  disabled,
  danger = false,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center justify-center gap-1 rounded-xl text-xs font-extrabold text-white disabled:opacity-40 ${
        danger ? "bg-red-700" : "bg-[var(--ink)]"
      }`}
    >
      {active && <LoaderCircle size={13} className="animate-spin" />}
      {label}
    </button>
  );
}

function targetTypeLabel(type: ModerationReport["targetType"]) {
  return (
    {
      deck: "덱 신고",
      comment: "댓글 신고",
      user: "유저 신고",
    }[type] ?? "신고"
  );
}
