"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useState } from "react";

type EditableDeck = {
  id: string;
  title: string;
  summary: string;
  recommended_for: string;
  difficulty: "easy" | "medium" | "hard";
  game_plan: string;
  mulligan_guide: string;
  card_choices: string | null;
  matchup_notes: string | null;
};

export function DeckEditForm({ deck }: { deck: EditableDeck }) {
  const [form, setForm] = useState({
    title: deck.title,
    summary: deck.summary,
    recommendedFor: deck.recommended_for,
    difficulty: deck.difficulty,
    gamePlan: deck.game_plan,
    mulliganGuide: deck.mulligan_guide,
    cardChoices: deck.card_choices ?? "",
    matchupNotes: deck.matchup_notes ?? "",
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/decks/${deck.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "가이드를 저장하지 못했습니다.");
      setMessage("공개 가능한 가이드 내용을 저장했습니다.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "가이드를 저장하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-7 grid gap-5">
      <Field label="덱 이름" hint="3~120자">
        <input
          value={form.title}
          onChange={(event) => update("title", event.target.value)}
          minLength={3}
          maxLength={120}
          required
          className="h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4"
        />
      </Field>
      <Field label="한 줄 요약" hint="20~320자">
        <textarea
          value={form.summary}
          onChange={(event) => update("summary", event.target.value)}
          minLength={20}
          maxLength={320}
          required
          className="min-h-28 w-full rounded-xl border border-[var(--line)] bg-white p-4"
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
        <Field label="추천 대상" hint="누구에게 맞는 덱인지">
          <input
            value={form.recommendedFor}
            onChange={(event) => update("recommendedFor", event.target.value)}
            minLength={3}
            maxLength={240}
            required
            className="h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4"
          />
        </Field>
        <Field label="난이도">
          <select
            value={form.difficulty}
            onChange={(event) =>
              update(
                "difficulty",
                event.target.value as "easy" | "medium" | "hard",
              )
            }
            className="h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4"
          >
            <option value="easy">쉬움</option>
            <option value="medium">보통</option>
            <option value="hard">어려움</option>
          </select>
        </Field>
      </div>
      <Field label="운영법" hint="최소 20자">
        <textarea
          value={form.gamePlan}
          onChange={(event) => update("gamePlan", event.target.value)}
          minLength={20}
          maxLength={5000}
          required
          className="min-h-40 w-full rounded-xl border border-[var(--line)] bg-white p-4"
        />
      </Field>
      <Field label="멀리건 가이드" hint="최소 10자">
        <textarea
          value={form.mulliganGuide}
          onChange={(event) => update("mulliganGuide", event.target.value)}
          minLength={10}
          maxLength={3000}
          required
          className="min-h-32 w-full rounded-xl border border-[var(--line)] bg-white p-4"
        />
      </Field>
      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="카드 선택 설명" hint="선택">
          <textarea
            value={form.cardChoices}
            onChange={(event) => update("cardChoices", event.target.value)}
            maxLength={5000}
            className="min-h-32 w-full rounded-xl border border-[var(--line)] bg-white p-4"
          />
        </Field>
        <Field label="상성 메모" hint="선택">
          <textarea
            value={form.matchupNotes}
            onChange={(event) => update("matchupNotes", event.target.value)}
            maxLength={5000}
            className="min-h-32 w-full rounded-xl border border-[var(--line)] bg-white p-4"
          />
        </Field>
      </div>

      {message && <p role="status" className="text-sm font-bold text-emerald-700">{message}</p>}
      {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-extrabold text-white disabled:opacity-50"
        >
          {pending ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
          가이드 저장
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3 text-sm font-extrabold">
        {label}
        {hint && <span className="text-xs font-semibold text-[var(--muted)]">{hint}</span>}
      </span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}
