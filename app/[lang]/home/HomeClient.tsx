"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Travel } from "@/lib/types";
import TravelCard from "@/components/travel/TravelCard";
import { useT } from "@/lib/translations/useT.client";
import { useViewer } from "@/lib/auth/useViewer.client";
import { getTravelTranslationsMap } from "@/lib/translations/getTravelTranslation.client";

export default function HomeClient({ lang }: { lang: string }) {
  const t = useT(lang);
  const { viewer, loading: authLoading, dashboardAllowed } = useViewer();

  const [travels, setTravels] = useState<Travel[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await supabase
          .from("travels")
          .select("*")
          .order("departure_at", { ascending: true })
          .limit(3);

        if (!mounted) return;
        const rows = (data ?? []) as Travel[];
        const translations = await getTravelTranslationsMap(
          rows.map((travel) => travel.id),
          lang
        );

        if (!mounted) return;
        setTravels(
          rows.map((travel) => {
            const translated = translations[travel.id] ?? {};
            return {
              ...travel,
              name: translated.name ?? travel.name,
              origin: translated.origin ?? travel.origin,
              destination: translated.destination ?? travel.destination,
              description: translated.description ?? travel.description,
            };
          })
        );
      } catch (error) {
        if (!mounted) return;
        console.error("Failed to load home travels", error);
        setTravels([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [lang]);

  return (
    <main className="space-y-20 sm:space-y-24">
      <section className="relative isolate overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/hero.jpg')" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-black/45 to-black/60" />

        <div className="relative z-10 mx-auto flex min-h-[68vh] max-w-7xl items-center px-4 py-16 text-white sm:px-6 sm:py-20 md:min-h-[78vh] md:py-24">
          <div className="max-w-3xl">
            <span className="mb-4 inline-block rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
              Energy Travel
            </span>

            <h1 className="mb-6 text-3xl font-extrabold leading-tight sm:text-4xl md:text-6xl">
              {t("page.home.hero.title")}
            </h1>

            <p className="mb-8 max-w-2xl text-base leading-7 text-white/90 sm:text-lg sm:leading-8">
              {t("page.home.hero.subtitle")}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <Link
                href={`/${lang}/travels`}
                className="rounded-2xl bg-rose-600 px-6 py-4 text-center font-bold text-white shadow-lg transition hover:scale-[1.02] hover:bg-rose-700"
              >
                {t("page.home.hero.cta_primary")}
              </Link>

              {!authLoading && !viewer ? (
                <Link
                  href={`/${lang}/login`}
                  className="rounded-2xl border border-white/40 bg-white/10 px-6 py-4 text-center font-bold text-white backdrop-blur transition hover:bg-white/20"
                >
                  {t("page.home.hero.cta_secondary")}
                </Link>
              ) : null}

              {!authLoading && viewer ? (
                <>
                  <Link
                    href={`/${lang}/my-bookings`}
                    className="rounded-2xl border border-white/40 bg-white/10 px-6 py-4 text-center font-bold text-white backdrop-blur transition hover:bg-white/20"
                  >
                    {t("navbar.my_bookings", "My Bookings")}
                  </Link>

                  {dashboardAllowed ? (
                    <Link
                      href={`/${lang}/dashboard`}
                      className="rounded-2xl border border-white/40 bg-white/10 px-6 py-4 text-center font-bold text-white backdrop-blur transition hover:bg-white/20"
                    >
                      {t("navbar.dashboard", "Dashboard")}
                    </Link>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
              {t("page.home.section.upcoming")}
            </h2>
            <p className="mt-2 text-zinc-600">
              {t("page.home.section.upcoming_subtitle")}
            </p>
          </div>

          <Link
            href={`/${lang}/travels`}
            className="rounded-xl bg-zinc-300 px-5 py-3 text-center text-white transition hover:bg-zinc-800"
          >
            {t("page.home.hero.cta_primary")}
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {travels.map((travel) => (
            <TravelCard key={travel.id} travel={travel} lang={lang} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
        <div className="overflow-hidden rounded-[32px] bg-gradient-to-r from-zinc-900 to-zinc-800 px-6 py-10 text-white sm:px-8 md:px-12">
          <h3 className="mb-3 text-2xl font-bold sm:text-3xl">
            {t("page.home.cta.title")}
          </h3>
          <p className="mb-8 max-w-2xl text-white/80">
            {t("page.home.cta.subtitle")}
          </p>

          <Link
            href={viewer ? `/${lang}/travels` : `/${lang}/login`}
            className="inline-flex rounded-2xl bg-rose-600 px-8 py-4 font-bold text-white transition hover:bg-rose-700"
          >
            {viewer
              ? t("page.home.cta.button")
              : t("page.home.hero.cta_secondary")}
          </Link>
        </div>
      </section>
    </main>
  );
}
