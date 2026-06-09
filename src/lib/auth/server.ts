import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const client = await createServerSupabaseClient();
  if (!client) return null;

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  return error ? null : user;
}
