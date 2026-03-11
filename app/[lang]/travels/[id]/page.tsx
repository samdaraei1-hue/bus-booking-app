"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Travel } from "@/lib/types";
import { useT } from "@/lib/translations/useT.client";
import { getTravelTranslations } from "@/lib/translations/getTravelTranslation.client";

export default function TravelDetailPage() {
  const params = useParams<{ lang: string; id: string }>();
  const lang = params.lang;
  const id = params.id;
  const router = useRouter();
  const t = useT(lang);

  const [travel, setTravel] = useState<Travel | null>(null);
  const [travelI18n, setTravelI18n] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setMsg(null);

      const { data, error } = await supabase
        .from("travels")
        .select("*")
        .eq("id", id)
        .single();

      if (!mounted) return;

      if (error || !data) {
        setTravel(null);
        setMsg(error?.message ?? "Travel not found");
        setLoading(false);
        return;
      }

      setTravel(data as Travel);

      const translated = await getTravelTranslations(id, lang);

      if (!mounted) return;
      setTravelI18n(translated);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [id, lang]);

  const localizedTravel = useMemo(() => {
    if (!travel) return null;

    return {
      ...travel,
      name: travelI18n.name ?? travel.name,
      origin: travelI18n.origin ?? travel.origin,
      destination: travelI18n.destination ?? travel.destination,
      description: travelI18n.description ?? travel.description,
    };
  }, [travel, travelI18n]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="h-96 animate-pulse rounded-3xl bg-zinc-100" />
      </main>
    );
  }

  if (!localizedTravel) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
          <h1 className="text-2xl font-bold">{t("page.travel_detail.not_found")}</h1>
          {msg ? <p className="mt-2 text-sm text-zinc-600">{msg}</p> : null}
        </div>
      </main>
    );
  }

  const locale =
    lang === "fa" ? "fa-IR" : lang === "de" ? "de-DE" : "en-US";

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[32px] bg-white shadow-sm ring-1 ring-zinc-200">
          <div className="relative h-[320px]">
            <img
              src="/images/travel.jpg"
              alt={localizedTravel.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
            <div className="absolute bottom-6 right-6 left-6 text-white">
              <div className="mb-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur">
                Energy Travel
              </div>
              <h1 className="text-3xl font-extrabold">{localizedTravel.name}</h1>
              <p className="mt-2 text-sm text-white/90">
                {localizedTravel.origin} → {localizedTravel.destination}
              </p>
            </div>
          </div>

          <div className="p-6">
            <h2 className="mb-3 text-lg font-bold text-zinc-900">
              {t("page.travel_detail.description_title")}
            </h2>
            <p className="whitespace-pre-line leading-8 text-zinc-700">
              {localizedTravel.description || "—"}
            </p>
          </div>
        </div>

        <aside className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-2xl font-extrabold text-zinc-900">
            {t("page.travel_detail.details_title")}
          </h2>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-xs text-zinc-500">
                {t("page.travel_detail.origin")}
              </div>
              <div className="mt-1 font-bold text-zinc-900">
                {localizedTravel.origin}
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-xs text-zinc-500">
                {t("page.travel_detail.destination")}
              </div>
              <div className="mt-1 font-bold text-zinc-900">
                {localizedTravel.destination}
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-xs text-zinc-500">
                {t("page.travel_detail.departure")}
              </div>
              <div className="mt-1 font-bold text-zinc-900">
                {new Date(localizedTravel.departure_at).toLocaleString(locale)}
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-xs text-zinc-500">
                {t("page.travel_detail.return")}
              </div>
              <div className="mt-1 font-bold text-zinc-900">
                {new Date(localizedTravel.return_at).toLocaleString(locale)}
              </div>
            </div>

            <div className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100">
              <div className="text-xs text-rose-700">
                {t("page.travel_detail.price")}
              </div>
              <div className="mt-1 text-2xl font-extrabold text-rose-600">
                €{localizedTravel.price}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/${lang}/seat-map?travel=${encodeURIComponent(localizedTravel.id)}`
                )
              }
              className="mt-2 w-full rounded-2xl bg-rose-600 px-6 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-rose-700"
            >
              {t("page.travel_detail.continue_booking")}
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}