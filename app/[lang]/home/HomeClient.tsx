"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Travel } from "@/lib/types";
import TravelCard from "@/components/travel/TravelCard";
import { useT } from "@/lib/translations/useT.client";
import { useViewer } from "@/lib/auth/useViewer.client";

export default function HomeClient({ lang }: { lang: string }) {
  const router = useRouter();
  const t = useT(lang);
  const { viewer, loading: authLoading, dashboardAllowed } = useViewer();

  const [travels, setTravels] = useState<Travel[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase
        .from("travels")
        .select("*")
        .order("departure_at", { ascending: true })
        .limit(3);

      if (!mounted) return;
      setTravels((data ?? []) as Travel[]);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="space-y-24">
      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/hero.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/45 to-black/60" />

        <div className="relative mx-auto flex min-h-[78vh] max-w-7xl items-center px-6 py-24 text-white">
          <div className="max-w-3xl">
            <span className="mb-4 inline-block rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
              Energy Travel
            </span>

            <h1 className="mb-6 text-4xl font-extrabold leading-tight md:text-6xl">
              {t("page.home.hero.title")}
            </h1>

            <p className="mb-10 max-w-2xl text-lg leading-8 text-white/90">
              {t("page.home.hero.subtitle")}
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => router.push(`/${lang}/travels`)}
                className="rounded-2xl bg-rose-600 px-8 py-4 font-bold text-white shadow-lg transition hover:scale-[1.02] hover:bg-rose-700"
              >
                {t("page.home.hero.cta_primary")}
              </button>

              {!authLoading && !viewer ? (
                <button
                  onClick={() => router.push(`/${lang}/login`)}
                  className="rounded-2xl border border-white/40 bg-white/10 px-8 py-4 font-bold text-white backdrop-blur transition hover:bg-white/20"
                >
                  {t("page.home.hero.cta_secondary")}
                </button>
              ) : null}

              {!authLoading && viewer ? (
                <>
                  <button
                    onClick={() => router.push(`/${lang}/my-bookings`)}
                    className="rounded-2xl border border-white/40 bg-white/10 px-8 py-4 font-bold text-white backdrop-blur transition hover:bg-white/20"
                  >
                    {t("navbar.my_bookings", "رزروهای من")}
                  </button>

                  {dashboardAllowed ? (
                    <button
                      onClick={() => router.push(`/${lang}/dashboard`)}
                      className="rounded-2xl border border-white/40 bg-white/10 px-8 py-4 font-bold text-white backdrop-blur transition hover:bg-white/20"
                    >
                      {t("navbar.dashboard", "داشبورد")}
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-zinc-900">
              {t("page.home.section.upcoming")}
            </h2>
            <p className="mt-2 text-zinc-600">
              {t("page.home.section.upcoming_subtitle")}
            </p>
          </div>

          <button
            onClick={() => router.push(`/${lang}/travels`)}
            className="rounded-xl bg-zinc-900 px-5 py-3 text-white transition hover:bg-zinc-800"
          >
            {t("page.home.hero.cta_primary")}
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {travels.map((travel) => (
            <TravelCard key={travel.id} travel={travel} lang={lang} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="overflow-hidden rounded-[32px] bg-gradient-to-r from-zinc-900 to-zinc-800 px-8 py-12 text-white md:px-12">
          <h3 className="mb-3 text-3xl font-bold">
            {t("page.home.cta.title")}
          </h3>
          <p className="mb-8 max-w-2xl text-white/80">
            {t("page.home.cta.subtitle")}
          </p>

          <button
            onClick={() =>
              router.push(viewer ? `/${lang}/travels` : `/${lang}/login`)
            }
            className="rounded-2xl bg-rose-600 px-8 py-4 font-bold text-white transition hover:bg-rose-700"
          >
            {viewer
              ? t("page.home.cta.button")
              : t("page.home.hero.cta_secondary")}
          </button>
        </div>
      </section>
    </main>
  );
}