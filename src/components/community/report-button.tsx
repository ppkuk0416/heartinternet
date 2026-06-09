"use client";

import { Flag, LoaderCircle, X } from "lucide-react";
import { useState, type FormEvent } from "react";

type ReportTarget =
  | { targetType: "deck"; deckSlug: string }
  | { targetType: "comment"; targetId: string };

const REASONS = [
  { value: "spam", label: "스팸·광고" },
  { value: "abuse", label: "욕설·괴롭힘" },
  { value: "false_claim", label: "허위 성적·정보" },
  { value: "copyright", label: "저작권·출처 문제" },
  { value: "other", label: "기타" },
] as const;

export function ReportButton({
  target,
  authenticated,
  returnPath,
  label = "신고",
}: {
  target: ReportTarget;
  authenticated: boolean;
  returnPath: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] =
    useState<(typeof REASONS)[number]["value"]>("spam");
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function startReport() {
    if (!authenticated) {
      window.location.assign(`/login?next=${encodeURIComponent(returnPath)}`);
      return;
    }
    setOpen(true);
    setMessage("");
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, reason, details }),
      });
      const data = (await response.json()) as {
        reported?: boolean;
        error?: string;
      };
      if (!response.ok || !data.reported) {
        throw new Error(data.error ?? "신고를 접수하지 못했습니다.");
      }
      setOpen(false);
      setMessage("신고를 접수했습니다.");
      setDetails("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "신고를 접수하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      {!open && !message && (
        <button
          type="button"
          onClick={startReport}
          className="inline-flex items-center gap-1 text-xs font-bold text-[var(--muted)] hover:text-red-700"
        >
          <Flag size={12} />
          {label}
        </button>
      )}
      {message && (
        <span role="status" className="text-xs font-semibold text-emerald-800">
          {message}
        </span>
      )}
      {open && (
        <form
          onSubmit={submit}
          className="mt-2 rounded-xl border border-[var(--line)] bg-[#faf7f1] p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-extrabold">
              신고 이유
              <select
                value={reason}
                onChange={(event) =>
                  setReason(
                    event.target.value as (typeof REASONS)[number]["value"],
                  )
                }
                className="ml-2 rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
              >
                {REASONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              aria-label="신고 닫기"
              onClick={() => setOpen(false)}
              className="text-[var(--muted)]"
            >
              <X size={15} />
            </button>
          </div>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            maxLength={2000}
            placeholder="운영진이 확인할 내용을 선택적으로 적어주세요."
            className="mt-3 min-h-20 w-full resize-y rounded-lg border border-[var(--line)] bg-white p-2.5 text-xs outline-none focus:border-[var(--brand)]"
          />
          {error && (
            <p role="alert" className="mt-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--ink)] px-3 text-xs font-extrabold text-white disabled:opacity-50"
          >
            {pending && <LoaderCircle size={13} className="animate-spin" />}
            신고 접수
          </button>
        </form>
      )}
    </div>
  );
}
