"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Travel } from "@/lib/types";
import { useT } from "@/lib/translations/useT.client";
import { getTravelTranslations } from "@/lib/translations/getTravelTranslation.client";

export default function DashboardTravelsPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const router = useRouter();
  const t = useT(lang);

  const [travels, setTravels] = useState<Travel[]>([]);
  const [travelTranslations, setTravelTranslations] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTravels();
  }, []);

  const fetchTravels = async () => {
    const { data, error } = await supabase.from("travels").select("*");
    if (error) console.error(error);
    else {
      setTravels(data || []);
      // Fetch translations for each travel
      const translations: Record<string, Record<string, string>> = {};
      for (const travel of data || []) {
        const translated = await getTravelTranslations(travel.id, lang);
        translations[travel.id] = translated;
      }
      setTravelTranslations(translations);
    }
    setLoading(false);
  };

  const deleteTravel = async (id: string) => {
    if (!confirm(t("confirm.delete", "آیا مطمئن هستید؟"))) return;
    const { error } = await supabase.from("travels").delete().eq("id", id);
    if (error) console.error(error);
    else fetchTravels();
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">{t("page.dashboard.travels", "مدیریت سفرها")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("page.dashboard.travels_desc", "ایجاد، ویرایش و مشاهده سفرها")}</p>
      </div>

      <div className="mb-6">
        <button
          onClick={() => router.push(`/${lang}/dashboard/travels/new`)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          {t("button.add_new", "افزودن جدید")}
        </button>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-start p-2">{t("dashboardtravels.name", "نام")}</th>
              <th className="text-start p-2">{t("page.travel_detail.origin", "مبدا")}</th>
              <th className="text-start p-2">{t("page.travel_detail.destination", "مقصد")}</th>
              <th className="text-start p-2">{t("page.travel_detail.departure", "تاریخ حرکت")}</th>
              <th className="text-start p-2">{t("page.travel_detail.price", "قیمت")}</th>
              <th className="text-start p-2">{t("dashboardtravels.actions", "عملیات")}</th>
            </tr>
          </thead>
          <tbody>
            {travels.map((travel) => {
              const i18n = travelTranslations[travel.id] || {};
              const localized = {
                name: i18n.name ?? travel.name,
                origin: i18n.origin ?? travel.origin,
                destination: i18n.destination ?? travel.destination,
              };
              return (
                <tr key={travel.id} className="border-b">
                  <td className="p-2">{localized.name}</td>
                  <td className="p-2">{localized.origin}</td>
                  <td className="p-2">{localized.destination}</td>
                  <td className="p-2">{new Date(travel.departure_at).toLocaleDateString()}</td>
                  <td className="p-2">{travel.price}</td>
                  <td className="p-2">
                    <button
                      onClick={() => router.push(`/${lang}/dashboard/travels/${travel.id}/edit`)}
                      className="mr-2 text-blue-600 hover:underline"
                    >
                      {t("button.edit", "ویرایش")}
                    </button>
                    <button
                      onClick={() => deleteTravel(travel.id)}
                      className="text-red-600 hover:underline"
                    >
                      {t("button.delete", "حذف")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}