"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { trackProductEvent } from "@/components/analytics/product-event-tracker";

export function CopyDeckButton({
  code,
  trackingSlug,
  variant = "primary",
  label = "덱 코드 복사",
  className = "",
}: {
  code: string;
  trackingSlug?: string;
  variant?: "primary" | "secondary" | "compact";
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      recordCopy(trackingSlug);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(success);
      if (success) {
        recordCopy(trackingSlug);
        window.setTimeout(() => setCopied(false), 2200);
      }
    }
  }

  const styles = {
    primary:
      "h-13 rounded-2xl bg-[var(--brand)] px-5 text-white shadow-[0_10px_24px_rgba(212,90,54,.22)] hover:bg-[var(--brand-dark)]",
    secondary:
      "h-11 rounded-xl border border-[var(--line)] bg-white px-4 text-[var(--ink)] hover:border-[var(--brand)] hover:text-[var(--brand)]",
    compact:
      "h-9 rounded-lg border border-[var(--line)] bg-white/80 px-3 text-xs text-[var(--ink)] hover:border-[var(--brand)] hover:text-[var(--brand)]",
  };

  return (
    <button
      type="button"
      onClick={copyCode}
      aria-live="polite"
      className={`inline-flex items-center justify-center gap-2 font-extrabold transition ${styles[variant]} ${className}`}
    >
      {copied ? <Check size={17} /> : <Copy size={17} />}
      {copied ? "복사했어요" : label}
    </button>
  );
}

function recordCopy(slug: string | undefined) {
  if (!slug) return;
  trackProductEvent({
    eventName: "deck_code_copied",
    deckSlug: slug,
  });
  void fetch(`/api/public-decks/${encodeURIComponent(slug)}/copy`, {
    method: "POST",
    keepalive: true,
    headers: { Accept: "application/json" },
  }).catch(() => undefined);
}
