"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/translations/useT.client";
import { getTravelTranslationsMap } from "@/lib/translations/getTravelTranslation.client";
import {
  getReservationStatusLabel,
  getReservationStatusTone,
  summarizeReservationStatuses,
} from "@/lib/reservationPresentation";
import { getSeatLabelValue } from "@/lib/seatLabels";
import { canChangeSeatForReservation } from "@/lib/reservationPolicies";

type Travel = {
  id: string;
  name: string;
  type?: "travel" | "event" | null;
  origin: string;
  destination: string;
  departure_at: string;
  return_at: string;
  description?: string;
};

type BookingSeat = {
  id: string;
  label: string;
  status: string;
};

type BookingRow = {
  id: string;
  status: string;
  travel_id: string;
  reservation_items: Array<{
    id: string;
    status: string;
    layout_seats:
      | { label?: string | null; seat_key?: string | null }
      | Array<{ label?: string | null; seat_key?: string | null }>
      | null;
  }>;
  travels: Travel;
};

type BookingCard = {
  id: string;
  travel_id: string;
  name: string;
  origin: string;
  destination: string;
  departure_at: string;
  return_at: string;
  seats: BookingSeat[];
  status: string;
  isPast: boolean;
};

function formatDate(value: string, lang: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString(
    lang === "fa" ? "de-DE" : lang === "de" ? "de-DE" : "en-US"
  );
}

export default function MyBookingsPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const router = useRouter();
  const t = useT(lang);

  const [items, setItems] = useState<BookingCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);

      try {
        const {
          data: { session },
          error: authError,
        } = await supabase.auth.getSession();
        const user = session?.user ?? null;

        if (authError || !user) {
          router.push(`/${lang}/login`);
          return;
        }

        const { data, error } = await supabase
          .from("reservation_groups")
          .select(
            `
              id,
              status,
              travel_id,
              reservation_items (
                id,
                status,
                layout_seats:layout_seat_id (
                  label,
                  seat_key
                )
              ),
              travels:travel_id (
                id,
                name,
                type,
                origin,
                destination,
                departure_at,
                return_at,
                description
              )
            `
          )
          .eq("booker_user_id", user.id)
          .order("created_at", { ascending: false });

        if (!mounted || error || !data) {
          setItems([]);
          return;
        }

        const rows = data as unknown as BookingRow[];
        const travelMap: Record<string, Travel> = {};

        for (const row of rows) {
          if (row.travels) travelMap[row.travels.id] = row.travels;
        }

        const translations = await getTravelTranslationsMap(
          Object.keys(travelMap),
          lang
        );

        const result = rows.map((row) => {
          const travel = row.travels;
          const translated = travel ? translations[travel.id] ?? {} : {};
          const departure = travel?.departure_at ?? "";
          const returning = travel?.return_at ?? "";
          const compareDate = returning || departure;
          const isPast = compareDate
            ? new Date(compareDate).getTime() < Date.now()
            : false;

          return {
            id: row.id,
            travel_id: row.travel_id,
            name: translated.name ?? travel?.name ?? "Travel",
            origin: translated.origin ?? travel?.origin ?? "",
            destination: translated.destination ?? travel?.destination ?? "",
            departure_at: departure,
            return_at: returning,
            seats: row.reservation_items.map((item) => ({
              id: item.id,
              label: getSeatLabelValue(item.layout_seats) || "-",
              status: item.status,
            })),
            status: row.status,
            isPast,
          };
        });

        setItems(result);
      } catch (error) {
        console.error(error);
        setItems([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [lang, router]);

  const upcomingItems = useMemo(
    () => items.filter((item) => !item.isPast),
    [items]
  );
  const pastItems = useMemo(() => items.filter((item) => item.isPast), [items]);

  const renderActions = (group: BookingCard) => {
    const actions = [
      <button
        key="seat-map"
        onClick={() =>
          router.push(
            `/${lang}/seat-map?travel=${encodeURIComponent(
              group.travel_id
            )}&reservation=${encodeURIComponent(group.id)}&view=1`
          )
        }
        className="w-full rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-semibold transition hover:bg-zinc-200 sm:w-auto"
      >
        {t("page.my_bookings.view_seat_map", "View Seat Location")}
      </button>,
    ];

    if (group.status === "held") {
      actions.unshift(
        <button
          key="continue-reservation"
          onClick={() =>
            router.push(
              `/${lang}/reservation-details?reservation=${encodeURIComponent(
                group.id
              )}`
            )
          }
          className="w-full rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 sm:w-auto"
        >
          {t("page.my_bookings.continue_reservation", "Continue Reservation")}
        </button>
      );
      return actions;
    }

    if (group.status === "awaiting_payment") {
      actions.unshift(
        <button
          key="continue-payment"
          onClick={() =>
            router.push(
              `/${lang}/payment?reservation=${encodeURIComponent(
                group.id
              )}&travel=${encodeURIComponent(group.travel_id)}`
            )
          }
          className="w-full rounded-2xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 sm:w-auto"
        >
          {t("page.my_bookings.continue_payment", "Continue Payment")}
        </button>
      );
      return actions;
    }

    if (canChangeSeatForReservation(group.status, group.departure_at)) {
      actions.unshift(
        <button
          key="change-seat"
          onClick={() =>
            router.push(
              `/${lang}/seat-map?travel=${encodeURIComponent(
                group.travel_id
              )}&reservation=${encodeURIComponent(group.id)}&change=1`
            )
          }
          className="w-full rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 sm:w-auto"
        >
          {t("page.my_bookings.change_seat", "Change Seat")}
        </button>
      );
    }

    actions.unshift(
      <button
        key="view-item"
        onClick={() => router.push(`/${lang}/travels/${group.travel_id}`)}
        className="w-full rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-semibold transition hover:bg-zinc-200 sm:w-auto"
      >
        {t("common.view", "View")}
      </button>
    );

    return actions;
  };

  const renderSection = (title: string, rows: BookingCard[], emptyText: string) => (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-900">{title}</h2>
        <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
          {rows.length}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <div className="text-sm text-zinc-500">{emptyText}</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {rows.map((group) => {
            const seatSummary = summarizeReservationStatuses(
              group.seats.map((seat) => seat.status)
            );

            return (
              <div
                key={group.id}
                className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          "inline-flex rounded-full px-3 py-1 text-xs font-bold",
                          getReservationStatusTone(group.status),
                        ].join(" ")}
                      >
                        {t("page.my_bookings.group_status", "Reservation")}:{" "}
                        {getReservationStatusLabel(group.status, t)}
                      </span>

                      <span
                        className={[
                          "inline-flex rounded-full px-3 py-1 text-xs font-bold",
                          seatSummary.kind === "mixed"
                            ? "bg-violet-100 text-violet-700"
                            : getReservationStatusTone(
                                seatSummary.status ?? "expired"
                              ),
                        ].join(" ")}
                      >
                        {t("page.my_bookings.seat_status", "Seats")}:{" "}
                        {seatSummary.kind === "mixed"
                          ? t("page.my_bookings.mixed_status", "Mixed")
                          : getReservationStatusLabel(
                              seatSummary.status ?? "expired",
                              t
                            )}
                      </span>

                      {group.isPast ? (
                        <span className="inline-flex rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold text-white">
                          {t("page.my_bookings.past_badge", "Past Trip")}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                          {t("page.my_bookings.upcoming_badge", "Upcoming")}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/${lang}/travels/${group.travel_id}`}
                      className="text-xl font-bold text-zinc-900 underline-offset-4 hover:underline"
                    >
                      {group.name}
                    </Link>

                    <p className="mt-1 text-sm text-zinc-600">
                      {group.destination
                        ? `${group.origin} - ${group.destination}`
                        : group.origin}
                    </p>

                    <div className="mt-4 grid gap-3 text-sm text-zinc-600 md:grid-cols-2">
                      <div>
                        {t("page.my_bookings.departure", "Departure")}:
                        <span className="ms-2 font-semibold text-zinc-900">
                          {formatDate(group.departure_at, lang)}
                        </span>
                      </div>
                      <div>
                        {t("page.my_bookings.return", "Return")}:
                        <span className="ms-2 font-semibold text-zinc-900">
                          {formatDate(group.return_at, lang)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {group.seats.length ? (
                        group.seats.map((seat) => (
                          <span
                            key={seat.id}
                            className={[
                              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                              getReservationStatusTone(seat.status),
                            ].join(" ")}
                          >
                            {t("page.my_bookings.seat", "Seat")} {seat.label} •{" "}
                            {getReservationStatusLabel(seat.status, t)}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-zinc-500">-</span>
                      )}
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                    {renderActions(group)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="h-56 animate-pulse rounded-3xl bg-zinc-100" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-8 text-3xl font-extrabold">
        {t("page.my_bookings.title", "My Bookings")}
      </h1>

      {items.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
          {t("page.my_bookings.empty_title", "No bookings yet")}
        </div>
      ) : (
        <>
          {renderSection(
            t("page.my_bookings.upcoming_section", "Upcoming Reservations"),
            upcomingItems,
            t("page.my_bookings.no_upcoming", "No upcoming reservations yet.")
          )}
          {renderSection(
            t("page.my_bookings.past_section", "Past Reservations"),
            pastItems,
            t("page.my_bookings.no_past", "No past reservations yet.")
          )}
        </>
      )}
    </main>
  );
}
