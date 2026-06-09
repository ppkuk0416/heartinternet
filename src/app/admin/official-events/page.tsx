import type { Metadata } from "next";
import Link from "next/link";
import { FileJson, Radar } from "lucide-react";
import { redirect } from "next/navigation";
import exampleManifest from "../../../../config/official-event.example.json";
import { OfficialEventImportPanel } from "@/components/admin/official-event-import-panel";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "공식 대회 덱 가져오기",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OfficialEventsPage() {
  const destination = safeNextPath("/admin/official-events");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(destination)}`);

  const client = await createServerSupabaseClient();
  const { data: profile } = client
    ? await client.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  if (profile?.role !== "moderator" && profile?.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="page-shell py-8 sm:py-12">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <span className="eyebrow">
            <FileJson size={14} />
            Official event decks
          </span>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-5xl">
            공식 대회 덱 가져오기
          </h1>
          <p className="section-copy mt-3 max-w-2xl">
            블리자드 공식 뉴스에 연결된 대회 덱을 후보 큐로 반영합니다. 이
            화면은 공식 출처 확인과 덱 코드 검증을 통과한 매니페스트만 저장할
            수 있게 막습니다.
          </p>
        </div>
        <Link
          href="/admin/deck-candidates"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-extrabold"
        >
          <Radar size={16} />
          후보 큐 보기
        </Link>
      </div>

      <div className="mt-7">
        <OfficialEventImportPanel
          exampleManifest={JSON.stringify(exampleManifest, null, 2)}
        />
      </div>
    </div>
  );
}
