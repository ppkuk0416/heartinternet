"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const primaryLinks = [
  { href: "/decks", label: "오늘 추천" },
  { href: "/meta", label: "메타 덱" },
  { href: "/decks?tag=저가루", label: "저가루" },
  { href: "/submit", label: "덱 등록" },
];

const supportLinks = [
  { href: "/about", label: "소개·문의" },
  { href: "/rules", label: "이용 안내" },
  { href: "/privacy", label: "개인정보" },
];

export function MobileNav({ isSignedIn }: { isSignedIn: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  function close() {
    setIsOpen(false);
  }

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={isOpen ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-white/70"
      >
        {isOpen ? <X size={19} /> : <Menu size={19} />}
      </button>

      {isOpen && (
        <div className="absolute inset-x-3 top-[4.5rem] z-50 rounded-[1.4rem] border border-[var(--line)] bg-[#f7f3eb] p-3 shadow-[0_24px_70px_rgba(51,37,24,.18)]">
          <nav className="grid gap-1" aria-label="모바일 주요 메뉴">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className="rounded-xl px-4 py-3 text-sm font-extrabold text-[var(--ink)] transition hover:bg-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="my-3 h-px bg-[var(--line)]" />

          <nav className="grid gap-1" aria-label="모바일 지원 메뉴">
            {supportLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--muted)] transition hover:bg-white hover:text-[var(--ink)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-3 grid gap-2">
            <Link
              href={isSignedIn ? "/my/decks" : "/login"}
              onClick={close}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--ink)] px-4 text-sm font-extrabold text-white transition hover:bg-[var(--brand-dark)]"
            >
              {isSignedIn ? "내 라이브러리" : "로그인"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
