import { CLASS_META } from "@/lib/decks";
import type { DeckClass } from "@/lib/types";

export function ClassEmblem({
  className,
  size = "md",
}: {
  className: DeckClass;
  size?: "sm" | "md" | "lg";
}) {
  const meta = CLASS_META[className];
  const sizes = {
    sm: "size-9 text-sm",
    md: "size-12 text-lg",
    lg: "size-20 text-3xl",
  };

  return (
    <span
      aria-label={`${className} 직업`}
      className={`grid shrink-0 place-items-center rounded-[30%] border border-white/25 font-bold text-white shadow-lg ${sizes[size]}`}
      style={{
        background: `radial-gradient(circle at 35% 28%, ${meta.accent}, ${meta.color} 66%)`,
      }}
    >
      {meta.glyph}
    </span>
  );
}
