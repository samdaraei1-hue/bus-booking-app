"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  profile_completed: boolean | null;
};

export default function ProfilePage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const router = useRouter();
  const t = useT(lang);

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setMsg(null);

      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;

        if (!mounted) return;

        if (!user) {
          router.push(`/${lang}/login`);
          return;
        }

        setUserEmail(user.email ?? null);

        const { data: p, error } = await supabase
          .from("users")
          .select("id, name, email, phone, role, profile_completed")
          .eq("id", user.id)
          .single();

        if (!mounted) return;

        if (error) {
          setProfile(null);
          setName("");
          setPhone("");
          setMsg(error.message);
          return;
        }

        const prof = (p as Profile) ?? null;
        setProfile(prof);
        setName(prof?.name ?? "");
        setPhone(prof?.phone ?? "");
      } catch (error) {
        if (!mounted) return;
        setProfile(null);
        setName("");
        setPhone("");
        setMsg(
          error instanceof Error ? error.message : "Failed to load profile"
        );
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [lang, router]);

  const save = async () => {
    setMsg(null);

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    const safeRole = profile?.role ?? "passenger";

    const payload = {
      id: user.id,
      name: name || null,
      email: user.email ?? null,
      phone: phone || null,
      role: safeRole,
      profile_completed: Boolean(name && phone),
    };

    const { error } = await supabase.from("users").upsert(payload);

    if (error) {
      setMsg(error.message);
      return;
    }

    setProfile(() => ({
      id: user.id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
      profile_completed: payload.profile_completed,
    }));

    setMsg(t("page.profile.saved"));
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push(`/${lang}`);
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-md px-6 py-12">
        <div className="h-56 animate-pulse rounded-3xl bg-zinc-100" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">{t("page.profile.title")}</h1>
            <p className="mt-1 text-sm text-zinc-600">{userEmail}</p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
          >
            {t("common.logout")}
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-700" htmlFor="name">
              {t("page.profile.full_name")}
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700" htmlFor="phone">
              {t("page.profile.phone")}
            </label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
            />
          </div>

          <button
            type="button"
            onClick={save}
            className="w-full rounded-2xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-rose-700"
          >
            {t("page.profile.save_changes")}
          </button>

          {msg ? <div className="text-sm text-zinc-700">{msg}</div> : null}
        </div>

        <div className="mt-6 rounded-2xl bg-zinc-50 p-4 text-xs text-zinc-600">
          {t("page.profile.storage_note")}
        </div>
      </div>
    </main>
  );
}
