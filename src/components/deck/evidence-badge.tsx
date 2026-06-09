import { BadgeCheck, CircleDot, Link2 } from "lucide-react";
import type { EvidenceStatus } from "@/lib/types";

const config = {
  "운영진 확인": {
    icon: BadgeCheck,
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  "출처 연결": {
    icon: Link2,
    className: "bg-blue-50 text-blue-800 border-blue-200",
  },
  "작성자 입력": {
    icon: CircleDot,
    className: "bg-stone-100 text-stone-700 border-stone-200",
  },
} satisfies Record<EvidenceStatus, { icon: typeof BadgeCheck; className: string }>;

export function EvidenceBadge({ status }: { status: EvidenceStatus }) {
  const item = config[status];
  const Icon = item.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.68rem] font-extrabold ${item.className}`}
    >
      <Icon size={12} aria-hidden="true" />
      {status}
    </span>
  );
}
