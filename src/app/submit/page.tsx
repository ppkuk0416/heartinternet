import type { Metadata } from "next";
import { ProductEventTracker } from "@/components/analytics/product-event-tracker";
import { DeckCodeStep } from "@/components/submit/deck-code-step";
import { getCurrentUser } from "@/lib/auth/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "덱 등록",
  description: "하스스톤 덱 코드를 분석하고 공유할 덱의 초안을 시작하세요.",
};

export const dynamic = "force-dynamic";

export default async function SubmitDeckPage() {
  const user = await getCurrentUser();
  return (
    <div className="page-shell py-8 sm:py-12">
      <ProductEventTracker
        eventName="deck_submit_started"
        metadata={{
          authenticated: Boolean(user),
          authConfigured: isSupabaseConfigured(),
        }}
      />
      <div className="max-w-2xl">
        <span className="eyebrow">Contributor alpha</span>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-5xl">
          내 덱 공유하기
        </h1>
        <p className="section-copy mt-3">
          코드부터 정확히 확인한 뒤, 다른 유저가 판단할 수 있는 운영법과
          플레이 근거를 단계별로 더합니다.
        </p>
      </div>

      <DeckCodeStep
        authenticated={Boolean(user)}
        authConfigured={isSupabaseConfigured()}
      />
    </div>
  );
}
