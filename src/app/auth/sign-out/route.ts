import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const client = await createServerSupabaseClient();
  if (client) await client.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
