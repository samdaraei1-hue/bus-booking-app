"use client";

import Link from "next/link";
import { useT } from "@/lib/translations/useT.client";
import { useViewer } from "@/lib/auth/useViewer.client";

export default function Footer({ lang }: { lang: string }) {
  const t = useT(lang);
  const { viewer, loading } = useViewer();

  return (
    <footer className="mt-24 bg-zinc-950 text-zinc-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <h3 className="mb-3 text-xl font-bold text-white">
            {t("navbar.brand", "Energy Travel")}
          </h3>
          <p className="text-sm leading-7 text-zinc-400">
            {t(
              "footer.brand_description",
              "A safe and enjoyable experience for group trips and programs with simple, fast, and modern booking."
            )}
          </p>
        </div>

        <div>
          <h4 className="mb-3 font-semibold text-white">
            {t("footer.useful_links", "Useful Links")}
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link className="transition hover:text-white" href={`/${lang}/travels`}>
                {t("navbar.travels", "Trips / Programs")}
              </Link>
            </li>
            {!loading && viewer ? (
              <>
                <li>
                  <Link className="transition hover:text-white" href={`/${lang}/profile`}>
                    {t("navbar.profile", "Profile")}
                  </Link>
                </li>
                <li>
                  <Link className="transition hover:text-white" href={`/${lang}/my-bookings`}>
                    {t("navbar.my_bookings", "My Bookings")}
                  </Link>
                </li>
              </>
            ) : (
              <li>
                <Link className="transition hover:text-white" href={`/${lang}/login`}>
                  {t("navbar.login", "Login")}
                </Link>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-semibold text-white">
            {t("footer.follow_us", "Follow Us")}
          </h4>
          <div className="flex flex-col gap-2 text-sm">
            <a
              className="transition hover:text-white"
              href="https://www.instagram.com/energy_travel.de/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
            <a
              className="transition hover:text-white"
              href="https://t.me/Energy_Travel24"
              target="_blank"
              rel="noopener noreferrer"
            >
              Telegram
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 pb-6 pt-4 text-center text-xs text-zinc-500 sm:px-6">
        © 2026 Energy Travel
      </div>
    </footer>
  );
}
