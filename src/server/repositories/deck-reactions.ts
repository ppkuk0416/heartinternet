import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type DeckReactionState = {
  authenticated: boolean;
  recommended: boolean;
  favorited: boolean;
};

export async function getDeckReactionState(
  slug: string,
): Promise<DeckReactionState> {
  const client = await createServerSupabaseClient();
  if (!client) return emptyState(false);

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return emptyState(false);

  const { data: deck } = await client
    .from("decks")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!deck) return emptyState(true);

  const [recommendation, favorite] = await Promise.all([
    client
      .from("deck_likes")
      .select("deck_id")
      .eq("deck_id", deck.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    client
      .from("favorites")
      .select("deck_id")
      .eq("deck_id", deck.id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return {
    authenticated: true,
    recommended: Boolean(recommendation.data),
    favorited: Boolean(favorite.data),
  };
}

function emptyState(authenticated: boolean): DeckReactionState {
  return { authenticated, recommended: false, favorited: false };
}
