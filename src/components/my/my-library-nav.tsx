import Link from "next/link";
import { Bookmark, FilePenLine } from "lucide-react";

export function MyLibraryNav({
  current,
}: {
  current: "decks" | "favorites";
}) {
  return (
    <nav
      aria-label="내 라이브러리"
      className="mt-7 flex gap-2 border-b border-[var(--line)]"
    >
      <Tab
        href="/my/decks"
        active={current === "decks"}
        icon={<FilePenLine size={15} />}
      >
        작성한 덱
      </Tab>
      <Tab
        href="/my/favorites"
        active={current === "favorites"}
        icon={<Bookmark size={15} />}
      >
        저장한 덱
      </Tab>
    </nav>
  );
}

function Tab({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-11 items-center gap-1.5 border-b-2 px-3 text-sm font-extrabold transition ${
        active
          ? "border-[var(--brand)] text-[var(--brand-dark)]"
          : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}
