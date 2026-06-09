"use client";

import { CheckCircle2, LoaderCircle, Save, SearchCheck } from "lucide-react";
import { useState } from "react";

type OfficialEventSummary = {
  eventVerification: {
    newsId: string;
    officialUrl: string;
    title: string;
    lastUpdatedAt?: string;
    category?: string;
  };
  source: {
    slug: string;
    name: string;
    sourceType: string;
    trustTier: number;
  };
  providerRevision?: string;
  candidates: number;
  fullyValidated: number;
  validationFailed: number;
  codeProvenance: "operator_manifest";
  warningCount: number;
  warnings: string[];
};

type ImportResult = {
  runId?: string;
  status?: string;
  inserted?: number;
  updated?: number;
  warningCount?: number;
};

type ApiResponse = {
  mode?: "dry-run" | "write";
  summary?: OfficialEventSummary;
  result?: ImportResult;
  error?: string;
};

export function OfficialEventImportPanel({
  exampleManifest,
}: {
  exampleManifest: string;
}) {
  const [manifestText, setManifestText] = useState(exampleManifest);
  const [summary, setSummary] = useState<OfficialEventSummary | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [pendingMode, setPendingMode] = useState<"dry-run" | "write" | null>(
    null,
  );

  const canWrite =
    summary !== null &&
    summary.candidates > 0 &&
    summary.fullyValidated === summary.candidates &&
    summary.validationFailed === 0 &&
    pendingMode === null;

  async function submit(write: boolean) {
    setPendingMode(write ? "write" : "dry-run");
    setError("");
    setResult(null);
    try {
      const manifest = JSON.parse(manifestText) as unknown;
      const response = await fetch("/api/admin/official-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifest, write }),
      });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.summary) {
        throw new Error(payload.error ?? "공식 이벤트 덱을 처리하지 못했습니다.");
      }
      setSummary(payload.summary);
      setResult(payload.result ?? null);
    } catch (requestError) {
      setError(
        requestError instanceof SyntaxError
          ? "JSON 형식을 먼저 확인해주세요."
          : requestError instanceof Error
            ? requestError.message
            : "공식 이벤트 덱을 처리하지 못했습니다.",
      );
    } finally {
      setPendingMode(null);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="surface rounded-[1.5rem] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-xl font-black tracking-[-0.035em]">
              공식 이벤트 매니페스트
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              블리자드 공식 뉴스 ID와 운영자가 확인한 선수별 덱 코드를 넣습니다.
              저장 전에는 뉴스 출처, 덱 코드, 현재 카드 카탈로그 검증을 모두
              통과해야 합니다.
            </p>
          </div>
          {summary && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800">
              <CheckCircle2 size={14} />
              검증 완료
            </span>
          )}
        </div>

        <label
          htmlFor="official-event-manifest"
          className="mt-5 block text-xs font-extrabold text-[var(--muted)]"
        >
          JSON 입력
        </label>
        <textarea
          id="official-event-manifest"
          value={manifestText}
          onChange={(event) => {
            setManifestText(event.target.value);
            setSummary(null);
            setResult(null);
          }}
          spellCheck={false}
          className="mt-2 min-h-[32rem] w-full resize-y rounded-2xl border border-[var(--line)] bg-[#17130f] p-4 font-mono text-xs leading-5 text-[#f8efe1] outline-none focus:border-[var(--brand)]"
        />

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={pendingMode !== null}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-extrabold disabled:opacity-45"
          >
            {pendingMode === "dry-run" ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <SearchCheck size={16} />
            )}
            사전 검증
          </button>
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={!canWrite}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-extrabold text-white disabled:opacity-45"
          >
            {pendingMode === "write" ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            검증 후 후보 큐에 저장
          </button>
        </div>
      </section>

      <aside className="surface h-fit rounded-[1.5rem] p-5 sm:p-6">
        <h2 className="text-lg font-black tracking-[-0.035em]">검증 결과</h2>
        {summary ? (
          <div className="mt-4 space-y-4 text-sm">
            <SummaryRow label="공식 뉴스" value={summary.eventVerification.title} />
            <SummaryRow
              label="뉴스 ID"
              value={summary.eventVerification.newsId}
            />
            <SummaryRow
              label="출처"
              value={`${summary.source.name} · T${summary.source.trustTier}`}
            />
            <SummaryRow
              label="후보 수"
              value={`${summary.candidates}개 중 ${summary.fullyValidated}개 코드 검증`}
            />
            <SummaryRow
              label="프로비넌스"
              value="운영자 매니페스트 코드"
            />
            {summary.providerRevision && (
              <SummaryRow label="리비전" value={summary.providerRevision} />
            )}
            <div className="rounded-2xl bg-[#f5efe6] p-4">
              <p className="text-xs font-extrabold text-[var(--muted)]">
                저장 가능 여부
              </p>
              <p className="mt-1 font-black">
                {summary.fullyValidated === summary.candidates &&
                summary.validationFailed === 0
                  ? "가능합니다. 후보 큐에 안전하게 저장할 수 있습니다."
                  : "아직 불가합니다. 실패한 덱 코드를 먼저 교체해야 합니다."}
              </p>
            </div>
            {summary.warnings.length > 0 && (
              <div>
                <p className="text-xs font-extrabold text-[var(--muted)]">
                  경고 {summary.warningCount}개
                </p>
                <ul className="mt-2 space-y-2 text-xs leading-5 text-amber-900">
                  {summary.warnings.slice(0, 12).map((warning, index) => (
                    <li key={`${warning}-${index}`} className="rounded-lg bg-amber-50 p-2">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
                <p className="text-xs font-extrabold">저장 완료</p>
                <p className="mt-1 font-black">
                  신규 {result.inserted ?? 0}개 · 갱신 {result.updated ?? 0}개
                </p>
                {result.runId && (
                  <p className="mt-1 break-all text-xs">run {result.runId}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            먼저 사전 검증을 실행하세요. 저장 버튼은 모든 후보 덱 코드가 현재
            카드 카탈로그 기준으로 유효할 때만 열립니다.
          </p>
        )}
      </aside>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-extrabold text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}
