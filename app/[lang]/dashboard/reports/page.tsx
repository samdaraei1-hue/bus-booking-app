"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Travel } from "@/lib/types";
import { useT } from "@/lib/translations/useT.client";
import { getTravelTranslations } from "@/lib/translations/getTravelTranslation.client";

type Report = {
  travel_id: string;
  title: string;
  capacity: number;
  reserved: number;
  available: number;
};

export default function DashboardReportsPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const t = useT(lang);

  const [reports, setReports] = useState<Report[]>([]);
  const [travelTranslations, setTravelTranslations] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    // This is a simplified report; in real app, you'd join tables
    const { data: travels, error: travelsError } = await supabase.from("travels").select("*");
    if (travelsError) console.error(travelsError);

    const { data: seats, error: seatsError } = await supabase.from("travel_bus_seats").select("travel_id");
    if (seatsError) console.error(seatsError);

    const { data: reservations, error: resError } = await supabase.from("bus_seat_reservations").select("travel_id");
    if (resError) console.error(resError);

    const capacityMap = new Map<string, number>();
    seats?.forEach((seat) => {
      capacityMap.set(seat.travel_id, (capacityMap.get(seat.travel_id) || 0) + 1);
    });

    const reservedMap = new Map<string, number>();
    reservations?.forEach((res) => {
      reservedMap.set(res.travel_id, (reservedMap.get(res.travel_id) || 0) + 1);
    });

    const reportsData = travels?.map((travel) => {
      const capacity = capacityMap.get(travel.id) || 0;
      const reserved = reservedMap.get(travel.id) || 0;
      return {
        travel_id: travel.id,
        title: travel.name,
        capacity,
        reserved,
        available: capacity - reserved,
      };
    }) || [];

    // Fetch translations
    const translations: Record<string, Record<string, string>> = {};
    for (const report of reportsData) {
      const translated = await getTravelTranslations(report.travel_id, lang);
      translations[report.travel_id] = translated;
    }
    setTravelTranslations(translations);

    setReports(reportsData);
    setLoading(false);
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">{t("page.dashboard.reports", "گزارش‌ها")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("page.dashboard.reports_desc", "ظرفیت، رزروشده و خالی")}</p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-start p-2">{t("table.travel", "سفر")}</th>
              <th className="text-start p-2">{t("table.capacity", "ظرفیت")}</th>
              <th className="text-start p-2">{t("table.reserved", "رزروشده")}</th>
              <th className="text-start p-2">{t("table.available", "خالی")}</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => {
              const i18n = travelTranslations[report.travel_id] || {};
              const localizedTitle = i18n.name ?? report.title;
              return (
                <tr key={report.travel_id} className="border-b">
                  <td className="p-2">{localizedTitle}</td>
                  <td className="p-2">{report.capacity}</td>
                  <td className="p-2">{report.reserved}</td>
                  <td className="p-2">{report.available}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}