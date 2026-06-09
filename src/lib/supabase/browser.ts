"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";

let browserClient: SupabaseClient | null | undefined;

export function getBrowserSupabaseClient() {
  if (browserClient !== undefined) return browserClient;

  const config = getPublicSupabaseConfig();
  browserClient = config
    ? createBrowserClient(config.url, config.publishableKey, {
        cookies: { encode: "tokens-only" },
        isSingleton: true,
      })
    : null;

  return browserClient;
}
