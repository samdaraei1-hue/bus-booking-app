"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";
import { getTravelTranslations } from "@/lib/translations/getTravelTranslation.client";

type ReservationTravel = {
  id: string;
  name: string;
  origin: string;
  destination: string;
  departure_at: string;
};

type ReservationUser = {
  id: string;
  name: string | null;
  email: string | null;
};

type ReservationRow = {
  id: string;
  travel_id: string;
  seat_no: number;
  passenger_name: string | null;
  passenger_email: string | null;
  passenger_phone: string | null;
  booker_user_id: string;
  status: string;
  travels: ReservationTravel | null;
  booker: ReservationUser | null;
};

const STATUS_OPTIONS = ["pre", "paid", "cancelled", "Pre-Reservation", "Paid"] as const;

export default function DashboardReservationsPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const t = useT(lang);

  const [items, setItems] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [msg, setMsg] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [travelTranslations, setTravelTranslations] = useState<
    Record<string, Record<string, string>>
  >({});

  useEffect(() => {
    void fetchReservations();
  }, [lang]);

  const fetchReservations = async () => {
    setLoading(true);
    setMsg(null);

    try {
      const { data, error } = await supabase
        .from("bus_seats_reservation")
        .select(
          `
            id,
            travel_id,
            seat_no,
            passenger_name,
            passenger_email,
            passenger_phone,
            booker_user_id,
            status,
            travels:travel_id (
              id,
              name,
              origin,
              destination,
              departure_at
            ),
            booker:booker_user_id (
              id,
              name,
              email
            )
          `
        )
        .order("id", { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as unknown as ReservationRow[];
      setItems(rows);

      const ids = Array.from(
        new Set(rows.map((row) => row.travel_id).filter(Boolean))
      );
      const translations: Record<string, Record<string, string>> = {};

      await Promise.all(
        ids.map(async (travelId) => {
          translations[travelId] = await getTravelTranslations(travelId, lang);
        })
      );

      setTravelTranslations(translations);
    } catch (error) {
      console.error(error);
      setItems([]);
      setTravelTranslations({});
      setMsg(
        error instanceof Error ? error.message : "Failed to load reservations"
      );
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    setMsg(null);

    try {
      const { error } = await supabase
        .from("bus_seats_reservation")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, status } : item))
      );
      setMsg(t("common.save", "Saved"));
    } catch (error) {
      console.error(error);
      setMsg(error instanceof Error ? error.message : "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!needle) return true;

      const translated = travelTranslations[item.travel_id] ?? {};
      const travelName = translated.name ?? item.travels?.name ?? "";
      const route = `${translated.origin ?? item.travels?.origin ?? ""} ${
        translated.destination ?? item.travels?.destination ?? ""
      }`;

      return [
        travelName,
        route,
        item.passenger_name,
        item.passenger_email,
        item.passenger_phone,
        item.booker?.email,
        item.booker?.name,
        item.status,
        String(item.seat_no),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
    });
  }, [items, search, statusFilter, travelTranslations]);

  const summary = useMemo(() => {
    return {
      total: items.length,
      paid: items.filter((item) => item.status.toLowerCase() === "paid").length,
      pre: items.filter((item) => item.status.toLowerCase().includes("pre")).length,
      cancelled: items.filter((item) => item.status.toLowerCase() === "cancelled")
        .length,
    };
  }, [items]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">
          {t("page.dashboard.reservations", "مدیریت رزروها")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {t(
            "page.dashboard.reservations_desc",
            "لیست رزروها، وضعیت‌ها و صندلی‌ها"
          )}
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="text-sm text-zinc-500">Total</div>
          <div className="mt-2 text-3xl font-extrabold text-zinc-900">
            {summary.total}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="text-sm text-zinc-500">Paid</div>
          <div className="mt-2 text-3xl font-extrabold text-emerald-700">
            {summary.paid}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="text-sm text-zinc-500">Pre-Reserved</div>
          <div className="mt-2 text-3xl font-extrabold text-amber-700">
            {summary.pre}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="text-sm text-zinc-500">Cancelled</div>
          <div className="mt-2 text-3xl font-extrabold text-rose-700">
            {summary.cancelled}
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <div className="mb-5 grid gap-4 md:grid-cols-[1fr_220px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="travel / passenger / booker / seat"
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            title="Reservation status filter"
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

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
                  <th className="px-3 py-3 text-start">Passenger</th>
                  <th className="px-3 py-3 text-start">Booker</th>
                  <th className="px-3 py-3 text-start">Seat</th>
                  <th className="px-3 py-3 text-start">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const translated = travelTranslations[item.travel_id] ?? {};
                  const travelName = translated.name ?? item.travels?.name ?? item.travel_id;
                  const origin = translated.origin ?? item.travels?.origin ?? "";
                  const destination =
                    translated.destination ?? item.travels?.destination ?? "";

                  return (
                    <tr key={item.id} className="border-b border-zinc-100">
                      <td className="px-3 py-4">
                        <div className="font-semibold text-zinc-900">
                          {travelName}
                        </div>
                        <div className="mt-1 text-zinc-500">
                          {origin} - {destination}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="font-semibold text-zinc-900">
                          {item.passenger_name || "No name"}
                        </div>
                        <div className="mt-1 text-zinc-500">
                          {item.passenger_email || item.passenger_phone || "—"}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="font-semibold text-zinc-900">
                          {item.booker?.name || "Unknown"}
                        </div>
                        <div className="mt-1 text-zinc-500">
                          {item.booker?.email || item.booker_user_id}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-zinc-900">
                        #{item.seat_no}
                      </td>
                      <td className="px-3 py-4">
                        <select
                          value={item.status}
                          onChange={(event) =>
                            void updateStatus(item.id, event.target.value)
                          }
                          disabled={updatingId === item.id}
                          className="rounded-xl border border-zinc-200 bg-white px-3 py-2"
                          title="Update reservation status"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!filteredItems.length ? (
              <div className="py-8 text-center text-sm text-zinc-500">
                No reservations found.
              </div>
            ) : null}
          </div>
        )}

        {msg ? <div className="mt-4 text-sm text-zinc-700">{msg}</div> : null}
      </div>
    </main>
  );
}
