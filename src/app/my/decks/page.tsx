import type { Metadata } from "next";
import Link from "next/link";
import { FilePenLine, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { PublishDraftButton } from "@/components/deck/publish-draft-button";
import { MyLibraryNav } from "@/components/my/my-library-nav";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "내 덱",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ created?: string }>;

export default async function MyDecksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNextPath("/my/decks"))}`);

  const client = await createServerSupabaseClient();
  const { data: decks, error } = client
    ? await client
        .from("decks")
        .select("id,slug,title,status,updated_at")
        .eq("author_id", user.id)
        .order("updated_at", { ascending: false })
    : { data: null, error: new Error("Supabase unavailable") };
  const params = await searchParams;

  return (
    <div className="page-shell py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Personal library</span>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.055em]">
            내 라이브러리
          </h1>
          <p className="section-copy mt-2">
            다시 플레이하고 싶은 덱과 내가 작성한 덱을 관리합니다.
          </p>
        </div>
        <Link
          href="/submit"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-extrabold text-white"
        >
          <Plus size={16} />
          새 덱 등록
        </Link>
      </div>

      <MyLibraryNav current="decks" />

      {params.created && (
        <p role="status" className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
          운영 가이드 초안을 저장했습니다.
        </p>
      )}

      {error ? (
        <div className="surface mt-7 rounded-2xl p-6 text-sm font-semibold text-amber-900">
          내 덱을 불러오지 못했습니다. Supabase 연결 상태를 확인해주세요.
        </div>
      ) : decks && decks.length > 0 ? (
        <div className="mt-7 grid gap-3">
          {decks.map((deck) => (
            <article
              key={deck.id}
              className="surface flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5"
            >
              <div>
                <span className="rounded-full bg-[#f2ece2] px-2.5 py-1 text-xs font-extrabold text-[var(--muted)]">
                  {statusLabel(deck.status)}
                </span>
                <h2 className="mt-3 text-lg font-black">{deck.title}</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  마지막 수정 {new Date(deck.updated_at).toLocaleDateString("ko-KR")}
                </p>
              </div>
              {deck.status === "draft" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/my/decks/${deck.id}/edit`}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-extrabold"
                  >
                    <FilePenLine size={14} />
                    가이드 수정
                  </Link>
                  <PublishDraftButton deckId={deck.id} />
                </div>
              ) : deck.status === "published" ? (
                <Link
                  href={`/decks/${deck.slug}`}
                  className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--brand)]"
                >
                  공개 페이지 보기
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--muted)]">
                  <FilePenLine size={15} />
                  상태 확인
                </span>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="surface mt-7 grid min-h-64 place-items-center rounded-2xl p-6 text-center">
          <div>
            <FilePenLine className="mx-auto text-[var(--muted)]" />
            <h2 className="mt-4 text-xl font-black">아직 작성한 덱이 없습니다</h2>
            <p className="section-copy mt-2">덱 코드 검증부터 첫 초안을 시작하세요.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function statusLabel(status: string) {
  return (
    {
      draft: "작성 중",
      pending: "검토 대기",
      published: "게시됨",
      hidden: "숨김",
      rejected: "반려",
      archived: "보관",
    }[status] ?? status
  );
}
