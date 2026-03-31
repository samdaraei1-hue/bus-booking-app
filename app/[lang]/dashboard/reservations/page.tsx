"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { ReservationStatus } from "@/lib/types";
import { useT } from "@/lib/translations/useT.client";
import { getTravelTranslationsMap } from "@/lib/translations/getTravelTranslation.client";
import {
  getReservationStatusLabel,
  getReservationStatusTone,
  summarizeReservationStatuses,
} from "@/lib/reservationPresentation";
import { getSeatLabelValue } from "@/lib/seatLabels";

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

type ReservationGroupRow = {
  id: string;
  status: ReservationStatus;
  travel_id: string;
  booker_user_id: string;
  created_at: string;
  travels: ReservationTravel | null;
  booker: ReservationUser | null;
  reservation_items: Array<{
    id: string;
    status: ReservationStatus;
    passenger_name: string | null;
    passenger_email: string | null;
    passenger_phone: string | null;
    layout_seats:
      | { label?: string | null; seat_key?: string | null }
      | Array<{ label?: string | null; seat_key?: string | null }>
      | null;
  }>;
};

type ReservationCard = {
  id: string;
  status: ReservationStatus;
  travel_id: string;
  created_at: string;
  booker_user_id: string;
  travelName: string;
  origin: string;
  destination: string;
  departure_at: string;
  bookerName: string;
  bookerEmail: string;
  seats: Array<{
    id: string;
    label: string;
    status: ReservationStatus;
    passenger_name: string | null;
    passenger_email: string | null;
    passenger_phone: string | null;
  }>;
};

const STATUS_OPTIONS = [
  "held",
  "awaiting_payment",
  "paid",
  "cancelled",
  "expired",
] as const;

function formatDate(value: string, lang: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString(
    lang === "fa" ? "fa-IR" : lang === "de" ? "de-DE" : "en-US"
  );
}

export default function DashboardReservationsPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const t = useT(lang);

  const [items, setItems] = useState<ReservationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [groupStatusFilter, setGroupStatusFilter] = useState<"all" | ReservationStatus>("all");
  const [seatStatusFilter, setSeatStatusFilter] = useState<"all" | ReservationStatus>("all");
  const [msg, setMsg] = useState<string | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchReservations = async () => {
      setLoading(true);
      setMsg(null);

      try {
        const { data, error } = await supabase
          .from("reservation_groups")
          .select(
            `
              id,
              status,
              travel_id,
              booker_user_id,
              created_at,
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
              ),
              reservation_items (
                id,
                status,
                passenger_name,
                passenger_email,
                passenger_phone,
                layout_seats:layout_seat_id (
                  label,
                  seat_key
                )
              )
            `
          )
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!active) return;

        const rows = (data ?? []) as unknown as ReservationGroupRow[];
        const travelIds = Array.from(
          new Set(rows.map((row) => row.travel_id).filter(Boolean))
        );
        const travelTranslations = await getTravelTranslationsMap(travelIds, lang);
        if (!active) return;

        setItems(
          rows.map((row) => {
            const translated = travelTranslations[row.travel_id] ?? {};

            return {
              id: row.id,
              status: row.status,
              travel_id: row.travel_id,
              created_at: row.created_at,
              booker_user_id: row.booker_user_id,
              travelName:
                translated.name ?? row.travels?.name ?? row.travel_id ?? "Travel",
              origin: translated.origin ?? row.travels?.origin ?? "",
              destination:
                translated.destination ?? row.travels?.destination ?? "",
              departure_at: row.travels?.departure_at ?? "",
              bookerName: row.booker?.name ?? "Unknown",
              bookerEmail: row.booker?.email ?? row.booker_user_id,
              seats: row.reservation_items.map((seat) => ({
                id: seat.id,
                label: getSeatLabelValue(seat.layout_seats) || "?",
                status: seat.status,
                passenger_name: seat.passenger_name,
                passenger_email: seat.passenger_email,
                passenger_phone: seat.passenger_phone,
              })),
            };
          })
        );
      } catch (error) {
        console.error(error);
        if (!active) return;
        setItems([]);
        setMsg(
          error instanceof Error ? error.message : "Failed to load reservations"
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchReservations();

    return () => {
      active = false;
    };
  }, [lang]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const handleGroupStatusFilterChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    setGroupStatusFilter(event.target.value as "all" | ReservationStatus);
  };

  const handleSeatStatusFilterChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    setSeatStatusFilter(event.target.value as "all" | ReservationStatus);
  };

  const handleGroupStatusChange =
    (groupId: string) => (event: ChangeEvent<HTMLSelectElement>) => {
      void updateGroupStatus(groupId, event.target.value as ReservationStatus);
    };

  const handleSeatStatusChange =
    (groupId: string, seatId: string) =>
    (event: ChangeEvent<HTMLSelectElement>) => {
      void updateSeatStatus(groupId, seatId, event.target.value as ReservationStatus);
    };

  const updateGroupStatus = async (groupId: string, status: ReservationStatus) => {
    const key = `group:${groupId}`;
    setUpdatingKey(key);
    setMsg(null);

    try {
      const { error: groupError } = await supabase
        .from("reservation_groups")
        .update({ status })
        .eq("id", groupId);

      if (groupError) throw groupError;

      const { error: itemsError } = await supabase
        .from("reservation_items")
        .update({ status })
        .eq("reservation_group_id", groupId);

      if (itemsError) throw itemsError;

      setItems((current) =>
        current.map((group) =>
          group.id === groupId
            ? {
                ...group,
                status,
                seats: group.seats.map((seat) => ({ ...seat, status })),
              }
            : group
        )
      );
      setMsg(t("common.save", "Saved"));
    } catch (error) {
      console.error(error);
      setMsg(
        error instanceof Error ? error.message : "Failed to update reservation"
      );
    } finally {
      setUpdatingKey(null);
    }
  };

  const updateSeatStatus = async (
    groupId: string,
    seatId: string,
    status: ReservationStatus
  ) => {
    const key = `seat:${seatId}`;
    setUpdatingKey(key);
    setMsg(null);

    try {
      const { error } = await supabase
        .from("reservation_items")
        .update({ status })
        .eq("id", seatId);

      if (error) throw error;

      setItems((current) =>
        current.map((group) =>
          group.id === groupId
            ? {
                ...group,
                seats: group.seats.map((seat) =>
                  seat.id === seatId ? { ...seat, status } : seat
                ),
              }
            : group
        )
      );
      setMsg(t("common.save", "Saved"));
    } catch (error) {
      console.error(error);
      setMsg(
        error instanceof Error ? error.message : "Failed to update seat status"
      );
    } finally {
      setUpdatingKey(null);
    }
  };

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return items.filter((group) => {
      if (groupStatusFilter !== "all" && group.status !== groupStatusFilter) {
        return false;
      }

      if (
        seatStatusFilter !== "all" &&
        !group.seats.some((seat) => seat.status === seatStatusFilter)
      ) {
        return false;
      }

      if (!needle) return true;

      return [
        group.travelName,
        `${group.origin} ${group.destination}`,
        group.bookerName,
        group.bookerEmail,
        group.status,
        ...group.seats.flatMap((seat) => [
          seat.label,
          seat.status,
          seat.passenger_name ?? "",
          seat.passenger_email ?? "",
          seat.passenger_phone ?? "",
        ]),
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [groupStatusFilter, items, search, seatStatusFilter]);

  const summary = useMemo(() => {
    return {
      groups: items.length,
      seats: items.reduce((total, group) => total + group.seats.length, 0),
      awaitingPayment: items.filter((item) => item.status === "awaiting_payment")
        .length,
      mixed: items.filter(
        (item) =>
          summarizeReservationStatuses(item.seats.map((seat) => seat.status)).kind ===
          "mixed"
      ).length,
    };
  }, [items]);

  return (
    <main className="page-shell">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl">
          {t("page.dashboard.reservations", "Manage Reservations")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          {t(
            "page.dashboard.reservations_desc",
            "Bookings, statuses, and seats"
          )}
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="page-card p-5">
          <div className="text-sm text-zinc-500">
            {t("dashboard.reservations.groups", "Reservation Groups")}
          </div>
          <div className="mt-2 text-3xl font-extrabold text-zinc-900">
            {summary.groups}
          </div>
        </div>
        <div className="page-card p-5">
          <div className="text-sm text-zinc-500">
            {t("dashboard.reservations.seats", "Reserved Seats")}
          </div>
          <div className="mt-2 text-3xl font-extrabold text-zinc-900">
            {summary.seats}
          </div>
        </div>
        <div className="page-card p-5">
          <div className="text-sm text-zinc-500">
            {t("dashboard.reservations.awaiting_payment", "Awaiting Payment")}
          </div>
          <div className="mt-2 text-3xl font-extrabold text-amber-700">
            {summary.awaitingPayment}
          </div>
        </div>
        <div className="page-card p-5">
          <div className="text-sm text-zinc-500">
            {t("dashboard.reservations.mixed", "Mixed Seat Status")}
          </div>
          <div className="mt-2 text-3xl font-extrabold text-violet-700">
            {summary.mixed}
          </div>
        </div>
      </div>

      <div className="page-card p-4 sm:p-6">
        <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_220px_220px]">
          <div>
            <label
              htmlFor="reservation-search"
              className="mb-2 block text-sm font-semibold text-zinc-700"
            >
              {t("dashboard.reservations.search", "Search")}
            </label>
            <input
              id="reservation-search"
              value={search}
              onChange={handleSearchChange}
              placeholder="travel / passenger / booker / seat"
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 transition focus:ring-4"
            />
          </div>
          <div>
            <label
              htmlFor="group-status-filter"
              className="mb-2 block text-sm font-semibold text-zinc-700"
            >
              {t("dashboard.reservations.group_filter", "All Group Statuses")}
            </label>
            <select
              id="group-status-filter"
              value={groupStatusFilter}
              onChange={handleGroupStatusFilterChange}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 transition focus:ring-4"
            >
              <option value="all">
                {t("dashboard.reservations.group_filter", "All Group Statuses")}
              </option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {getReservationStatusLabel(status, t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="seat-status-filter"
              className="mb-2 block text-sm font-semibold text-zinc-700"
            >
              {t("dashboard.reservations.seat_filter", "All Seat Statuses")}
            </label>
            <select
              id="seat-status-filter"
              value={seatStatusFilter}
              onChange={handleSeatStatusFilterChange}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 transition focus:ring-4"
            >
              <option value="all">
                {t("dashboard.reservations.seat_filter", "All Seat Statuses")}
              </option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {getReservationStatusLabel(status, t)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-44 animate-pulse rounded-2xl bg-zinc-100"
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">
            {t("dashboard.reservations.empty", "No reservations found.")}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((group) => {
              const seatSummary = summarizeReservationStatuses(
                group.seats.map((seat) => seat.status)
              );

              return (
                <section
                  key={group.id}
                  className="rounded-3xl border border-zinc-200 p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1 text-xs font-bold",
                            getReservationStatusTone(group.status),
                          ].join(" ")}
                        >
                          {t("dashboard.reservations.group_status", "Group")}:{" "}
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
                          {t("dashboard.reservations.seat_status", "Seats")}:{" "}
                          {seatSummary.kind === "mixed"
                            ? t("page.my_bookings.mixed_status", "Mixed")
                            : getReservationStatusLabel(
                                seatSummary.status ?? "expired",
                                t
                              )}
                        </span>
                      </div>

                      <h2 className="mt-3 text-lg font-bold text-zinc-900">
                        {group.travelName}
                      </h2>
                      <p className="mt-1 text-sm text-zinc-600">
                        {group.destination
                          ? `${group.origin} - ${group.destination}`
                          : group.origin}
                      </p>

                      <div className="mt-4 grid gap-3 text-sm text-zinc-600 sm:grid-cols-2 xl:grid-cols-3">
                        <div>
                          {t("dashboard.reservations.booker", "Booker")}:
                          <span className="ms-2 font-semibold text-zinc-900">
                            {group.bookerName}
                          </span>
                        </div>
                        <div className="break-all">
                          {t("dashboard.reservations.contact", "Contact")}:
                          <span className="ms-2 font-semibold text-zinc-900">
                            {group.bookerEmail}
                          </span>
                        </div>
                        <div>
                          {t("dashboard.reservations.created", "Created")}:
                          <span className="ms-2 font-semibold text-zinc-900">
                            {formatDate(group.created_at, lang)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full xl:max-w-xs">
                      <label className="mb-2 block text-sm font-semibold text-zinc-700">
                        {t("dashboard.reservations.group_status", "Group Status")}
                      </label>
                      <select
                        value={group.status}
                        onChange={handleGroupStatusChange(group.id)}
                        disabled={updatingKey === `group:${group.id}`}
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 transition focus:ring-4"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {getReservationStatusLabel(status, t)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {group.seats.map((seat) => (
                      <div
                        key={seat.id}
                        className="grid gap-3 rounded-2xl bg-zinc-50 p-4 md:grid-cols-[150px_1fr] xl:grid-cols-[150px_1fr_220px]"
                      >
                        <div>
                          <div className="text-xs text-zinc-500">
                            {t("page.my_bookings.seat", "Seat")}
                          </div>
                          <div className="mt-1 font-bold text-zinc-900">
                            {seat.label}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-900">
                            {seat.passenger_name ||
                              t("dashboard.reservations.no_name", "No passenger name")}
                          </div>
                          <div className="mt-1 break-all text-sm text-zinc-600">
                            {seat.passenger_email || seat.passenger_phone || "-"}
                          </div>
                        </div>

                        <div className="md:col-span-2 xl:col-span-1">
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            {t("dashboard.reservations.seat_status", "Seat Status")}
                          </label>
                          <select
                            value={seat.status}
                            onChange={handleSeatStatusChange(group.id, seat.id)}
                            disabled={updatingKey === `seat:${seat.id}`}
                            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 transition focus:ring-4"
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {getReservationStatusLabel(status, t)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {msg ? <div className="mt-4 text-sm text-zinc-700">{msg}</div> : null}
      </div>
    </main>
  );
}
