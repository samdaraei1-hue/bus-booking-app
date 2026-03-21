"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";
import { getTravelTranslations } from "@/lib/translations/getTravelTranslation.client";

type TravelRow = {
  id: string;
  name: string;
  origin: string;
  destination: string;
  departure_at: string;
  price: number | string;
};

type SeatRow = {
  travel_id: string;
};

type ReservationRow = {
  travel_id: string;
  status: string;
};

type Report = {
  travelId: string;
  title: string;
  origin: string;
  destination: string;
  departureAt: string;
  price: number;
  capacity: number;
  paid: number;
  preReserved: number;
  cancelled: number;
  available: number;
  occupancyRate: number;
  expectedRevenue: number;
};

export default function DashboardReportsPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const t = useT(lang);

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetchReports();
  }, [lang]);

  const fetchReports = async () => {
    setLoading(true);
    setMsg(null);

    try {
      const [
        { data: travels, error: travelsError },
        { data: seats, error: seatsError },
        { data: reservations, error: reservationsError },
      ] = await Promise.all([
        supabase.from("travels").select("id, name, origin, destination, departure_at, price"),
        supabase.from("travel_bus_seats").select("travel_id"),
        supabase.from("bus_seats_reservation").select("travel_id, status"),
      ]);

      if (travelsError) throw travelsError;
      if (seatsError) throw seatsError;
      if (reservationsError) throw reservationsError;

      const travelRows = (travels ?? []) as TravelRow[];
      const seatRows = (seats ?? []) as SeatRow[];
      const reservationRows = (reservations ?? []) as ReservationRow[];

      const translations: Record<string, Record<string, string>> = {};
      await Promise.all(
        travelRows.map(async (travel) => {
          translations[travel.id] = await getTravelTranslations(travel.id, lang);
        })
      );

      const capacityMap = new Map<string, number>();
      for (const seat of seatRows) {
        capacityMap.set(
          seat.travel_id,
          (capacityMap.get(seat.travel_id) || 0) + 1
        );
      }

      const reservationStats = new Map<
        string,
        { paid: number; preReserved: number; cancelled: number }
      >();

      for (const reservation of reservationRows) {
        const current = reservationStats.get(reservation.travel_id) ?? {
          paid: 0,
          preReserved: 0,
          cancelled: 0,
        };

        const normalizedStatus = reservation.status.toLowerCase();
        if (normalizedStatus === "paid") current.paid += 1;
        else if (normalizedStatus === "cancelled") current.cancelled += 1;
        else if (normalizedStatus.includes("pre")) current.preReserved += 1;

        reservationStats.set(reservation.travel_id, current);
      }

      const nextReports = travelRows.map((travel) => {
        const translated = translations[travel.id] ?? {};
        const capacity = capacityMap.get(travel.id) || 0;
        const stats = reservationStats.get(travel.id) ?? {
          paid: 0,
          preReserved: 0,
          cancelled: 0,
        };
        const reserved = stats.paid + stats.preReserved;
        const available = Math.max(capacity - reserved, 0);
        const occupancyRate = capacity ? Math.round((reserved / capacity) * 100) : 0;
        const price = Number(travel.price) || 0;

        return {
          travelId: travel.id,
          title: translated.name ?? travel.name,
          origin: translated.origin ?? travel.origin,
          destination: translated.destination ?? travel.destination,
          departureAt: travel.departure_at,
          price,
          capacity,
          paid: stats.paid,
          preReserved: stats.preReserved,
          cancelled: stats.cancelled,
          available,
          occupancyRate,
          expectedRevenue: stats.paid * price,
        };
      });

      setReports(nextReports);
    } catch (error) {
      console.error(error);
      setReports([]);
      setMsg(error instanceof Error ? error.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    return reports.reduce(
      (acc, report) => {
        acc.capacity += report.capacity;
        acc.paid += report.paid;
        acc.preReserved += report.preReserved;
        acc.available += report.available;
        acc.expectedRevenue += report.expectedRevenue;
        return acc;
      },
      { capacity: 0, paid: 0, preReserved: 0, available: 0, expectedRevenue: 0 }
    );
  }, [reports]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">
          {t("page.dashboard.reports", "گزارش‌ها")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {t("page.dashboard.reports_desc", "ظرفیت، رزروشده و خالی")}
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="text-sm text-zinc-500">Capacity</div>
          <div className="mt-2 text-3xl font-extrabold text-zinc-900">
            {totals.capacity}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="text-sm text-zinc-500">Paid Seats</div>
          <div className="mt-2 text-3xl font-extrabold text-emerald-700">
            {totals.paid}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="text-sm text-zinc-500">Pre-Reserved</div>
          <div className="mt-2 text-3xl font-extrabold text-amber-700">
            {totals.preReserved}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="text-sm text-zinc-500">Expected Revenue</div>
          <div className="mt-2 text-3xl font-extrabold text-zinc-900">
            €{totals.expectedRevenue.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-14 animate-pulse rounded-2xl bg-zinc-100"
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="px-3 py-3 text-start">Travel</th>
                  <th className="px-3 py-3 text-start">Capacity</th>
                  <th className="px-3 py-3 text-start">Paid</th>
                  <th className="px-3 py-3 text-start">Pre</th>
                  <th className="px-3 py-3 text-start">Available</th>
                  <th className="px-3 py-3 text-start">Occupancy</th>
                  <th className="px-3 py-3 text-start">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.travelId} className="border-b border-zinc-100">
                    <td className="px-3 py-4">
                      <div className="font-semibold text-zinc-900">
                        {report.title}
                      </div>
                      <div className="mt-1 text-zinc-500">
                        {report.origin} - {report.destination}
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">
                        {new Date(report.departureAt).toLocaleString(
                          lang === "fa" ? "fa-IR" : lang === "de" ? "de-DE" : "en-US"
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-zinc-900">{report.capacity}</td>
                    <td className="px-3 py-4 text-emerald-700">{report.paid}</td>
                    <td className="px-3 py-4 text-amber-700">
                      {report.preReserved}
                    </td>
                    <td className="px-3 py-4 text-zinc-900">{report.available}</td>
                    <td className="px-3 py-4">
                      <div className="font-semibold text-zinc-900">
                        {report.occupancyRate}%
                      </div>
                      <div className="mt-2 h-2 w-32 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-rose-600"
                          style={{ width: `${report.occupancyRate}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-4 text-zinc-900">
                      €{report.expectedRevenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!reports.length ? (
              <div className="py-8 text-center text-sm text-zinc-500">
                No reports available.
              </div>
            ) : null}
          </div>
        )}

        {msg ? <div className="mt-4 text-sm text-zinc-700">{msg}</div> : null}
      </div>
    </main>
  );
}
