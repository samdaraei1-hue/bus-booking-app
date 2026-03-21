"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Travel } from "@/lib/types";
import { useT } from "@/lib/translations/useT.client";
import { getTravelTranslationsMap } from "@/lib/translations/getTravelTranslation.client";
import TravelCard from "@/components/travel/TravelCard";

export default function TravelsPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const t = useT(lang);

  const [localizedTravels, setLocalizedTravels] = useState<Travel[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setMsg(null);

      try {
        const { data, error } = await supabase.from("travels").select("*");

        if (!mounted) return;

        if (error) {
          setLocalizedTravels([]);
          setMsg(error.message);
          return;
        }

        const rows = (data ?? []) as Travel[];
        const translations = await getTravelTranslationsMap(
          rows.map((travel) => travel.id),
          lang
        );

        const localized = rows.map((travel: Travel) => {
          const translated = translations[travel.id] ?? {};
          return {
            ...travel,
            name: translated.name ?? travel.name,
            origin: translated.origin ?? travel.origin,
            destination: translated.destination ?? travel.destination,
            description: translated.description ?? travel.description,
          };
        });

        if (!mounted) return;
        setLocalizedTravels(localized);
      } catch (error) {
        if (!mounted) return;
        setLocalizedTravels([]);
        setMsg(
          error instanceof Error ? error.message : "Failed to load travels"
        );
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [lang]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="h-96 animate-pulse rounded-3xl bg-zinc-100" />
      </main>
    );
  }

  if (msg) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
          <h1 className="text-2xl font-bold">{t("error")}</h1>
          <p className="mt-2 text-sm text-zinc-600">{msg}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">
          {t("page.travels.title", "Trips & Events")}
        </h1>
        {/* <p className="mt-2 text-zinc-600">{t("page.travels.description") || "Find and book your next adventure"}</p> */}
      </div>

      {localizedTravels.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
          <p className="text-center text-zinc-500">
            {t("page.travels.no_travels", "No trips or events available at the moment")}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {localizedTravels.map((travel) => (
            <TravelCard key={travel.id} travel={travel} lang={lang} />
          ))}
        </div>
      )}
    </main>
  );
}
