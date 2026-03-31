"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";
import { getTravelTranslationsMap } from "@/lib/translations/getTravelTranslation.client";

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

function formatDate(value: string, lang: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString(
    lang === "fa" ? "fa-IR" : lang === "de" ? "de-DE" : "en-US"
  );
}

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

      const translations = await getTravelTranslationsMap(
        travelRows.map((travel) => travel.id),
        lang
      );

      const capacityMap = new Map<string, number>();
      for (const seat of seatRows) {
        capacityMap.set(seat.travel_id, (capacityMap.get(seat.travel_id) || 0) + 1);
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
    <main className="page-shell">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl">
          {t("page.dashboard.reports", "Reports")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          {t("page.dashboard.reports_desc", "Capacity, booked, and free seats")}
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="page-card p-5">
          <div className="text-sm text-zinc-500">Capacity</div>
          <div className="mt-2 text-3xl font-extrabold text-zinc-900">
            {totals.capacity}
          </div>
        </div>
        <div className="page-card p-5">
          <div className="text-sm text-zinc-500">Paid Seats</div>
          <div className="mt-2 text-3xl font-extrabold text-emerald-700">
            {totals.paid}
          </div>
        </div>
        <div className="page-card p-5">
          <div className="text-sm text-zinc-500">Pre-Reserved</div>
          <div className="mt-2 text-3xl font-extrabold text-amber-700">
            {totals.preReserved}
          </div>
        </div>
        <div className="page-card p-5">
          <div className="text-sm text-zinc-500">Expected Revenue</div>
          <div className="mt-2 text-3xl font-extrabold text-zinc-900">
            EUR {totals.expectedRevenue.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="page-card p-4 sm:p-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-2xl bg-zinc-100"
              />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">
            No reports available.
          </div>
        ) : (
          <>
            <div className="space-y-4 lg:hidden">
              {reports.map((report) => (
                <article
                  key={report.travelId}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-zinc-900">
                        {report.title}
                      </h2>
                      <p className="mt-1 text-sm text-zinc-600">
                        {report.destination
                          ? `${report.origin} · ${report.destination}`
                          : report.origin}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {formatDate(report.departureAt, lang)}
                      </p>
                    </div>
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                      {report.occupancyRate}%
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white p-3 ring-1 ring-zinc-200">
                      <div className="text-zinc-500">Capacity</div>
                      <div className="mt-1 font-bold text-zinc-900">{report.capacity}</div>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-zinc-200">
                      <div className="text-zinc-500">Paid</div>
                      <div className="mt-1 font-bold text-emerald-700">{report.paid}</div>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-zinc-200">
                      <div className="text-zinc-500">Pre</div>
                      <div className="mt-1 font-bold text-amber-700">
                        {report.preReserved}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-zinc-200">
                      <div className="text-zinc-500">Available</div>
                      <div className="mt-1 font-bold text-zinc-900">{report.available}</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      <span>Revenue</span>
                      <span>EUR {report.expectedRevenue.toLocaleString()}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                      <div
                        className="h-full rounded-full bg-rose-600"
                        style={{ width: `${report.occupancyRate}%` }}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
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
                          {report.destination
                            ? `${report.origin} - ${report.destination}`
                            : report.origin}
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          {formatDate(report.departureAt, lang)}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-zinc-900">{report.capacity}</td>
                      <td className="px-3 py-4 text-emerald-700">{report.paid}</td>
                      <td className="px-3 py-4 text-amber-700">{report.preReserved}</td>
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
                        EUR {report.expectedRevenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {msg ? <div className="mt-4 text-sm text-zinc-700">{msg}</div> : null}
      </div>
    </main>
  );
}
