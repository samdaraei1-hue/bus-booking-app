"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Travel } from "@/lib/types";
import { useT } from "@/lib/translations/useT.client";
import { getTravelTranslationsMap } from "@/lib/translations/getTravelTranslation.client";
import { getBookingMode, getOfferingKind } from "@/lib/offerings";

type ReservationItemStatRow = {
  status: string;
  reservation_groups:
    | {
        travel_id: string;
      }
    | Array<{
        travel_id: string;
      }>
    | null;
};

type LayoutSeatCapacityRow = {
  layout_id: string;
  is_selectable: boolean | null;
};

type TravelStats = {
  reserved: number;
  paid: number;
  capacity: number;
  available: number;
};

export default function DashboardTravelsPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const router = useRouter();
  const t = useT(lang);

  const [travels, setTravels] = useState<Travel[]>([]);
  const [travelTranslations, setTravelTranslations] = useState<
    Record<string, Record<string, string>>
  >({});
  const [travelStats, setTravelStats] = useState<Record<string, TravelStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchTravels();
    // fetchTravels intentionally depends only on lang here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const fetchTravels = async () => {
    setLoading(true);

    try {
      const [
        { data: travelData, error: travelError },
        { data: reservationData, error: reservationError },
        { data: layoutSeatData, error: layoutSeatError },
      ] = await Promise.all([
        supabase.from("travels").select("*"),
        supabase
          .from("reservation_items")
          .select("status, reservation_groups:reservation_group_id(travel_id)"),
        supabase.from("layout_seats").select("layout_id, is_selectable"),
      ]);

      if (travelError || reservationError || layoutSeatError) {
        console.error(travelError || reservationError || layoutSeatError);
        setTravels([]);
        setTravelTranslations({});
        setTravelStats({});
        return;
      }

      const nextTravels = (travelData || []) as Travel[];
      setTravels(nextTravels);

      const translations = await getTravelTranslationsMap(
        nextTravels.map((travel) => travel.id),
        lang
      );
      setTravelTranslations(translations);

      const capacityByLayout = new Map<string, number>();
      for (const seat of (layoutSeatData || []) as LayoutSeatCapacityRow[]) {
        if (!seat.layout_id || seat.is_selectable === false) continue;
        capacityByLayout.set(
          seat.layout_id,
          (capacityByLayout.get(seat.layout_id) || 0) + 1
        );
      }

      const countsByTravel = new Map<
        string,
        {
          reserved: number;
          paid: number;
        }
      >();

      for (const item of (reservationData || []) as unknown as ReservationItemStatRow[]) {
        const reservationGroup = Array.isArray(item.reservation_groups)
          ? item.reservation_groups[0]
          : item.reservation_groups;
        const travelId = reservationGroup?.travel_id;
        if (!travelId) continue;

        const current = countsByTravel.get(travelId) ?? {
          reserved: 0,
          paid: 0,
        };

        if (["held", "awaiting_payment", "paid"].includes(item.status)) {
          current.reserved += 1;
        }

        if (item.status === "paid") {
          current.paid += 1;
        }

        countsByTravel.set(travelId, current);
      }

      const nextStats: Record<string, TravelStats> = {};

      for (const travel of nextTravels) {
        const counts = countsByTravel.get(travel.id) ?? { reserved: 0, paid: 0 };
        const capacity =
          getBookingMode(travel.booking_mode) === "capacity_only"
            ? Math.max(0, Number(travel.max_capacity) || 0)
            : Math.max(0, capacityByLayout.get(travel.layout_id ?? "") || 0);

        nextStats[travel.id] = {
          reserved: counts.reserved,
          paid: counts.paid,
          capacity,
          available: Math.max(capacity - counts.paid, 0),
        };
      }

      setTravelStats(nextStats);
    } catch (error) {
      console.error(error);
      setTravels([]);
      setTravelTranslations({});
      setTravelStats({});
    } finally {
      setLoading(false);
    }
  };

  const deleteTravel = async (id: string) => {
    if (!confirm(t("confirm.delete", "Are you sure?"))) return;

    await supabase.from("travel_teams").delete().eq("travel_id", id);
    await supabase
      .from("translations")
      .delete()
      .eq("entity_id", id)
      .eq("namespace", "travel");

    const { error } = await supabase.from("travels").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert(t("error.delete_failed", "Delete failed: ") + error.message);
    } else {
      void fetchTravels();
    }
  };

  if (loading) {
    return (
      <main className="page-shell">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-zinc-100" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl">
            {t("page.dashboard.travels", "Manage Trips & Events")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            {t("page.dashboard.travels_desc", "Create, edit, and view trips and events")}
          </p>
        </div>

        <button
          onClick={() => router.push(`/${lang}/dashboard/travels/create`)}
          className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          {t("button.add_new", "Add new")}
        </button>
      </div>

      <div className="page-card p-4 sm:p-6">
        <div className="space-y-4 lg:hidden">
          {travels.map((travel) => {
            const i18n = travelTranslations[travel.id] || {};
            const stats = travelStats[travel.id] || {
              reserved: 0,
              paid: 0,
              capacity: 0,
              available: 0,
            };
            const localized = {
              name: i18n.name ?? travel.name,
              origin: i18n.origin ?? travel.origin,
              destination: i18n.destination ?? travel.destination,
            };

            return (
              <article
                key={travel.id}
                className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200">
                      {(() => {
                        const kind = getOfferingKind(travel.kind ?? travel.type);
                        if (kind === "event") return t("travel.type.event", "Event");
                        if (kind === "hiking") return t("travel.type.hiking", "Hiking");
                        if (kind === "walking") return t("travel.type.walking", "Walking");
                        if (kind === "camping") return t("travel.type.camping", "Camping");
                        if (kind === "mixed_trip") return t("travel.type.mixed_trip", "Mixed trip");
                        if (kind === "trip") return t("travel.type.travel", "Trip");
                        return t("travel.type.custom", "Program");
                      })()}
                    </span>
                    <h2 className="mt-3 text-base font-bold text-zinc-900">
                      {localized.name}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      {localized.destination
                        ? `${localized.origin} · ${localized.destination}`
                        : localized.origin}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {new Date(travel.departure_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                    {travel.price}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-white p-3 ring-1 ring-zinc-200">
                    <div className="text-zinc-500">
                      {t("dashboardtravels.reserved", "Reserved")}
                    </div>
                    <div className="mt-1 font-bold text-zinc-900">{stats.reserved}</div>
                  </div>
                  <div className="rounded-xl bg-white p-3 ring-1 ring-zinc-200">
                    <div className="text-zinc-500">
                      {t("dashboardtravels.paid", "Paid")}
                    </div>
                    <div className="mt-1 font-bold text-emerald-700">{stats.paid}</div>
                  </div>
                  <div className="rounded-xl bg-white p-3 ring-1 ring-zinc-200">
                    <div className="text-zinc-500">
                      {t("dashboardtravels.capacity", "Capacity")}
                    </div>
                    <div className="mt-1 font-bold text-zinc-900">{stats.capacity}</div>
                  </div>
                  <div className="rounded-xl bg-white p-3 ring-1 ring-zinc-200">
                    <div className="text-zinc-500">
                      {t("dashboardtravels.available", "Available")}
                    </div>
                    <div className="mt-1 font-bold text-rose-700">{stats.available}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <button
                    onClick={() =>
                      router.push(`/${lang}/dashboard/travels/${travel.id}/edit`)
                    }
                    className="rounded-xl bg-zinc-100 px-3 py-2.5 font-semibold text-zinc-800 transition hover:bg-zinc-200"
                  >
                    {t("button.edit", "Edit")}
                  </button>
                  {getBookingMode(travel.booking_mode) === "seat_map" ? (
                    <button
                      onClick={() =>
                        router.push(`/${lang}/dashboard/travels/${travel.id}/layout`)
                      }
                      className="rounded-xl bg-emerald-50 px-3 py-2.5 font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      {t("page.travel_layout.title", "Seat Layout")}
                    </button>
                  ) : null}
                  <button
                    onClick={() =>
                      router.push(
                        `/${lang}/dashboard/travels/${travel.id}/translations`
                      )
                    }
                    className="rounded-xl bg-violet-50 px-3 py-2.5 font-semibold text-violet-700 transition hover:bg-violet-100"
                  >
                    {t("page.dashboard.translations", "Translations")}
                  </button>
                  <button
                    onClick={() => deleteTravel(travel.id)}
                    className="rounded-xl bg-rose-50 px-3 py-2.5 font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    {t("button.delete", "Delete")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="p-3 text-start">{t("travels.type", "Type")}</th>
                <th className="p-3 text-start">
                  {t("dashboardtravels.name", "Travel name")}
                </th>
                <th className="p-3 text-start">
                  {t("page.travel_detail.origin", "Origin")}
                </th>
                <th className="p-3 text-start">
                  {t("page.travel_detail.destination", "Destination")}
                </th>
                <th className="p-3 text-start">
                  {t("page.travel_detail.departure", "Departure")}
                </th>
                <th className="p-3 text-start">
                  {t("page.travel_detail.price", "Price")}
                </th>
                <th className="p-3 text-start">
                  {t("dashboardtravels.reserved", "Reserved")}
                </th>
                <th className="p-3 text-start">
                  {t("dashboardtravels.paid", "Paid")}
                </th>
                <th className="p-3 text-start">
                  {t("dashboardtravels.capacity", "Capacity")}
                </th>
                <th className="p-3 text-start">
                  {t("dashboardtravels.available", "Available")}
                </th>
                <th className="p-3 text-start">
                  {t("dashboardtravels.actions", "Action")}
                </th>
              </tr>
            </thead>
            <tbody>
              {travels.map((travel) => {
                const i18n = travelTranslations[travel.id] || {};
                const stats = travelStats[travel.id] || {
                  reserved: 0,
                  paid: 0,
                  capacity: 0,
                  available: 0,
                };
                const localized = {
                  name: i18n.name ?? travel.name,
                  origin: i18n.origin ?? travel.origin,
                  destination: i18n.destination ?? travel.destination,
                };

                return (
                  <tr key={travel.id} className="border-b border-zinc-100">
                    <td className="p-3">
                      {(() => {
                        const kind = getOfferingKind(travel.kind ?? travel.type);
                        if (kind === "event") return t("travel.type.event", "Event");
                        if (kind === "hiking") return t("travel.type.hiking", "Hiking");
                        if (kind === "walking") return t("travel.type.walking", "Walking");
                        if (kind === "camping") return t("travel.type.camping", "Camping");
                        if (kind === "mixed_trip") return t("travel.type.mixed_trip", "Mixed trip");
                        if (kind === "trip") return t("travel.type.travel", "Trip");
                        return t("travel.type.custom", "Program");
                      })()}
                    </td>
                    <td className="p-3 font-semibold text-zinc-900">
                      {localized.name}
                    </td>
                    <td className="p-3">{localized.origin}</td>
                    <td className="p-3">{localized.destination || "-"}</td>
                    <td className="p-3">
                      {new Date(travel.departure_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">{travel.price}</td>
                    <td className="p-3">{stats.reserved}</td>
                    <td className="p-3 text-emerald-700">{stats.paid}</td>
                    <td className="p-3">{stats.capacity}</td>
                    <td className="p-3 text-rose-700">{stats.available}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() =>
                            router.push(`/${lang}/dashboard/travels/${travel.id}/edit`)
                          }
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          {t("button.edit", "Edit")}
                        </button>
                        {getBookingMode(travel.booking_mode) === "seat_map" ? (
                          <button
                            onClick={() =>
                              router.push(`/${lang}/dashboard/travels/${travel.id}/layout`)
                            }
                          className="font-semibold text-emerald-600 hover:underline"
                        >
                          {t("page.travel_layout.title", "Seat Layout")}
                        </button>
                      ) : null}
                        <button
                          onClick={() =>
                            router.push(
                              `/${lang}/dashboard/travels/${travel.id}/translations`
                            )
                          }
                          className="font-semibold text-violet-600 hover:underline"
                        >
                          {t("page.dashboard.translations", "Translations")}
                        </button>
                        <button
                          onClick={() => deleteTravel(travel.id)}
                          className="font-semibold text-red-600 hover:underline"
                        >
                          {t("button.delete", "Delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {travels.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
            {t("page.dashboard.travels_empty", "No items found.")}
          </div>
        ) : null}
      </div>
    </main>
  );
}
