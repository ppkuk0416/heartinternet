import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="page-shell grid min-h-[65vh] place-items-center py-16 text-center">
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#efe8dc] text-[var(--brand)]">
          <Search size={25} />
        </span>
        <p className="eyebrow mt-6">404 · Not found</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.05em]">
          이 덱을 찾을 수 없어요
        </h1>
        <p className="section-copy mt-3">
          삭제되었거나 주소가 변경된 덱일 수 있습니다.
        </p>
        <Link
          href="/decks"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-5 py-3 text-sm font-extrabold text-white"
        >
          <ArrowLeft size={16} />
          덱 목록으로
        </Link>
      </div>
    </div>
  );
}
