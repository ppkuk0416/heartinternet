import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const REPORT_QUEUE_STATUSES = ["open", "reviewing"] as const;
export type ReportQueueStatus = (typeof REPORT_QUEUE_STATUSES)[number];

export type ModerationReport = {
  id: string;
  targetType: "deck" | "comment" | "user";
  targetId: string;
  targetLabel: string;
  targetHref?: string;
  reason: string;
  details?: string;
  reporterName: string;
  createdAt: string;
  status: ReportQueueStatus;
};

type ReportRow = {
  id: string;
  target_type: ModerationReport["targetType"];
  target_id: string;
  reason: string;
  details: string | null;
  status: ReportQueueStatus;
  created_at: string;
  profiles: { display_name: string } | null;
};

export async function getModerationReports({
  status,
  page,
}: {
  status: ReportQueueStatus;
  page: number;
}) {
  const client = await createServerSupabaseClient();
  const pageSize = 20;
  if (!client) {
    return { items: [], total: 0, pageSize, unavailable: true };
  }

  const from = (page - 1) * pageSize;
  const { data, count, error } = await client
    .from("reports")
    .select(
      "id,target_type,target_id,reason,details,status,created_at,profiles!reports_reporter_id_fkey(display_name)",
      { count: "exact" },
    )
    .eq("status", status)
    .order("created_at", { ascending: true })
    .range(from, from + pageSize - 1);
  if (error) return { items: [], total: 0, pageSize, unavailable: true };

  const rows = (data ?? []) as unknown as ReportRow[];
  const deckIds = rows
    .filter((row) => row.target_type === "deck")
    .map((row) => row.target_id);
  const commentIds = rows
    .filter((row) => row.target_type === "comment")
    .map((row) => row.target_id);
  const [decks, comments] = await Promise.all([
    deckIds.length
      ? client.from("decks").select("id,slug,title").in("id", deckIds)
      : Promise.resolve({ data: [], error: null }),
    commentIds.length
      ? client
          .from("comments")
          .select("id,body,decks(slug,title)")
          .in("id", commentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (decks.error || comments.error) {
    return { items: [], total: 0, pageSize, unavailable: true };
  }

  const deckById = new Map(
    (decks.data ?? []).map((deck) => [
      deck.id,
      { label: deck.title, href: `/decks/${deck.slug}` },
    ]),
  );
  const commentById = new Map(
    (
      (comments.data ?? []) as unknown as Array<{
        id: string;
        body: string;
        decks: { slug: string; title: string } | null;
      }>
    ).map((comment) => [
      comment.id,
      {
        label: `댓글 · ${comment.body.slice(0, 80)}`,
        href: comment.decks
          ? `/decks/${comment.decks.slug}#discussion`
          : undefined,
      },
    ]),
  );

  return {
    items: rows.map<ModerationReport>((row) => {
      const target =
        row.target_type === "deck"
          ? deckById.get(row.target_id)
          : row.target_type === "comment"
            ? commentById.get(row.target_id)
            : undefined;
      return {
        id: row.id,
        targetType: row.target_type,
        targetId: row.target_id,
        targetLabel: target?.label ?? `${row.target_type} · 삭제된 대상`,
        targetHref: target?.href,
        reason: reasonLabel(row.reason),
        details: row.details ?? undefined,
        reporterName: row.profiles?.display_name ?? "HearthDeck 유저",
        createdAt: new Intl.DateTimeFormat("ko-KR", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(row.created_at)),
        status: row.status,
      };
    }),
    total: count ?? 0,
    pageSize,
    unavailable: false,
  };
}

function reasonLabel(reason: string) {
  return (
    {
      spam: "스팸·광고",
      abuse: "욕설·괴롭힘",
      false_claim: "허위 성적·정보",
      copyright: "저작권·출처 문제",
      other: "기타",
    }[reason] ?? reason
  );
}
