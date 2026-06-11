import Link from "next/link";
import { Menu } from "lucide-react";

export function MobileSiteMenu({
  signedIn,
  isModerator,
}: {
  signedIn: boolean;
  isModerator: boolean;
}) {
  return (
    <details className="group relative md:hidden">
      <summary
        aria-label="메뉴 열기"
        className="grid size-10 cursor-pointer list-none place-items-center rounded-full border border-[var(--line)] bg-white/70 [&::-webkit-details-marker]:hidden"
      >
        <Menu size={19} />
      </summary>
      <nav
        aria-label="모바일 메뉴"
        className="surface absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl bg-[var(--surface-strong)] p-2 shadow-[var(--shadow)]"
      >
        <MobileLink href="/decks">덱 찾기</MobileLink>
        <MobileLink href="/decks?tag=초보+추천">초보 추천</MobileLink>
        <MobileLink href="/submit">덱 등록</MobileLink>
        {signedIn ? (
          <>
            <MobileLink href="/my/decks">내 라이브러리</MobileLink>
            {isModerator && (
              <MobileLink href="/admin/operations">운영 상태</MobileLink>
            )}
            <form action="/auth/sign-out" method="post" className="mt-1 border-t border-[var(--line)] pt-1">
              <button
                type="submit"
                className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[var(--muted)] hover:bg-[#f2ece2] hover:text-[var(--ink)]"
              >
                로그아웃
              </button>
            </form>
          </>
        ) : (
          <MobileLink href="/login">로그인</MobileLink>
        )}
      </nav>
    </details>
  );
}

function MobileLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-[#f2ece2] hover:text-[var(--brand-dark)]"
    >
      {children}
    </Link>
  );
}
