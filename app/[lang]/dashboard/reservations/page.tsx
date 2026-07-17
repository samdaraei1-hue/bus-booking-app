"use client";

import { Fragment, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { ReservationStatus } from "@/lib/types";
import { fetchWithSupabaseAuth } from "@/lib/api/fetchWithSupabaseAuth.client";
import { useT } from "@/lib/translations/useT.client";
import { getTravelTranslationsMap } from "@/lib/translations/getTravelTranslation.client";
import {
  getReservationStatusLabel,
  getReservationStatusTone,
  summarizeReservationStatuses,
} from "@/lib/reservationPresentation";
import { getSeatLabelValue } from "@/lib/seatLabels";
import { formatMoney } from "@/lib/travelAddons";

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
  base_amount: number | null;
  addons_amount: number | null;
  total_amount: number | null;
  addon_selections:
    | Array<{
        addon_id: string;
        name: string;
        description: string | null;
        unit_price: number;
        pricing_mode: "per_booking" | "per_participant";
        quantity: number;
        total_price: number;
      }>
    | null;
  reservation_addons:
    | Array<{
        addon_id: string;
        name: string;
        description: string | null;
        unit_price: number;
        pricing_mode: "per_booking" | "per_participant";
        quantity: number;
        total_price: number;
      }>
    | null;
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
  base_amount: number;
  addons_amount: number;
  total_amount: number;
  addonSelections: Array<{
    addon_id: string;
    name: string;
    description: string | null;
    unit_price: number;
    pricing_mode: "per_booking" | "per_participant";
    quantity: number;
    total_price: number;
  }>;
  seats: Array<{
    id: string;
    label: string;
    status: ReservationStatus;
    passenger_name: string | null;
    passenger_email: string | null;
    passenger_phone: string | null;
  }>;
};

type ReservationCardView = ReservationCard & {
  seatSummary: ReturnType<typeof summarizeReservationStatuses>;
  seatPreview: string;
  passengerPreview: string;
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
  const [copiedTravelId, setCopiedTravelId] = useState<string | null>(null);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);

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
              base_amount,
              addons_amount,
              total_amount,
              addon_selections,
              reservation_addons (
                addon_id,
                name,
                description,
                unit_price,
                pricing_mode,
                quantity,
                total_price
              ),
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
            const addonRows = row.reservation_addons ?? row.addon_selections ?? [];
            const addonSelections = addonRows.map((addon) => ({
              addon_id: addon.addon_id,
              name: addon.name,
              description: addon.description,
              unit_price: addon.unit_price,
              pricing_mode: addon.pricing_mode,
              quantity: addon.quantity,
              total_price: addon.total_price,
            }));

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
              base_amount: Number(row.base_amount ?? 0) || 0,
              addons_amount: Number(row.addons_amount ?? 0) || 0,
              total_amount: Number(row.total_amount ?? 0) || 0,
              addonSelections,
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

  const toggleGroupDetails = (groupId: string) => {
    setExpandedGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId]
    );
  };

  const updateGroupStatus = async (groupId: string, status: ReservationStatus) => {
    const key = `group:${groupId}`;
    setUpdatingKey(key);
    setMsg(null);

    try {
      const response = await fetchWithSupabaseAuth(
        `/api/dashboard/reservations/${encodeURIComponent(groupId)}/group-status`,
        {
          method: "POST",
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error(
          (response.data as { error?: string } | null)?.error ??
            "Failed to update reservation"
        );
      }

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
      const response = await fetchWithSupabaseAuth(
        `/api/dashboard/reservations/${encodeURIComponent(groupId)}/seat-status`,
        {
          method: "POST",
          body: JSON.stringify({ seatId, status }),
        }
      );

      if (!response.ok) {
        throw new Error(
          (response.data as { error?: string } | null)?.error ??
            "Failed to update seat status"
        );
      }

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
        ...group.addonSelections.flatMap((addon) => [
          addon.name,
          addon.description ?? "",
          String(addon.quantity),
          String(addon.total_price),
        ]),
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
      active: items.filter((item) =>
        ["held", "awaiting_payment", "paid"].includes(item.status)
      ).length,
      archived: items.filter((item) =>
        ["cancelled", "expired"].includes(item.status)
      ).length,
      awaitingPayment: items.filter((item) => item.status === "awaiting_payment")
        .length,
      mixed: items.filter(
        (item) =>
          summarizeReservationStatuses(item.seats.map((seat) => seat.status)).kind ===
          "mixed"
      ).length,
    };
  }, [items]);

  const groupedByTravel = useMemo(() => {
    const map = new Map<
      string,
      {
        travel_id: string;
        travelName: string;
        origin: string;
        destination: string;
        departure_at: string;
        groups: ReservationCardView[];
        bookerEmails: string[];
      }
    >();

    for (const group of filteredItems) {
      const seatSummary = summarizeReservationStatuses(
        group.seats.map((seat) => seat.status)
      );
      const seatPreviewLabels = group.seats.map((seat) => seat.label).filter(Boolean);
      const seatPreview =
        seatPreviewLabels.length === 0
          ? "-"
          : seatPreviewLabels.length <= 3
          ? seatPreviewLabels.join(", ")
          : `${seatPreviewLabels.slice(0, 3).join(", ")} +${seatPreviewLabels.length - 3}`;
      const passengerNames = group.seats
        .map((seat) => seat.passenger_name?.trim())
        .filter((value): value is string => Boolean(value));
      const passengerPreview =
        passengerNames.length === 0
          ? "-"
          : passengerNames.length <= 2
          ? passengerNames.join(", ")
          : `${passengerNames.slice(0, 2).join(", ")} +${passengerNames.length - 2}`;

      const current = map.get(group.travel_id) ?? {
        travel_id: group.travel_id,
        travelName: group.travelName,
        origin: group.origin,
        destination: group.destination,
        departure_at: group.departure_at,
        groups: [],
        bookerEmails: [],
      };

      current.groups.push({
        ...group,
        seatSummary,
        seatPreview,
        passengerPreview,
      });

      if (group.bookerEmail && !current.bookerEmails.includes(group.bookerEmail)) {
        current.bookerEmails.push(group.bookerEmail);
      }

      map.set(group.travel_id, current);
    }

    return Array.from(map.values()).map((travel) => ({
      ...travel,
      activeGroups: travel.groups.filter((group) =>
        ["held", "awaiting_payment", "paid"].includes(group.status)
      ),
      archivedGroups: travel.groups.filter((group) =>
        ["cancelled", "expired"].includes(group.status)
      ),
      participantCount: travel.groups.reduce(
        (total, group) => total + group.seats.length,
        0
      ),
    }));
  }, [filteredItems]);

  const copyBookerEmails = async (travelId: string, emails: string[]) => {
    if (emails.length === 0) {
      setMsg(
        t("dashboard.reservations.no_emails", "No booker email addresses were found for this travel.")
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(emails.join(", "));
      setCopiedTravelId(travelId);
      setMsg(t("dashboard.reservations.emails_copied", "Email list copied."));
      window.setTimeout(() => {
        setCopiedTravelId((current) => (current === travelId ? null : current));
      }, 2000);
    } catch (error) {
      console.error(error);
      setMsg(
        t(
          "dashboard.reservations.copy_failed",
          "Failed to copy email addresses."
        )
      );
    }
  };

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

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="page-card p-4 sm:p-5">
          <div className="text-sm text-zinc-500">
            {t("dashboard.reservations.active_groups", "Active Groups")}
          </div>
          <div className="mt-1 text-3xl font-extrabold text-zinc-900">
            {summary.active}
          </div>
        </div>
        <div className="page-card p-4 sm:p-5">
          <div className="text-sm text-zinc-500">
            {t("dashboard.reservations.archived_groups", "Archived Groups")}
          </div>
          <div className="mt-1 text-3xl font-extrabold text-zinc-900">
            {summary.archived}
          </div>
        </div>
        <div className="page-card p-4 sm:p-5">
          <div className="text-sm text-zinc-500">
            {t("dashboard.reservations.awaiting_payment", "Awaiting Payment")}
          </div>
          <div className="mt-1 text-3xl font-extrabold text-amber-700">
            {summary.awaitingPayment}
          </div>
        </div>
        <div className="page-card p-4 sm:p-5">
          <div className="text-sm text-zinc-500">
            {t("dashboard.reservations.mixed", "Mixed Seat Status")}
          </div>
          <div className="mt-1 text-3xl font-extrabold text-violet-700">
            {summary.mixed}
          </div>
        </div>
      </div>

      <div className="page-card p-4 sm:p-5 lg:p-6">
        <div className="mb-4 grid gap-3 lg:grid-cols-[1.4fr_220px_220px]">
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
              placeholder="travel / participant / booker / seat"
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none ring-rose-200 transition focus:ring-4"
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
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none ring-rose-200 transition focus:ring-4"
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
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none ring-rose-200 transition focus:ring-4"
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
                className="h-36 animate-pulse rounded-2xl bg-zinc-100"
              />
            ))}
          </div>
        ) : groupedByTravel.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">
            {t("dashboard.reservations.empty", "No reservations found.")}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedByTravel.map((travel) => (
              <section
                key={travel.travel_id}
                className="overflow-hidden rounded-3xl border border-zinc-200 bg-white"
              >
                <div className="flex flex-col gap-4 border-b border-zinc-200 bg-zinc-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
                        {t("dashboard.reservations.participants", "Participants")}: {travel.participantCount}
                      </span>
                      <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                        {t("dashboard.reservations.groups", "Reservation Groups")}: {travel.groups.length}
                      </span>
                      <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                        {t("dashboard.reservations.active_groups", "Active Groups")}: {travel.activeGroups.length}
                      </span>
                      {travel.archivedGroups.length > 0 ? (
                        <span className="inline-flex rounded-full bg-zinc-200 px-3 py-1 text-xs font-bold text-zinc-700">
                          {t("dashboard.reservations.archived_groups", "Archived Groups")}: {travel.archivedGroups.length}
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-3 text-lg font-bold text-zinc-900 sm:text-xl">
                      {travel.travelName}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      {travel.destination
                        ? `${travel.origin} - ${travel.destination}`
                        : travel.origin}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {t("dashboard.reservations.departure", "Departure")}: {formatDate(travel.departure_at, lang)}
                    </p>
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-72">
                    <a
                      href={
                        travel.bookerEmails.length
                          ? `mailto:?bcc=${encodeURIComponent(travel.bookerEmails.join(","))}`
                          : undefined
                      }
                      className={[
                        "rounded-2xl px-4 py-3 text-center text-sm font-semibold transition",
                        travel.bookerEmails.length
                          ? "bg-zinc-900 text-white hover:bg-zinc-800"
                          : "cursor-not-allowed bg-zinc-200 text-zinc-500",
                      ].join(" ")}
                      onClick={(event) => {
                        if (!travel.bookerEmails.length) {
                          event.preventDefault();
                        }
                      }}
                    >
                      {t("dashboard.reservations.email_bookers", "Email Bookers")}
                    </a>
                    <button
                      type="button"
                      onClick={() => void copyBookerEmails(travel.travel_id, travel.bookerEmails)}
                      className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
                    >
                      {copiedTravelId === travel.travel_id
                        ? t("dashboard.reservations.copied", "Copied")
                        : t("dashboard.reservations.copy_emails", "Copy Email List")}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full text-sm">
                    <thead className="bg-zinc-50 text-zinc-500">
                      <tr className="border-b border-zinc-200">
                        <th className="px-4 py-3 text-start">
                          {t("dashboard.reservations.group_status", "Group")}
                        </th>
                        <th className="px-4 py-3 text-start">
                          {t("dashboard.reservations.booker", "Booker")}
                        </th>
                        <th className="px-4 py-3 text-start">
                          {t("dashboard.reservations.participants", "Participants")}
                        </th>
                        <th className="px-4 py-3 text-start">
                          {t("dashboard.reservations.seat_status", "Seat Status")}
                        </th>
                        <th className="px-4 py-3 text-start">
                          {t("dashboard.reservations.actions", "Action")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {travel.groups.map((group) => {
                        const expanded = expandedGroupIds.includes(group.id);

                        return (
                          <Fragment key={group.id}>
                            <tr className="border-b border-zinc-100 align-top">
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={[
                                      "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold",
                                      getReservationStatusTone(group.status),
                                    ].join(" ")}
                                  >
                                    {getReservationStatusLabel(group.status, t)}
                                  </span>
                                  <span
                                    className={[
                                      "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold",
                                      group.seatSummary.kind === "mixed"
                                        ? "bg-violet-100 text-violet-700"
                                        : getReservationStatusTone(
                                            group.seatSummary.status ?? "expired"
                                          ),
                                    ].join(" ")}
                                  >
                                    {group.seatSummary.kind === "mixed"
                                      ? t("page.my_bookings.mixed_status", "Mixed")
                                      : getReservationStatusLabel(
                                          group.seatSummary.status ?? "expired",
                                          t
                                        )}
                                  </span>
                                  <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-bold text-zinc-700">
                                    {group.seats.length} {t("dashboard.reservations.participants", "Participants")}
                                  </span>
                                </div>
                                <div className="mt-2 text-xs text-zinc-500">
                                  #{group.id.slice(0, 8)} · {formatDate(group.created_at, lang)}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-zinc-900">
                                  {group.bookerName}
                                </div>
                                <div className="mt-1 break-all text-xs text-zinc-500">
                                  {group.bookerEmail}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-zinc-900">
                                  {group.seatPreview}
                                </div>
                                <div className="mt-1 text-xs text-zinc-500">
                                  {group.passengerPreview}
                                </div>
                                <div className="mt-2 text-xs text-zinc-500">
                                  {group.addonSelections.length > 0
                                    ? `${group.addonSelections.length} ${t("travels.addons", "Optional services")}`
                                    : t("dashboard.reservations.no_addons", "No optional services")}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={group.status}
                                  onChange={handleGroupStatusChange(group.id)}
                                  disabled={updatingKey === `group:${group.id}`}
                                  className="w-full max-w-[220px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-rose-200 transition focus:ring-4"
                                >
                                  {STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>
                                      {getReservationStatusLabel(status, t)}
                                    </option>
                                  ))}
                                </select>
                                <div className="mt-2 text-xs text-zinc-500">
                                  {t("page.payment.total_amount", "Total")}:{" "}
                                  <span className="font-semibold text-zinc-900">
                                    {formatMoney(group.total_amount)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => toggleGroupDetails(group.id)}
                                  className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
                                >
                                  {expanded
                                    ? t("common.hide", "Hide details")
                                    : t("common.view", "View details")}
                                </button>
                              </td>
                            </tr>

                            {expanded ? (
                              <tr className="border-b border-zinc-100">
                                <td colSpan={5} className="bg-zinc-50/60 px-4 py-4">
                                  <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                                    <table className="min-w-full text-xs">
                                      <thead className="bg-zinc-50 text-zinc-500">
                                        <tr className="border-b border-zinc-200">
                                          <th className="px-3 py-2 text-start">
                                            {t("page.my_bookings.seat", "Seat")}
                                          </th>
                                          <th className="px-3 py-2 text-start">
                                            {t("dashboard.reservations.participant_name", "Participant")}
                                          </th>
                                          <th className="px-3 py-2 text-start">
                                            {t("dashboard.reservations.contact", "Contact")}
                                          </th>
                                          <th className="px-3 py-2 text-start">
                                            {t("dashboard.reservations.seat_status", "Seat Status")}
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {group.seats.map((seat) => (
                                          <tr key={seat.id} className="border-b border-zinc-100 last:border-b-0">
                                            <td className="px-3 py-2 font-semibold text-zinc-900">
                                              {seat.label}
                                            </td>
                                            <td className="px-3 py-2">
                                              {seat.passenger_name ||
                                                t("dashboard.reservations.no_name", "No participant name")}
                                            </td>
                                            <td className="px-3 py-2 break-all text-zinc-600">
                                              {seat.passenger_email || seat.passenger_phone || "-"}
                                            </td>
                                            <td className="px-3 py-2">
                                              <select
                                                value={seat.status}
                                                onChange={handleSeatStatusChange(group.id, seat.id)}
                                                disabled={updatingKey === `seat:${seat.id}`}
                                                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none ring-rose-200 transition focus:ring-4"
                                              >
                                                {STATUS_OPTIONS.map((status) => (
                                                  <option key={status} value={status}>
                                                    {getReservationStatusLabel(status, t)}
                                                  </option>
                                                ))}
                                              </select>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  {group.addonSelections.length > 0 ? (
                                    <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
                                      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                        {t("travels.addons", "Optional services")}
                                      </div>
                                      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                        {group.addonSelections.map((addon) => (
                                          <div
                                            key={addon.addon_id}
                                            className="rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-700"
                                          >
                                            <div className="font-semibold text-zinc-900">
                                              {addon.name}
                                            </div>
                                            <div className="mt-1">
                                              {addon.quantity} x {formatMoney(addon.unit_price)} ={" "}
                                              {formatMoney(addon.total_price)}
                                            </div>
                                            {addon.description ? (
                                              <div className="mt-1 text-zinc-500">
                                                {addon.description}
                                              </div>
                                            ) : null}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}

        {msg ? <div className="mt-4 text-sm text-zinc-700">{msg}</div> : null}
      </div>
    </main>
  );
}
