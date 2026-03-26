"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";
import { clearViewerCache, useViewer } from "@/lib/auth/useViewer.client";

export default function Navbar({ lang }: { lang: string }) {
  const pathname = usePathname();
  const t = useT(lang);
  const { viewer, loading, dashboardAllowed } = useViewer();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const switchLangHref = (to: string) => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return `/${to}`;
    parts[0] = to;
    return `/${parts.join("/")}`;
  };

  const logout = async () => {
    setLoggingOut(true);
    clearViewerCache();

    void supabase.auth.signOut().catch((error) => {
      console.error("Failed to sign out cleanly", error);
    });

    window.location.replace(`/${lang}/login`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-white/70 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href={`/${lang}`}
          className="flex items-center gap-3 text-2xl font-extrabold text-rose-600"
        >
          <img
            src="/logo.png"
            alt="Energy Travel"
            className="h-10 w-10 object-contain"
          />
          <span>{t("navbar.brand", "Energy Travel")}</span>
        </Link>

        {/* Mobile Menu Button */}
        <button 
          className="block md:hidden p-2 text-zinc-700" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMenuOpen 
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />}
          </svg>
        </button>

        <nav className={`${isMenuOpen ? "flex" : "hidden"} absolute left-0 top-full w-full flex-col items-start gap-4 border-b bg-white p-6 shadow-lg md:static md:flex md:w-auto md:flex-row md:items-center md:gap-6 md:border-none md:p-0 md:shadow-none`}>
          <Link
            href={`/${lang}/travels`}
            className="font-medium text-zinc-700 transition hover:text-rose-600"
          >
            {t("navbar.travels", "Trips / Programs")}
          </Link>

          {!loading && viewer ? (
            <>
              <Link
                href={`/${lang}/my-bookings`}
                className="font-medium text-zinc-700 transition hover:text-rose-600"
              >
                {t("navbar.my_bookings", "رزروهای من")}
              </Link>

              <Link
                href={`/${lang}/profile`}
                className="font-medium text-zinc-700 transition hover:text-rose-600"
              >
                {t("navbar.profile", "پروفایل")}
              </Link>

              {dashboardAllowed ? (
                <Link
                  href={`/${lang}/dashboard`}
                  className="font-medium text-zinc-700 transition hover:text-rose-600"
                >
                  {t("navbar.dashboard", "داشبورد")}
                </Link>
              ) : null}

              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="cursor-pointer font-medium text-zinc-700 transition hover:text-rose-600"
              >
                {loggingOut
                  ? t("common.loading", "Loading...")
                  : t("common.logout", "خروج")}
              </button>
            </>
          ) : null}

          {!loading && !viewer ? (
            <Link
              href={`/${lang}/login`}
              className="font-medium text-zinc-700 transition hover:text-rose-600"
            >
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
