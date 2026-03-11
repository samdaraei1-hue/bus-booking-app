"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";

type Viewer = {
  id: string;
  businessRole: string | null;
  systemRole: string | null;
} | null;

export default function Navbar({ lang }: { lang: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT(lang);

  const [viewer, setViewer] = useState<Viewer>(null);
  const [loading, setLoading] = useState(true);

  const loadViewer = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setViewer(null);
      setLoading(false);
      return;
    }

    const [{ data: userRow }, { data: roleRow }] = await Promise.all([
      supabase.from("users").select("role").eq("id", user.id).single(),
      supabase.from("user_roles").select("role").eq("user_id", user.id).single(),
    ]);

    setViewer({
      id: user.id,
      businessRole: userRow?.role ?? null,
      systemRole: roleRow?.role ?? "user",
    });

    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!mounted) return;
      await loadViewer();
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      if (!mounted) return;
      await loadViewer();
      router.refresh();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const dashboardAllowed = useMemo(() => {
    if (!viewer) return false;
    return (
      viewer.systemRole === "admin" ||
      viewer.businessRole === "leader" ||
      viewer.businessRole === "owner"
    );
  }, [viewer]);

  const switchLangHref = (to: string) => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return `/${to}`;
    parts[0] = to;
    return `/${parts.join("/")}`;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setViewer(null);
    router.push(`/${lang}`);
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-white/70 backdrop-blur-xl shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href={`/${lang}`}
          className="flex items-center gap-3 text-2xl font-extrabold text-rose-600"
        >
          <img src="/logo.png" alt="Energy Travel" className="h-10 w-10 object-contain" />
          <span>{t("navbar.brand", "Energy Travel")}</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href={`/${lang}/travels`} className="font-medium text-zinc-700 transition hover:text-rose-600">
            {t("navbar.travels", "سفرها")}
          </Link>

          {!loading && viewer ? (
            <>
              <Link href={`/${lang}/my-bookings`} className="font-medium text-zinc-700 transition hover:text-rose-600">
                {t("navbar.my_bookings", "رزروهای من")}
              </Link>

              <Link href={`/${lang}/profile`} className="font-medium text-zinc-700 transition hover:text-rose-600">
                {t("navbar.profile", "پروفایل")}
              </Link>

              {dashboardAllowed ? (
                <Link href={`/${lang}/dashboard`} className="font-medium text-zinc-700 transition hover:text-rose-600">
                  {t("navbar.dashboard", "داشبورد")}
                </Link>
              ) : null}

              <button
                type="button"
                onClick={logout}
                className="font-medium text-zinc-700 transition hover:text-rose-600"
              >
                {t("common.logout", "خروج")}
              </button>
            </>
          ) : null}

          {!loading && !viewer ? (
            <Link href={`/${lang}/login`} className="font-medium text-zinc-700 transition hover:text-rose-600">
              {t("navbar.login", "ورود")}
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-2">
          {["fa", "en", "de"].map((code) => (
            <Link
              key={code}
              href={switchLangHref(code)}
              className={[
                "rounded-full px-3 py-2 text-xs font-bold transition",
                code === lang
                  ? "bg-rose-600 text-white shadow"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
              ].join(" ")}
            >
              {code.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}