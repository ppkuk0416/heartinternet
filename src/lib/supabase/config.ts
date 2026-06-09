import { z } from "zod";

const PublicConfigSchema = z.object({
  url: z.url(),
  publishableKey: z.string().min(20),
});

const AdminConfigSchema = PublicConfigSchema.extend({
  serviceRoleKey: z.string().min(20),
});

export type PublicSupabaseConfig = z.infer<typeof PublicConfigSchema>;
export type AdminSupabaseConfig = z.infer<typeof AdminConfigSchema>;

export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const candidate = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };

  if (
    !candidate.url ||
    !candidate.publishableKey ||
    candidate.publishableKey.startsWith("replace-")
  ) {
    return null;
  }

  const result = PublicConfigSchema.safeParse(candidate);
  return result.success ? result.data : null;
}

export function getAdminSupabaseConfig(): AdminSupabaseConfig | null {
  const publicConfig = getPublicSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !publicConfig ||
    !serviceRoleKey ||
    serviceRoleKey.startsWith("replace-")
  ) {
    return null;
  }

  const result = AdminConfigSchema.safeParse({
    ...publicConfig,
    serviceRoleKey,
  });
  return result.success ? result.data : null;
}

export function isSupabaseConfigured() {
  return getPublicSupabaseConfig() !== null;
}
