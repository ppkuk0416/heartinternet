"use client";

import { Filter, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import type { DeckCatalogSort } from "@/lib/deck-catalog";

type Option = {
  label: string;
  value: string;
};

type DeckFiltersProps = {
  query: string;
  selectedClass: string;
  selectedTag: string;
  selectedEvidence: string;
  selectedSource: string;
  trustedOnly: boolean;
  includeOld: boolean;
  sort: DeckCatalogSort;
  classOptions: readonly string[];
  tagOptions: readonly string[];
  evidenceOptions: readonly string[];
  sourceOptions: readonly Option[];
};

export function DeckFilters(props: DeckFiltersProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    formData.forEach((value, key) => {
      const normalized = String(value).trim();
      if (normalized) params.set(key, normalized);
    });

    dialogRef.current?.close();
    const query = params.toString();
    router.push(query ? `/decks?${query}` : "/decks");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="surface mb-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold md:hidden"
      >
        <Filter size={17} />
        검색·필터 열기
      </button>

      <form
        action="/decks"
        onSubmit={submit}
        className="surface mb-7 hidden gap-3 rounded-[1.4rem] p-4 md:grid md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))_auto]"
      >
        <FilterFields {...props} />
      </form>

      <dialog
        ref={dialogRef}
        aria-label="덱 검색과 필터"
        className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-[#f8f4ed] p-0 text-[var(--ink)] backdrop:bg-black/50 md:hidden"
      >
        <form
          action="/decks"
          onSubmit={submit}
          className="flex min-h-dvh flex-col"
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] bg-white px-5 py-4">
            <div>
              <p className="text-xs font-bold text-[var(--brand)]">Deck filters</p>
              <h2 className="text-xl font-black">내게 맞는 덱 찾기</h2>
            </div>
            <button
              type="button"
              aria-label="필터 닫기"
              onClick={() => dialogRef.current?.close()}
              className="grid size-11 place-items-center rounded-xl border border-[var(--line)] bg-white"
            >
              <X size={19} />
            </button>
          </div>
          <div className="grid flex-1 content-start gap-4 overflow-y-auto p-5">
            <FilterFields {...props} mobile />
          </div>
        </form>
      </dialog>
    </>
  );
}

function FilterFields({
  query,
  selectedClass,
  selectedTag,
  selectedEvidence,
  selectedSource,
  trustedOnly,
  includeOld,
  sort,
  classOptions,
  tagOptions,
  evidenceOptions,
  sourceOptions,
  mobile = false,
}: DeckFiltersProps & { mobile?: boolean }) {
  return (
    <>
      <label className="flex h-12 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3">
        <SlidersHorizontal size={17} className="text-[var(--muted)]" />
        <span className="sr-only">덱 검색</span>
        <input
          name="q"
          defaultValue={query}
          placeholder="덱 이름 또는 유형"
          maxLength={80}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>

      <FilterSelect
        name="class"
        label="모든 직업"
        defaultValue={selectedClass}
        options={classOptions.map(toOption)}
      />
      <FilterSelect
        name="tag"
        label="모든 목적"
        defaultValue={selectedTag}
        options={tagOptions.map(toOption)}
      />
      <FilterSelect
        name="evidence"
        label="모든 근거"
        defaultValue={selectedEvidence}
        options={evidenceOptions.map(toOption)}
      />
      <FilterSelect
        name="source"
        label="모든 출처"
        defaultValue={selectedSource}
        options={sourceOptions}
      />

      {includeOld && <input type="hidden" name="patch" value="all" />}
      {trustedOnly && <input type="hidden" name="trust" value="verified" />}
      {sort !== "recommended" && <input type="hidden" name="sort" value={sort} />}

      <button
        type="submit"
        className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--brand)] ${
          mobile ? "mt-2" : ""
        }`}
      >
        <SlidersHorizontal size={16} />
        적용
      </button>
    </>
  );
}

function FilterSelect({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: readonly Option[];
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-12 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-semibold outline-none"
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function toOption(value: string): Option {
  return { label: value, value };
}
