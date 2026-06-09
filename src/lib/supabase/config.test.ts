// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import {
  getAdminSupabaseConfig,
  getPublicSupabaseConfig,
} from "@/lib/supabase/config";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Supabase configuration", () => {
  it("returns null when the technical alpha has no credentials", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(getPublicSupabaseConfig()).toBeNull();
  });

  it("accepts a valid public configuration", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_key";

    expect(getPublicSupabaseConfig()).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_test_key",
    });
  });

  it("never creates an admin configuration without a service-role key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_key";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(getAdminSupabaseConfig()).toBeNull();
  });
});
