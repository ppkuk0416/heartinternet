import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FilePenLine } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { DeckEditForm } from "@/components/deck/deck-edit-form";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "덱 가이드 수정",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DeckEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const destination = safeNextPath(`/my/decks/${id}/edit`);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(destination)}`);

  const client = await createServerSupabaseClient();
  if (!client) notFound();
  const { data: deck } = await client
    .from("decks")
    .select(
      "id,title,summary,recommended_for,difficulty,game_plan,mulligan_guide,card_choices,matchup_notes,status",
    )
    .eq("id", id)
    .eq("author_id", user.id)
    .eq("status", "draft")
    .maybeSingle();
  if (!deck) notFound();
  const query = await searchParams;

  return (
    <div className="page-shell py-10 sm:py-14">
      <Link
        href="/my/decks"
        className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--muted)]"
      >
        <ArrowLeft size={15} />
        내 덱으로
      </Link>
      <div className="mt-6">
        <span className="eyebrow">
          <FilePenLine size={14} />
          Editorial guide
        </span>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.055em]">
          덱 가이드 완성
        </h1>
        <p className="section-copy mt-3 max-w-2xl">
          출처와 덱 코드는 이미 저장되었습니다. 유저가 이 덱을 선택하고 실제로
          플레이할 수 있도록 운영법과 멀리건을 검토해주세요.
        </p>
      </div>
      {query.created && (
        <p role="status" className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
          승인 후보에서 큐레이션 초안을 생성했습니다.
        </p>
      )}
      <DeckEditForm deck={deck} />
    </div>
  );
}
