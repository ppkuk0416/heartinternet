import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { redirect } from "next/navigation";
import { FavoriteDeckCard } from "@/components/my/favorite-deck-card";
import { MyLibraryNav } from "@/components/my/my-library-nav";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/server";
import { getFavoriteDecks } from "@/server/repositories/favorite-decks";

export const metadata: Metadata = {
  title: "저장한 덱",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MyFavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(safeNextPath("/my/favorites"))}`,
    );
  }

  const params = await searchParams;
  const requestedPage = Math.max(
    1,
    Number.parseInt(params.page ?? "1", 10) || 1,
  );
  const result = await getFavoriteDecks({
    userId: user.id,
    page: requestedPage,
  });
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="page-shell py-10 sm:py-14">
      <div>
        <span className="eyebrow">Personal library</span>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.055em]">
          내 라이브러리
        </h1>
        <p className="section-copy mt-2">
          다시 플레이하고 싶은 덱과 내가 작성한 덱을 관리합니다.
        </p>
      </div>

      <MyLibraryNav current="favorites" />

      <div className="mt-7 flex items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-sm font-extrabold">
            <Bookmark size={15} className="text-[var(--brand)]" />
            저장한 덱
          </span>
          {!result.unavailable && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              공개 상태인 덱 {result.total}개
            </p>
          )}
        </div>
        <Link
          href="/decks"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-extrabold"
        >
          <Search size={14} />
          새 덱 찾기
        </Link>
      </div>

      {result.unavailable ? (
        <div className="surface mt-6 rounded-2xl p-6 text-sm font-semibold text-amber-900">
          저장한 덱을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </div>
      ) : result.decks.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.decks.map((deck) => (
            <FavoriteDeckCard key={deck.slug} deck={deck} />
          ))}
        </div>
      ) : (
        <div className="surface mt-6 grid min-h-72 place-items-center rounded-2xl p-6 text-center">
          <div>
            <span className="mx-auto grid size-12 place-items-center rounded-xl bg-orange-50 text-[var(--brand)]">
              <Bookmark size={21} />
            </span>
            <h2 className="mt-4 text-xl font-black">
              아직 저장한 덱이 없습니다
            </h2>
            <p className="section-copy mt-2">
              덱 상세에서 저장하면 다음 플레이를 위해 이곳에 모아둘 수 있어요.
            </p>
            <Link
              href="/decks"
              className="mt-5 inline-flex h-11 items-center rounded-xl bg-[var(--ink)] px-4 text-sm font-extrabold text-white"
            >
              덱 찾아보기
            </Link>
          </div>
        </div>
      )}

      {pageCount > 1 && (
        <nav
          aria-label="저장한 덱 페이지"
          className="mt-9 flex items-center justify-center gap-3"
        >
          <PageLink
            href={`/my/favorites?page=${Math.max(1, result.page - 1)}`}
            disabled={result.page <= 1}
          >
            <ChevronLeft size={15} />
            이전
          </PageLink>
          <span className="text-sm font-bold text-[var(--muted)]">
            {result.page} / {pageCount}
          </span>
          <PageLink
            href={`/my/favorites?page=${Math.min(pageCount, result.page + 1)}`}
            disabled={result.page >= pageCount}
          >
            다음
            <ChevronRight size={15} />
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return disabled ? (
    <span className="inline-flex h-10 items-center gap-1 rounded-xl border border-[var(--line)] px-3 text-sm font-bold opacity-40">
      {children}
    </span>
  ) : (
    <Link
      href={href}
      className="inline-flex h-10 items-center gap-1 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-bold"
    >
      {children}
    </Link>
  );
}
