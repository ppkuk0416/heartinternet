"use client";

import { type FormEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { GuideValues } from "@/components/submit/types";

type GuideStepProps = {
  className: string;
  onBack: () => void;
  initialValues?: GuideValues;
  onContinue: (values: GuideValues) => void;
};

export function GuideStep({
  className,
  onBack,
  initialValues,
  onContinue,
}: GuideStepProps) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onContinue({
      title: String(form.get("title") ?? ""),
      summary: String(form.get("summary") ?? ""),
      recommendedFor: String(form.get("recommendedFor") ?? ""),
      difficulty: String(form.get("difficulty")) as GuideValues["difficulty"],
      gamePlan: String(form.get("gamePlan") ?? ""),
      mulliganGuide: String(form.get("mulliganGuide") ?? ""),
      cardChoices: String(form.get("cardChoices") ?? ""),
      matchupNotes: String(form.get("matchupNotes") ?? ""),
    });
  }

  return (
    <section className="surface rounded-[1.5rem] p-5 sm:p-7">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--muted)]"
      >
        <ArrowLeft size={15} />
        코드 확인으로 돌아가기
      </button>
      <div className="mt-5">
        <span className="eyebrow">{className} deck guide</span>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">
          다른 유저의 선택을 돕는 핵심만 적어주세요
        </h2>
        <p className="section-copy mt-2">
          승률 숫자보다 누구에게 맞고 어떻게 굴리는 덱인지가 먼저 보이게
          구성합니다.
        </p>
      </div>

      <form onSubmit={submit} className="mt-7 grid gap-5">
        <Field
          label="덱 이름"
          name="title"
          defaultValue={initialValues?.title}
          minLength={3}
          maxLength={120}
          required
        />
        <TextArea
          label="한 줄 요약"
          name="summary"
          hint="이 덱의 핵심 장점과 플레이 감각을 20자 이상 설명해주세요."
          minLength={20}
          maxLength={320}
          rows={3}
          required
          defaultValue={initialValues?.summary}
        />
        <Field
          label="추천 대상"
          name="recommendedFor"
          placeholder="예: 복귀 유저 · 빠른 등반을 원하는 유저"
          minLength={3}
          maxLength={240}
          required
          defaultValue={initialValues?.recommendedFor}
        />

        <label>
          <span className="text-sm font-extrabold">운영 난이도</span>
          <select
            name="difficulty"
            defaultValue={initialValues?.difficulty ?? "medium"}
            className="mt-2 h-12 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-semibold outline-none focus:border-[var(--brand)]"
          >
            <option value="easy">쉬움</option>
            <option value="medium">보통</option>
            <option value="hard">어려움</option>
          </select>
        </label>

        <TextArea
          label="핵심 운영법"
          name="gamePlan"
          hint="초반, 중반, 승리 플랜을 20자 이상 적어주세요."
          minLength={20}
          maxLength={4000}
          rows={5}
          required
          defaultValue={initialValues?.gamePlan}
        />
        <TextArea
          label="멀리건"
          name="mulliganGuide"
          hint="항상 찾을 카드와 상대에 따라 달라지는 선택을 적어주세요."
          minLength={10}
          maxLength={3000}
          rows={4}
          required
          defaultValue={initialValues?.mulliganGuide}
        />
        <TextArea
          label="카드 선택 이유"
          name="cardChoices"
          maxLength={3000}
          rows={3}
          defaultValue={initialValues?.cardChoices}
        />
        <TextArea
          label="상성 메모"
          name="matchupNotes"
          maxLength={3000}
          rows={3}
          defaultValue={initialValues?.matchupNotes}
        />

        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] text-sm font-extrabold text-white transition hover:bg-[var(--brand)] disabled:opacity-50"
        >
          플레이 근거 입력
          <ArrowRight size={16} />
        </button>
      </form>
    </section>
  );
}

function Field({
  label,
  name,
  placeholder,
  ...inputProps
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
}) {
  return (
    <label>
      <span className="text-sm font-extrabold">{label}</span>
      <input
        name={name}
        placeholder={placeholder}
        defaultValue={inputProps.defaultValue}
        className="mt-2 h-12 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]"
        {...inputProps}
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  hint,
  ...textareaProps
}: {
  label: string;
  name: string;
  hint?: string;
  minLength?: number;
  maxLength?: number;
  rows?: number;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label>
      <span className="text-sm font-extrabold">{label}</span>
      {hint && <span className="ml-2 text-xs text-[var(--muted)]">{hint}</span>}
      <textarea
        name={name}
        className="mt-2 w-full resize-y rounded-xl border border-[var(--line)] bg-white p-3 text-sm leading-6 outline-none focus:border-[var(--brand)]"
        {...textareaProps}
      />
    </label>
  );
}
