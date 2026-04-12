"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Travel } from "@/lib/types";
import { useT } from "@/lib/translations/useT.client";
import { getTravelTranslations } from "@/lib/translations/getTravelTranslation.client";
import {
  getOfferingKind,
  isLocationOnlyOffering,
  isSeatMapBooking,
} from "@/lib/offerings";

function getItemTypeLabel(kind: string, t: (key: string, fallback?: string) => string) {
  if (kind === "event") return t("travel.type.event", "Event");
  if (kind === "hiking") return t("travel.type.hiking", "Hiking");
  if (kind === "walking") return t("travel.type.walking", "Walking");
  if (kind === "camping") return t("travel.type.camping", "Camping");
  if (kind === "mixed_trip") return t("travel.type.mixed_trip", "Mixed trip");
  if (kind === "trip") return t("travel.type.travel", "Trip");
  return t("travel.type.custom", "Program");
}

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

      if (!id) {
        setMsg("Missing item id");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("travels")
          .select("*")
          .eq("id", id)
          .single();

        if (!mounted) return;

        if (error || !data) {
          setTravel(null);
          setMsg(error?.message ?? "Item not found");
          setLoading(false);
          return;
        }

        setTravel(data as Travel);

        const translated = await getTravelTranslations(id, lang);
        if (!mounted) return;
        setTravelI18n(translated);
      } catch (err) {
        if (!mounted) return;
        setTravel(null);
        setMsg(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
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
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="h-96 animate-pulse rounded-3xl bg-zinc-100" />
      </main>
    );
  }

  if (!localizedTravel) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
          <h1 className="text-2xl font-bold">
            {t("page.travel_detail.not_found", "Item not found")}
          </h1>
          {msg ? <p className="mt-2 text-sm text-zinc-600">{msg}</p> : null}
        </div>
      </main>
    );
  }

  const locale = lang === "fa" ? "de-DE" : lang === "de" ? "de-DE" : "en-US";
  const imageSrc = localizedTravel.image_url || "/images/travel.jpg";
  const kind = getOfferingKind(localizedTravel.kind ?? localizedTravel.type);
  const itemType = getItemTypeLabel(kind, t);
  const locationText = isLocationOnlyOffering(localizedTravel)
    ? localizedTravel.origin
    : `${localizedTravel.origin} -> ${localizedTravel.destination}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-8">
        <div className="overflow-hidden rounded-[32px] bg-white shadow-sm ring-1 ring-zinc-200">
          <div className="relative h-[240px] sm:h-[320px]">
            <img
              src={imageSrc}
              alt={localizedTravel.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <div className="mb-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur">
                {itemType}
              </div>
              <h1 className="text-2xl font-extrabold sm:text-3xl">
                {localizedTravel.name}
              </h1>
              <p className="mt-2 text-sm text-white/90">{locationText}</p>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <h2 className="mb-3 text-lg font-bold text-zinc-900">
              {t("page.travel_detail.description_title", "Description")}
            </h2>
            <p className="whitespace-pre-line leading-7 text-zinc-700 sm:leading-8">
              {localizedTravel.description || "-"}
            </p>
          </div>
        </div>

        <aside className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:p-6 lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-xl font-extrabold text-zinc-900 sm:text-2xl">
            {t("page.travel_detail.details_title", "Details")}
          </h2>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-xs text-zinc-500">
                {isLocationOnlyOffering(localizedTravel)
                  ? t("event.venue", "Venue")
                  : t("page.travel_detail.origin", "Origin")}
              </div>
              <div className="mt-1 font-bold text-zinc-900">
                {localizedTravel.origin}
              </div>
            </div>

            {!isLocationOnlyOffering(localizedTravel) ? (
              <div className="rounded-2xl bg-zinc-50 p-4">
                <div className="text-xs text-zinc-500">
                  {t("page.travel_detail.destination", "Destination")}
                </div>
                <div className="mt-1 font-bold text-zinc-900">
                  {localizedTravel.destination}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-xs text-zinc-500">
                {kind === "event"
                  ? t("event.start", "Program start")
                  : t("page.travel_detail.departure", "Departure")}
              </div>
              <div className="mt-1 font-bold text-zinc-900">
                {new Date(localizedTravel.departure_at).toLocaleString(locale)}
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-xs text-zinc-500">
                {kind === "event"
                  ? t("event.end", "Program end")
                  : t("page.travel_detail.return", "Return")}
              </div>
              <div className="mt-1 font-bold text-zinc-900">
                {new Date(localizedTravel.return_at).toLocaleString(locale)}
              </div>
            </div>

            <div className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100">
              <div className="text-xs text-rose-700">
                {t("page.travel_detail.price", "Price")}
              </div>
              <div className="mt-1 text-xl font-extrabold text-rose-600 sm:text-2xl">
                EUR {localizedTravel.price}
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
              {isSeatMapBooking(localizedTravel)
                ? t("page.travel_detail.continue_booking", "Continue Booking")
                : t("page.travel_detail.register_now", "Register Now")}
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}
