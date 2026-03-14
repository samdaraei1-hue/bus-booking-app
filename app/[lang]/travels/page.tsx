"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Travel } from "@/lib/types";
import { useT } from "@/lib/translations/useT.client";
import { getTravelTranslations } from "@/lib/translations/getTravelTranslation.client";
import TravelCard from "@/components/travel/TravelCard";

export default function TravelsPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const t = useT(lang);

  const [travels, setTravels] = useState<Travel[]>([]);
  const [localizedTravels, setLocalizedTravels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setMsg(null);

      const { data, error } = await supabase
        .from("travels")
        .select("*");

      if (!mounted) return;

      if (error) {
        setTravels([]);
        setMsg(error.message);
        setLoading(false);
        return;
      }

      setTravels(data as Travel[]);

      // Fetch translations for each travel
      const localized = await Promise.all(
        data.map(async (travel: Travel) => {
          const translated = await getTravelTranslations(travel.id, lang);
          return {
            ...travel,
            name: translated.name ?? travel.name,
            origin: translated.origin ?? travel.origin,
            destination: translated.destination ?? travel.destination,
            description: translated.description ?? travel.description,
          };
        })
      );

      setLocalizedTravels(localized);
      setLoading(false);
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
        <h1 className="text-3xl font-bold text-zinc-900">{t("page.travels.title") || "Available Travels"}</h1>
        {/* <p className="mt-2 text-zinc-600">{t("page.travels.description") || "Find and book your next adventure"}</p> */}
      </div>

      {localizedTravels.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
          <p className="text-center text-zinc-500">{t("page.travels.no_travels") || "No travels available at the moment"}</p>
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