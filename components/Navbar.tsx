"use client";

import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";
import { useViewer } from "@/lib/auth/useViewer.client";

export default function Navbar({ lang }: { lang: string }) {
  const pathname = usePathname();
  const t = useT(lang);
  const { viewer, loading, dashboardAllowed } = useViewer();

  const switchLangHref = (to: string) => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return `/${to}`;
    parts[0] = to;
    return `/${parts.join("/")}`;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = `/${lang}/login`;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-white/70 backdrop-blur-xl shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a
          href={`/${lang}`}
          className="flex items-center gap-3 text-2xl font-extrabold text-rose-600"
        >
          <img src="/logo.png" alt="Energy Travel" className="h-10 w-10 object-contain" />
          <span>{t("navbar.brand", "Energy Travel")}</span>
        </a>

        <nav className="hidden items-center gap-6 md:flex">
          <a href={`/${lang}/travels`} className="font-medium text-zinc-700 transition hover:text-rose-600">
            {t("navbar.travels", "Trips / Programs")}
          </a>

          {!loading && viewer ? (
            <>
              <a href={`/${lang}/my-bookings`} className="font-medium text-zinc-700 transition hover:text-rose-600">
                {t("navbar.my_bookings", "رزروهای من")}
              </a>

              <a href={`/${lang}/profile`} className="font-medium text-zinc-700 transition hover:text-rose-600">
                {t("navbar.profile", "پروفایل")}
              </a>

              {dashboardAllowed ? (
                <a href={`/${lang}/dashboard`} className="font-medium text-zinc-700 transition hover:text-rose-600">
                  {t("navbar.dashboard", "داشبورد")}
                </a>
              ) : null}

              <button
                type="button"
                onClick={logout}
                className="font-medium text-zinc-700 transition hover:text-rose-600 cursor-pointer"
              >
                {t("common.logout", "خروج")}
              </button>
            </>
          ) : null}

          {!loading && !viewer ? (
            <a href={`/${lang}/login`} className="font-medium text-zinc-700 transition hover:text-rose-600">
              {t("navbar.login", "ورود")}
            </a>
          ) : null}
        </nav>

        <div className="flex items-center gap-2">
          {["fa", "en", "de"].map((code) => (
            <a
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
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}
