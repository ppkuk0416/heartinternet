"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  CircleAlert,
  ClipboardPaste,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { trackProductEvent } from "@/components/analytics/product-event-tracker";
import { GuideStep } from "@/components/submit/guide-step";
import { EvidenceStep } from "@/components/submit/evidence-step";
import { ReviewStep } from "@/components/submit/review-step";
import type { EvidenceValues, GuideValues } from "@/components/submit/types";
import { DEMO_STANDARD_DECK_CODE } from "@/lib/demo-deck-code";

type PreviewCard = {
  dbfId: number;
  quantity: number;
  nameKo: string;
  manaCost: number;
  legendary: boolean;
  known: boolean;
};

type PreviewResponse = {
  canonicalCode: string;
  codeHash: string;
  format: string;
  heroClassSlug?: string;
  mainDeckCardCount: number;
  sideboardCardCount: number;
  publishable: boolean;
  issues: Array<{
    code: string;
    severity: "error" | "warning";
    message: string;
  }>;
  groupedCards: Array<{ manaCost: number; cards: PreviewCard[] }>;
  catalog: {
    source: "supabase" | "hearthstonejson";
    revision: string;
    warnings: string[];
  };
};

const CLASS_NAMES: Record<string, string> = {
  "death-knight": "죽음의 기사",
  "demon-hunter": "악마사냥꾼",
  druid: "드루이드",
  hunter: "사냥꾼",
  mage: "마법사",
  paladin: "성기사",
  priest: "사제",
  rogue: "도적",
  shaman: "주술사",
  warlock: "흑마법사",
  warrior: "전사",
};

export function DeckCodeStep({
  authenticated,
  authConfigured,
}: {
  authenticated: boolean;
  authConfigured: boolean;
}) {
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [guide, setGuide] = useState<GuideValues | null>(null);
  const [evidence, setEvidence] = useState<EvidenceValues | null>(null);

  useEffect(() => {
    const savedCode = sessionStorage.getItem("hearthdeck-submit-code");
    if (!savedCode) return;

    const timer = window.setTimeout(() => setInput(savedCode), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setPreview(null);

    try {
      const response = await fetch("/api/decks/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = (await response.json()) as PreviewResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "덱 코드를 확인하지 못했습니다.");
      }
      setPreview(data);
      sessionStorage.setItem("hearthdeck-submit-code", data.canonicalCode);
      trackProductEvent({
        eventName: "deck_preview_succeeded",
        metadata: {
          publishable: data.publishable,
          format: data.format,
          heroClassSlug: data.heroClassSlug ?? null,
          mainDeckCardCount: data.mainDeckCardCount,
          sideboardCardCount: data.sideboardCardCount,
          issueCount: data.issues.length,
          catalogSource: data.catalog.source,
        },
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "덱 코드를 확인하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  function useSample() {
    setInput(DEMO_STANDARD_DECK_CODE);
    setPreview(null);
    setError("");
  }

  function reset() {
    setInput("");
    setPreview(null);
    setError("");
    setGuide(null);
    setEvidence(null);
    setStep(1);
    sessionStorage.removeItem("hearthdeck-submit-code");
  }

  const className =
    preview?.heroClassSlug
      ? (CLASS_NAMES[preview.heroClassSlug] ?? preview.heroClassSlug)
      : "하스스톤";

  return (
    <>
      <SubmissionSteps activeStep={step} />
      {step === 2 && preview ? (
        <GuideStep
          className={className}
          initialValues={guide ?? undefined}
          onBack={() => setStep(1)}
          onContinue={(values) => {
            setGuide(values);
            setStep(3);
          }}
        />
      ) : step === 3 && preview && guide ? (
        <EvidenceStep
          initialValues={evidence ?? undefined}
          onBack={() => setStep(2)}
          onContinue={(values) => {
            setEvidence(values);
            setStep(4);
          }}
        />
      ) : step === 4 && preview && guide && evidence ? (
        <ReviewStep
          deckCode={preview.canonicalCode}
          className={className}
          cardCount={preview.mainDeckCardCount}
          guide={guide}
          evidence={evidence}
          onBack={() => setStep(3)}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="surface rounded-[1.5rem] p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-[var(--brand)]">
            <ClipboardPaste size={19} />
          </span>
          <div>
            <h2 className="text-xl font-black tracking-[-0.035em]">
              덱 코드를 붙여넣으세요
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              게임에서 복사한 전체 덱 목록도 그대로 붙여넣을 수 있습니다.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6">
          <label htmlFor="deck-code" className="text-sm font-extrabold">
            하스스톤 덱 코드
          </label>
          <textarea
            id="deck-code"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={"AAECA...\n\n또는 게임에서 복사한 덱 목록 전체"}
            rows={9}
            spellCheck={false}
            className="mt-2 w-full resize-y rounded-2xl border border-[var(--line)] bg-white p-4 font-mono text-sm leading-6 outline-none transition focus:border-[var(--brand)]"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={useSample}
              className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--brand)]"
            >
              <Sparkles size={15} />
              샘플 코드 사용
            </button>
            <span className="text-xs text-[var(--muted)]">
              원문 코드는 서버 로그에 기록하지 않습니다.
            </span>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"
            >
              <CircleAlert size={17} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending || input.trim().length < 20}
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? (
              <>
                <LoaderCircle size={17} className="animate-spin" />
                카드 데이터 확인 중
              </>
            ) : (
              <>
                덱 코드 분석
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
      </section>

      <section
        aria-live="polite"
        className="surface min-h-[32rem] rounded-[1.5rem] p-5 sm:p-7"
      >
        {preview ? (
          <PreviewResult
            preview={preview}
            onReset={reset}
            authenticated={authenticated}
            authConfigured={authConfigured}
            onContinue={() => setStep(2)}
          />
        ) : (
          <EmptyPreview />
        )}
      </section>
        </div>
      )}
    </>
  );
}

function SubmissionSteps({ activeStep }: { activeStep: number }) {
  const steps = ["덱 코드", "운영 가이드", "플레이 근거", "검토·게시"];
  return (
    <ol className="my-7 grid grid-cols-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-white sm:my-9">
      {steps.map((label, index) => {
        const number = index + 1;
        return (
          <li
            key={label}
            aria-current={number === activeStep ? "step" : undefined}
            className={`border-r border-[var(--line)] px-2 py-3 text-center text-[0.68rem] font-extrabold last:border-r-0 sm:px-4 sm:text-xs ${
              number === activeStep
                ? "bg-[var(--ink)] text-white"
                : number < activeStep
                  ? "bg-emerald-50 text-emerald-900"
                  : "text-[var(--muted)]"
            }`}
          >
            <span className="mr-1 hidden sm:inline">{number}.</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

function EmptyPreview() {
  return (
    <div className="grid min-h-[28rem] place-items-center text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#f2ece2] text-[var(--muted)]">
          <ShieldCheck size={25} />
        </span>
        <h2 className="mt-5 text-xl font-black">분석 결과가 여기에 표시됩니다</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          직업, 포맷, 카드 30장과 현재 정규전 게시 가능 여부를 먼저
          확인합니다.
        </p>
      </div>
    </div>
  );
}

function PreviewResult({
  preview,
  onReset,
  authenticated,
  authConfigured,
  onContinue,
}: {
  preview: PreviewResponse;
  onReset: () => void;
  authenticated: boolean;
  authConfigured: boolean;
  onContinue: () => void;
}) {
  const className = preview.heroClassSlug
    ? (CLASS_NAMES[preview.heroClassSlug] ?? preview.heroClassSlug)
    : "확인 필요";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${
              preview.publishable
                ? "bg-emerald-50 text-emerald-800"
                : "bg-amber-50 text-amber-900"
            }`}
          >
            {preview.publishable ? <Check size={13} /> : <CircleAlert size={13} />}
            {preview.publishable ? "코드 검증 완료" : "수정 또는 확인 필요"}
          </span>
          <h2 className="mt-3 text-2xl font-black tracking-[-0.045em]">
            {className} · {preview.mainDeckCardCount}장
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            정규전 · 카드 데이터{" "}
            {preview.catalog.source === "supabase" ? "동기화 DB" : "실시간 원본"}{" "}
            {preview.catalog.revision}
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-extrabold"
        >
          <RotateCcw size={13} />
          다른 코드
        </button>
      </div>

      {preview.issues.length > 0 && (
        <div className="mt-5 space-y-2">
          {preview.issues.map((issue) => (
            <div
              key={`${issue.code}-${issue.message}`}
              className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold leading-5 text-amber-950"
            >
              {issue.message}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 max-h-[25rem] space-y-4 overflow-y-auto pr-1">
        {preview.groupedCards.map((group) => (
          <div key={group.manaCost}>
            <div className="mb-1.5 text-xs font-black text-[var(--muted)]">
              {group.manaCost} 마나
            </div>
            <div className="space-y-1">
              {group.cards.map((card) => (
                <div
                  key={card.dbfId}
                  className="flex items-center justify-between rounded-lg bg-[#f4eee5] px-3 py-2 text-sm"
                >
                  <span className="font-bold">
                    {card.legendary && (
                      <span className="mr-1 text-[var(--brand)]">◆</span>
                    )}
                    {card.nameKo}
                  </span>
                  <span className="font-black text-[var(--muted)]">
                    ×{card.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {preview.publishable && authenticated ? (
        <button
          type="button"
          onClick={onContinue}
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] text-sm font-extrabold text-white"
        >
          운영 가이드 작성
          <ArrowRight size={17} />
        </button>
      ) : preview.publishable ? (
        <Link
          href="/login?next=/submit"
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--ink)] px-4 text-center text-sm font-extrabold text-white"
        >
          {authConfigured
            ? "로그인하고 운영 가이드 작성"
            : "로그인 설정 확인 후 계속"}
        </Link>
      ) : (
        <p className="mt-6 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          오류를 해결한 정규전 덱 코드만 다음 단계로 이동할 수 있습니다.
        </p>
      )}
    </div>
  );
}
