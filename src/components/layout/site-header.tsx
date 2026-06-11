import Link from "next/link";
import {
  Activity,
  BarChart3,
  ClipboardCheck,
  FileJson,
  Flame,
  Radar,
  Search,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { MobileSiteMenu } from "@/components/layout/mobile-site-menu";
import { getCurrentUser } from "@/lib/auth/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const client = user ? await createServerSupabaseClient() : null;
  const { data: profile } = client
    ? await client.from("profiles").select("role").eq("id", user!.id).maybeSingle()
    : { data: null };
  const isModerator =
    profile?.role === "moderator" || profile?.role === "admin";

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[rgba(247,243,235,0.88)] backdrop-blur-xl">
      <div className="page-shell flex h-16 items-center justify-between gap-5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 font-extrabold tracking-[-0.04em]"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-[var(--brand)] text-white shadow-[0_7px_16px_rgba(212,90,54,.24)]">
            <Flame size={19} aria-hidden="true" />
          </span>
          <span className="text-[1.02rem]">
            HearthDeck <span className="text-[var(--brand)]">Hub</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
          <Link
            href="/decks"
            className="transition-colors hover:text-[var(--brand)]"
          >
            덱 찾기
          </Link>
          <Link
            href="/decks?tag=초보+추천"
            className="transition-colors hover:text-[var(--brand)]"
          >
            초보 추천
          </Link>
          <Link
            href="/submit"
            className="transition-colors hover:text-[var(--brand)]"
          >
            덱 등록
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/decks"
            aria-label="덱 검색"
            className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-white/70 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            <Search size={18} />
          </Link>
          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              {isModerator && (
                <>
                  <Link
                    href="/admin/deck-candidates"
                    aria-label="최근 덱 검토"
                    className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-white/70 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                  >
                    <Radar size={17} />
                  </Link>
                  <Link
                    href="/admin/operations"
                    aria-label="운영 상태"
                    className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-white/70 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                  >
                    <Activity size={17} />
                  </Link>
                  <Link
                    href="/admin/content-readiness"
                    aria-label="콘텐츠 출시 기준"
                    className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-white/70 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                  >
                    <ClipboardCheck size={17} />
                  </Link>
                  <Link
                    href="/admin/analytics"
                    aria-label="제품 분석"
                    className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-white/70 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                  >
                    <BarChart3 size={17} />
                  </Link>
                  <Link
                    href="/admin/official-events"
                    aria-label="공식 대회 덱 가져오기"
                    className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-white/70 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                  >
                    <FileJson size={17} />
                  </Link>
                  <Link
                    href="/admin/reports"
                    aria-label="신고 검토"
                    className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-white/70 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                  >
                    <ShieldAlert size={17} />
                  </Link>
                </>
              )}
              <Link
                href="/my/decks"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--ink)] px-4 text-sm font-bold text-white transition hover:bg-[var(--brand-dark)]"
              >
                <UserRound size={16} />
                내 라이브러리
              </Link>
              <form action="/auth/sign-out" method="post">
                <button
                  type="submit"
                  className="h-10 rounded-full border border-[var(--line)] bg-white px-3 text-xs font-bold"
                >
                  로그아웃
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              aria-label="로그인"
              className="hidden h-10 items-center gap-2 rounded-full bg-[var(--ink)] px-4 text-sm font-bold text-white transition hover:bg-[var(--brand-dark)] sm:flex"
            >
              <UserRound size={16} />
              로그인
            </Link>
          )}
          <MobileSiteMenu signedIn={Boolean(user)} isModerator={isModerator} />
        </div>
      </div>
    </header>
  );
}
