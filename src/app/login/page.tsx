import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "로그인",
  description: "이메일 매직 링크로 HearthDeck Hub에 로그인하세요.",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "/");
  const user = await getCurrentUser();
  if (user) redirect(next);

  return (
    <div className="page-shell py-12 sm:py-20">
      <section className="surface mx-auto max-w-md rounded-[1.6rem] p-6 sm:p-8">
        <span className="eyebrow">Passwordless sign in</span>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.05em]">
          이메일로 로그인
        </h1>
        <p className="section-copy mt-3">
          비밀번호 없이 한 번만 사용할 수 있는 링크를 보내드립니다. 로그인
          후 원래 하던 작업으로 돌아갑니다.
        </p>
        {params.error && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">
            로그인 링크가 만료됐거나 올바르지 않습니다. 새 링크를
            요청해주세요.
          </p>
        )}
        <LoginForm next={next} configured={isSupabaseConfigured()} />
      </section>
    </div>
  );
}
