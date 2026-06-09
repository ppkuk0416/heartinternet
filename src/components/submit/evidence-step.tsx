"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, BarChart3, Link2 } from "lucide-react";
import type { EvidenceValues } from "@/components/submit/types";

export function EvidenceStep({
  initialValues,
  onBack,
  onContinue,
}: {
  initialValues?: EvidenceValues;
  onBack: () => void;
  onContinue: (values: EvidenceValues) => void;
}) {
  const [wins, setWins] = useState(initialValues?.wins?.toString() ?? "");
  const [losses, setLosses] = useState(initialValues?.losses?.toString() ?? "");
  const [error, setError] = useState("");
  const record = useMemo(() => calculateRecord(wins, losses), [wins, losses]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const playedFrom = String(form.get("playedFrom") ?? "");
    const playedTo = String(form.get("playedTo") ?? "");
    if ((wins === "") !== (losses === "")) {
      setError("승수와 패수는 함께 입력해주세요.");
      return;
    }
    if (playedFrom && playedTo && playedTo < playedFrom) {
      setError("플레이 종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }
    setError("");
    onContinue({
      sourceType: String(form.get("sourceType")) as EvidenceValues["sourceType"],
      sourceUrl: String(form.get("sourceUrl") ?? ""),
      sourceName: String(form.get("sourceName") ?? ""),
      claimedRank: String(form.get("claimedRank") ?? ""),
      wins: wins === "" ? null : Number(wins),
      losses: losses === "" ? null : Number(losses),
      playedFrom,
      playedTo,
      evidenceNote: String(form.get("evidenceNote") ?? ""),
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
        운영 가이드로 돌아가기
      </button>
      <div className="mt-5">
        <span className="eyebrow">Evidence, not hype</span>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">
          이 덱을 어디서, 어떻게 사용했나요?
        </h2>
        <p className="section-copy mt-2">
          기록은 검증 여부를 과장하지 않고 작성자 입력 또는 출처 연결로
          표시됩니다.
        </p>
      </div>

      <form onSubmit={submit} className="mt-7 grid gap-5">
        <label>
          <span className="text-sm font-extrabold">덱 출처</span>
          <select
            name="sourceType"
            defaultValue={initialValues?.sourceType ?? "community"}
            className="mt-2 h-12 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-semibold outline-none"
          >
            <option value="community">내가 사용한 커뮤니티 덱</option>
            <option value="ranked">등급전·랭커 덱</option>
            <option value="creator">스트리머·콘텐츠 제작자 덱</option>
            <option value="tournament">대회 덱</option>
            <option value="external_stats">외부 통계 사이트 덱</option>
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="출처 이름"
            name="sourceName"
            placeholder="예: 본인 등급전, Masters Tour"
            defaultValue={initialValues?.sourceName}
            maxLength={120}
          />
          <Field
            label="등급·순위"
            name="claimedRank"
            placeholder="예: 전설 412위"
            defaultValue={initialValues?.claimedRank}
            maxLength={80}
          />
        </div>

        <label>
          <span className="inline-flex items-center gap-1.5 text-sm font-extrabold">
            <Link2 size={15} />
            원본 링크
          </span>
          <input
            name="sourceUrl"
            type="url"
            defaultValue={initialValues?.sourceUrl}
            placeholder="https://..."
            maxLength={2000}
            className="mt-2 h-12 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none"
          />
          <span className="mt-1 block text-xs text-[var(--muted)]">
            링크가 있으면 `출처 연결`, 없으면 `작성자 입력`으로 표시됩니다.
          </span>
        </label>

        <div className="rounded-2xl bg-[#f4eee5] p-4">
          <div className="flex items-center gap-2 text-sm font-extrabold">
            <BarChart3 size={16} />
            선택 입력: 실제 플레이 기록
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <NumberField label="승" value={wins} onChange={setWins} />
            <NumberField label="패" value={losses} onChange={setLosses} />
          </div>
          <p className="mt-3 text-sm font-bold text-[var(--muted)]">
            {record
              ? `${record.games}게임 · 승률 ${record.winRate}%`
              : "승률은 입력받지 않고 승·패에서 자동 계산합니다."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="플레이 시작일"
            name="playedFrom"
            type="date"
            defaultValue={initialValues?.playedFrom}
          />
          <Field
            label="플레이 종료일"
            name="playedTo"
            type="date"
            defaultValue={initialValues?.playedTo}
          />
        </div>

        <label>
          <span className="text-sm font-extrabold">근거 메모</span>
          <textarea
            name="evidenceNote"
            defaultValue={initialValues?.evidenceNote}
            rows={4}
            maxLength={2000}
            placeholder="표본의 구간, 변경한 카드, 기록을 볼 때 주의할 점을 적어주세요."
            className="mt-2 w-full resize-y rounded-xl border border-[var(--line)] bg-white p-3 text-sm leading-6 outline-none"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] text-sm font-extrabold text-white"
        >
          전체 내용 검토
          <ArrowRight size={16} />
        </button>
      </form>
    </section>
  );
}

export function calculateRecord(wins: string, losses: string) {
  if (wins === "" || losses === "") return null;
  const winCount = Number(wins);
  const lossCount = Number(losses);
  if (
    !Number.isInteger(winCount) ||
    !Number.isInteger(lossCount) ||
    winCount < 0 ||
    lossCount < 0 ||
    winCount + lossCount === 0
  ) {
    return null;
  }
  return {
    games: winCount + lossCount,
    winRate: Math.round((winCount / (winCount + lossCount)) * 1000) / 10,
  };
}

function Field({
  label,
  name,
  type = "text",
  ...props
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  maxLength?: number;
}) {
  return (
    <label>
      <span className="text-sm font-extrabold">{label}</span>
      <input
        name={name}
        type={type}
        className="mt-2 h-12 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none"
        {...props}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-xs font-extrabold text-[var(--muted)]">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none"
      />
    </label>
  );
}
