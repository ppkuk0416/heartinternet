import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PublicDeckComment = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
  canDelete: boolean;
  canReact: boolean;
  helpful: boolean;
  helpfulCount: number;
};

export type DeckDiscussionResult = {
  comments: PublicDeckComment[];
  authenticated: boolean;
  unavailable: boolean;
};

type CommentRow = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  helpful_count: number;
  profiles: { display_name: string } | null;
};

export async function getDeckDiscussion(
  slug: string,
): Promise<DeckDiscussionResult> {
  const client = await createServerSupabaseClient();
  if (!client) {
    return { comments: [], authenticated: false, unavailable: true };
  }
  const {
    data: { user },
  } = await client.auth.getUser();
  const { data: deck, error: deckError } = await client
    .from("decks")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (deckError) {
    return {
      comments: [],
      authenticated: Boolean(user),
      unavailable: true,
    };
  }
  if (!deck) {
    return {
      comments: [],
      authenticated: Boolean(user),
      unavailable: false,
    };
  }

  const { data, error } = await client
    .from("comments")
    .select("id,author_id,body,created_at,helpful_count,profiles(display_name)")
    .eq("deck_id", deck.id)
    .eq("status", "visible")
    .order("helpful_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    return {
      comments: [],
      authenticated: Boolean(user),
      unavailable: true,
    };
  }

  const likedCommentIds = new Set<string>();
  if (user && data && data.length > 0) {
    const { data: likes, error: likesError } = await client
      .from("comment_likes")
      .select("comment_id")
      .eq("user_id", user.id)
      .in(
        "comment_id",
        data.map((comment) => comment.id),
      );
    if (likesError) {
      return { comments: [], authenticated: true, unavailable: true };
    }
    for (const like of likes ?? []) likedCommentIds.add(like.comment_id);
  }

  return {
    comments: ((data ?? []) as unknown as CommentRow[]).map((comment) => ({
      id: comment.id,
      body: comment.body,
      authorName: comment.profiles?.display_name ?? "HearthDeck 유저",
      createdAt: new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
      }).format(new Date(comment.created_at)),
      canDelete: comment.author_id === user?.id,
      canReact: comment.author_id !== user?.id,
      helpful: likedCommentIds.has(comment.id),
      helpfulCount: Number(comment.helpful_count),
    })),
    authenticated: Boolean(user),
    unavailable: false,
  };
}
