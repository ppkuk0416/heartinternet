"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, Mail, Send } from "lucide-react";
import { safeNextPath } from "@/lib/auth/redirect";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

export function LoginForm({
  next,
  configured,
}: {
  next: string;
  configured: boolean;
}) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = getBrowserSupabaseClient();
    if (!client) {
      setError("Supabase Auth 환경 설정이 필요합니다.");
      return;
    }

    setPending(true);
    setError("");
    setMessage("");

    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", safeNextPath(next));
    const { error: authError } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback.toString() },
    });

    if (authError) {
      setError("로그인 링크를 보내지 못했습니다. 잠시 후 다시 시도해주세요.");
    } else {
      setMessage("이메일로 로그인 링크를 보냈습니다. 같은 브라우저에서 열어주세요.");
    }
    setPending(false);
  }

  return (
    <form onSubmit={submit} className="mt-7">
      <label htmlFor="email" className="text-sm font-extrabold">
        이메일
      </label>
      <div className="mt-2 flex h-12 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 focus-within:border-[var(--brand)]">
        <Mail size={17} className="text-[var(--muted)]" />
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="player@example.com"
          disabled={!configured}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      {!configured && (
        <p role="alert" className="mt-3 text-sm font-semibold text-amber-800">
          현재 환경에는 Supabase Auth가 연결되지 않았습니다.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm font-semibold text-emerald-800">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={!configured || pending || !email}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] text-sm font-extrabold text-white transition hover:bg-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? (
          <LoaderCircle size={17} className="animate-spin" />
        ) : (
          <Send size={16} />
        )}
        로그인 링크 받기
      </button>
    </form>
  );
}
