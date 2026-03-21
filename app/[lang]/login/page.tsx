"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";

export default function LoginPage() {
  const router = useRouter();
  const params = useParams<{ lang: string }>();
  const searchParams = useSearchParams();
  const lang = params.lang;
  const t = useT(lang);
  const next = searchParams.get("next") || `/${lang}`;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;

      if (!mounted || !user) return;
      router.replace(next);
    })();

    return () => {
      mounted = false;
    };
  }, [next, router]);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      setMsg(null);

      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/${lang}/login?next=${encodeURIComponent(next)}`,
        },
      });

    } catch (err) {
      setMsg("An unexpected error occurred.");
      setLoading(false);
    }
  };

  const sendMagicLink = async () => {
    try {
      setLoading(true);
      setMsg(null);

      await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/${lang}/login?next=${encodeURIComponent(next)}`,
        },
      });

    } catch (err) {
      setMsg("لینک ورود به ایمیل شما ارسال شد.");
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-2xl font-extrabold">{t("page.login.title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("page.login.subtitle")}</p>

        <button
          type="button"
          onClick={loginWithGoogle}
          disabled={loading}
          className="mt-6 w-full rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-60"
        >
          {t("page.login.google")}
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <div className="text-xs text-zinc-500">یا</div>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <label className="block text-sm font-semibold text-zinc-700" htmlFor="email">
          {t("page.login.email_label")}
        </label>
        <input
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="you@example.com"
          className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
        />

        <button
          type="button"
          onClick={sendMagicLink}
          disabled={loading || !email}
          className="mt-4 w-full rounded-2xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {t("page.login.send_magic_link")}
        </button>

        {msg ? <div className="mt-4 text-sm text-zinc-700">{msg}</div> : null}

        <button
          type="button"
          onClick={() => router.push(`/${lang}`)}
          className="mt-6 w-full rounded-2xl bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
        >
          {t("page.login.back_home")}
        </button>
      </div>
    </main>
  );
}
