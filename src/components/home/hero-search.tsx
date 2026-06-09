"use client";

import { useRouter } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { CLASS_OPTIONS } from "@/lib/decks";

const goals = ["초보 추천", "저가루", "빠른 등반", "쉬운 운영", "전설 유저"];

export function HeroSearch({
  isDemo = false,
  currentPatch,
}: {
  isDemo?: boolean;
  currentPatch: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/decks?${params.toString()}`);
  }

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-[#211d18] px-5 py-10 text-white shadow-[0_30px_80px_rgba(51,37,24,.22)] sm:px-10 sm:py-14 lg:px-16 lg:py-16">
      <div className="soft-grid absolute inset-0 opacity-15" />
      <div className="absolute -right-24 -top-24 size-80 rounded-full bg-[var(--brand)] opacity-25 blur-3xl" />
      <div className="absolute -bottom-32 left-1/3 size-80 rounded-full bg-[var(--gold)] opacity-10 blur-3xl" />

      <div className="relative z-10 max-w-3xl">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-bold text-[#f6dba0]">
          <Sparkles size={14} />
          패치 {currentPatch} · {isDemo ? "기술 알파 데모" : "공개 덱"}
        </span>
        <h1 className="max-w-2xl text-[clamp(2.3rem,6vw,4.6rem)] font-black leading-[1.02] tracking-[-0.065em]">
          오늘은 어떤 덱으로
          <span className="block text-[#f1bd55]">플레이할까요?</span>
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-white/65 sm:text-base">
          목적에 맞는 덱을 발견하고, 믿을 수 있는 근거와 운영법을 확인한 뒤
          한 번에 게임으로 가져가세요.
        </p>

        <form
          onSubmit={submit}
          role="search"
          className="mt-8 flex max-w-2xl gap-2 rounded-2xl bg-white p-2 shadow-2xl"
        >
          <label className="flex min-w-0 flex-1 items-center gap-3 px-3 text-[#766c60]">
            <Search size={19} aria-hidden="true" />
            <span className="sr-only">덱 검색</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="직업, 덱 이름, 덱 유형 검색"
              className="h-11 w-full min-w-0 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[#9a9188]"
            />
          </label>
          <button
            type="submit"
            className="h-11 shrink-0 rounded-xl bg-[var(--brand)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--brand-dark)]"
          >
            덱 찾기
          </button>
        </form>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {goals.map((goal) => (
            <button
              key={goal}
              type="button"
              onClick={() => router.push(`/decks?tag=${encodeURIComponent(goal)}`)}
              className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-white/75 transition hover:border-white/35 hover:bg-white/10 hover:text-white"
            >
              {goal}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-10 border-t border-white/10 pt-5">
        <p className="mb-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/35">
          직업으로 바로 찾기
        </p>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {CLASS_OPTIONS.map((className) => (
            <button
              key={className}
              type="button"
              onClick={() =>
                router.push(`/decks?class=${encodeURIComponent(className)}`)
              }
              className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/65 transition hover:bg-white/12 hover:text-white"
            >
              {className}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
