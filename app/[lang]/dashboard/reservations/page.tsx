"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";
import type { BusSeatReservation } from "@/lib/types";

export default function DashboardReservationsPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const t = useT(lang);

  const [reservations, setReservations] = useState<BusSeatReservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    const { data, error } = await supabase.from("reservations").select("*");
    if (error) console.error(error);
    else setReservations(data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
    if (error) console.error(error);
    else fetchReservations();
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">{t("page.dashboard.reservations", "مدیریت رزروها")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("page.dashboard.reservations_desc", "لیست رزروها، وضعیت‌ها و صندلی‌ها")}</p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-start p-2">{t("table.travel", "سفر")}</th>
              <th className="text-start p-2">{t("table.seat", "صندلی")}</th>
              <th className="text-start p-2">{t("table.passenger", "مسافر")}</th>
              <th className="text-start p-2">{t("table.booker", "رزروکننده")}</th>
              <th className="text-start p-2">{t("table.status", "وضعیت")}</th>
              <th className="text-start p-2">{t("table.actions", "عملیات")}</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((res) => (
              <tr key={res.id} className="border-b">
                <td className="p-2">{res.travel_id}</td>
                <td className="p-2">{res.seat_no}</td>
                <td className="p-2">{res.passenger_name || "N/A"}</td>
                <td className="p-2">{res.booker_user_id}</td>
                <td className="p-2">{res.status}</td>
                <td className="p-2">
                  <select
                    value={res.status}
                    onChange={(e) => updateStatus(res.id, e.target.value)}
                    className="border rounded px-2 py-1"
                    title="Update reservation status"
                  >
                    <option value="pending">{t("status.pending", "در انتظار")}</option>
                    <option value="confirmed">{t("status.confirmed", "تایید شده")}</option>
                    <option value="cancelled">{t("status.cancelled", "لغو شده")}</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}