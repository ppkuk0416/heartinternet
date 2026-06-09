import Link from "next/link";
import { Flame } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[var(--line)] bg-[#efe8dc]">
      <div className="page-shell flex flex-col gap-6 py-10 text-sm text-[var(--muted)] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 font-extrabold text-[var(--ink)]">
            <Flame size={17} className="text-[var(--brand)]" />
            HearthDeck Hub
          </div>
          <p>좋은 덱을 발견하고, 이해하고, 바로 플레이하세요.</p>
          <p className="mt-1 text-xs">
            기술 알파에서는 덱의 패치와 근거 라벨을 확인한 뒤 사용해주세요.
          </p>
        </div>
        <div className="flex gap-5">
          <Link href="/decks" className="hover:text-[var(--ink)]">
            덱 찾기
          </Link>
          <Link href="/rules" className="hover:text-[var(--ink)]">
            이용 안내
          </Link>
          <Link href="/privacy" className="hover:text-[var(--ink)]">
            개인정보
          </Link>
        </div>
      </div>
    </footer>
  );
}
