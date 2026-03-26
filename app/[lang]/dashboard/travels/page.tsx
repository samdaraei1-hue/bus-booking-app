"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Travel } from "@/lib/types";
import { useT } from "@/lib/translations/useT.client";
import { getTravelTranslationsMap } from "@/lib/translations/getTravelTranslation.client";

export default function DashboardTravelsPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const router = useRouter();
  const t = useT(lang);

  const [travels, setTravels] = useState<Travel[]>([]);
  const [travelTranslations, setTravelTranslations] = useState<
    Record<string, Record<string, string>>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchTravels();
  }, [lang]);

  const fetchTravels = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.from("travels").select("*");
      if (error) {
        console.error(error);
        setTravels([]);
        setTravelTranslations({});
        return;
      }

      setTravels(data || []);
      const translations = await getTravelTranslationsMap(
        (data || []).map((travel) => travel.id),
        lang
      );
      setTravelTranslations(translations);
    } catch (error) {
      console.error(error);
      setTravels([]);
      setTravelTranslations({});
    } finally {
      setLoading(false);
    }
  };

  const deleteTravel = async (id: string) => {
    if (!confirm(t("confirm.delete", "آیا مطمئن هستید؟"))) return;

    // 1. ابتدا رکوردهای وابسته را حذف می‌کنیم تا خطای Foreign Key ایجاد نشود
    await supabase.from("travel_teams").delete().eq("travel_id", id);
    await supabase.from("translations").delete().eq("entity_id", id).eq("namespace", "travel");

    // 2. حالا خود سفر را حذف می‌کنیم
    const { error } = await supabase.from("travels").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert(t("error.delete_failed", "خطا در حذف: ") + error.message);
    } else {
      void fetchTravels();
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">
          {t("page.dashboard.travels", "Manage Trips & Events")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {t("page.dashboard.travels_desc", "Create, edit, and view trips and events")}
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={() => router.push(`/${lang}/dashboard/travels/create`)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          {t("button.add_new", "افزودن جدید")}
        </button>
      </div>

      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200 overflow-hidden">
        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-4 text-start font-semibold text-zinc-700">
                {t("travels.type", "Type")}
              </th>
              <th className="p-4 text-start font-semibold text-zinc-700">
                {t("dashboardtravels.name", "نام")}
              </th>
              <th className="p-4 text-start font-semibold text-zinc-700">
                {t("page.travel_detail.origin", "مبدا")}
              </th>
              <th className="p-4 text-start font-semibold text-zinc-700">
                {t("page.travel_detail.destination", "مقصد")}
              </th>
              <th className="p-4 text-start font-semibold text-zinc-700">
                {t("page.travel_detail.departure", "تاریخ حرکت")}
              </th>
              <th className="p-4 text-start font-semibold text-zinc-700">
                {t("page.travel_detail.price", "قیمت")}
              </th>
              <th className="p-4 text-start font-semibold text-zinc-700">
                {t("dashboardtravels.actions", "عملیات")}
              </th>
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
                  <td className="p-4">
                    {travel.type === "event"
                      ? t("travel.type.event", "Event")
                      : t("travel.type.travel", "Travel")}
                  </td>
                  <td className="p-4 font-medium">{localized.name}</td>
                  <td className="p-4">{localized.origin}</td>
                  <td className="p-4">{localized.destination || "-"}</td>
                  <td className="p-4">
                    {travel.departure_at ? new Date(travel.departure_at).toLocaleDateString() : "-"}
                  </td>
                  <td className="p-4 font-bold">{travel.price} €</td>
                  <td className="p-4">
                    <button
                      onClick={() =>
                        router.push(`/${lang}/dashboard/travels/${travel.id}/edit`)
                      }
                      className="mr-2 text-blue-600 hover:underline"
                    >
                      {t("button.edit", "ویرایش")}
                    </button>
                    <button
                      onClick={() =>
                        router.push(`/${lang}/dashboard/travels/${travel.id}/layout`)
                      }
                      className="mr-2 text-emerald-600 hover:underline"
                    >
                      Seat Layout
                    </button>
                    <button
                      onClick={() =>
                        router.push(`/${lang}/dashboard/travels/${travel.id}/translations`)
                      }
                      className="mr-2 text-violet-600 hover:underline"
                    >
                      Translations
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

        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-zinc-100">
          {travels.map((travel) => {
            const i18n = travelTranslations[travel.id] || {};
            const localized = {
              name: i18n.name ?? travel.name,
              origin: i18n.origin ?? travel.origin,
              destination: i18n.destination ?? travel.destination,
            };

            return (
              <div key={travel.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-600">
                    {travel.type === "event" ? t("travel.type.event", "Event") : t("travel.type.travel", "Travel")}
                  </span>
                  <span className="text-sm font-bold text-zinc-900">{travel.price} €</span>
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">{localized.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    {localized.origin} {localized.destination ? `→ ${localized.destination}` : ""}
                  </p>
                  <p className="mt-2 text-xs font-medium text-zinc-600">
                    📅 {travel.departure_at ? new Date(travel.departure_at).toLocaleDateString() : "-"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 pt-3 border-t border-zinc-50">
                  <button onClick={() => router.push(`/${lang}/dashboard/travels/${travel.id}/edit`)} className="text-sm font-semibold text-blue-600">
                    {t("button.edit", "ویرایش")}
                  </button>
                  <button onClick={() => router.push(`/${lang}/dashboard/travels/${travel.id}/layout`)} className="text-sm font-semibold text-emerald-600">
                    Layout
                  </button>
                  <button onClick={() => deleteTravel(travel.id)} className="text-sm font-semibold text-red-600">
                    {t("button.delete", "حذف")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
