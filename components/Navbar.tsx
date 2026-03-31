"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

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

  const navLinkClass =
    "rounded-2xl px-3 py-2 font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-rose-600 md:px-0 md:py-0 md:hover:bg-transparent";

  const languageButtons = (
    <>
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
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-white/70 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href={`/${lang}`}
          className="flex min-w-0 items-center gap-3 text-lg font-extrabold text-rose-600 sm:text-2xl"
        >
          <img
            src="/logo.png"
            alt="Energy Travel"
            className="h-9 w-9 object-contain sm:h-10 sm:w-10"
          />
          <span className="truncate">{t("navbar.brand", "Energy Travel")}</span>
        </Link>

        <div className="flex items-center gap-2 md:order-3">
          <div className="hidden items-center gap-2 sm:flex">{languageButtons}</div>

          <button
            className="block rounded-2xl border border-zinc-200 bg-white p-2 text-zinc-700 md:hidden"
            onClick={() => setIsMenuOpen((current) => !current)}
            aria-label="Toggle navigation menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16m-7 6h7"
                />
              )}
            </svg>
          </button>
        </div>

        <nav
          className={`${
            isMenuOpen ? "flex" : "hidden"
          } order-4 w-full flex-col items-stretch gap-2 rounded-3xl border border-zinc-200 bg-white/95 p-3 shadow-lg md:order-2 md:flex md:w-auto md:flex-row md:items-center md:gap-6 md:border-none md:bg-transparent md:p-0 md:shadow-none`}
        >
          <Link href={`/${lang}/travels`} className={navLinkClass}>
            {t("navbar.travels", "Trips / Programs")}
          </Link>

          {!loading && viewer ? (
            <>
              <Link href={`/${lang}/my-bookings`} className={navLinkClass}>
                {t("navbar.my_bookings", "My Bookings")}
              </Link>

              <Link href={`/${lang}/profile`} className={navLinkClass}>
                {t("navbar.profile", "Profile")}
              </Link>

              {dashboardAllowed ? (
                <Link href={`/${lang}/dashboard`} className={navLinkClass}>
                  {t("navbar.dashboard", "Dashboard")}
                </Link>
              ) : null}

              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className={`${navLinkClass} cursor-pointer text-start`}
              >
                {loggingOut
                  ? t("common.loading", "Loading...")
                  : t("common.logout", "Logout")}
              </button>
            </>
          ) : null}

          {!loading && !viewer ? (
            <Link href={`/${lang}/login`} className={navLinkClass}>
              {t("navbar.login", "Login")}
            </Link>
          ) : null}

          <div className="mt-2 flex items-center gap-2 border-t border-zinc-200 pt-3 sm:hidden">
            {languageButtons}
          </div>
        </nav>
      </div>
    </header>
  );
}
