"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useRequireTravelLayoutAccess } from "@/lib/auth/requireTravelLayoutAccess";
import type { LayoutSeat } from "@/lib/types";
import { useT } from "@/lib/translations/useT.client";

type LayoutType = "bus" | "concert" | "custom";

type TravelLayoutRow = {
  id: string;
  name: string | null;
  layout_id: string | null;
};

type VenueLayoutRow = {
  id: string;
  name: string;
  type: LayoutType;
  rows_count: number;
  cols_count: number;
};

type PreviewSeat = LayoutSeat & {
  slotKey: string;
};

type SeatSetting = {
  seatType: string;
  isSelectable: boolean;
};

type ExistingSeatRow = {
  id: string;
  x: number;
  y: number;
  seat_key: string | null;
  label: string | null;
  seat_type: string | null;
  is_selectable: boolean | null;
};

type ExistingSeatIdentity = {
  seatKey: string | null;
  label: string | null;
};

function hasLegacyBusAisleLayout(seats: Pick<ExistingSeatRow, "x">[], cols: number) {
  if (cols <= 0) return false;
  return seats.some((seat) => Math.floor(seat.x) >= cols);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;

  if (error && typeof error === "object") {
    const maybeError = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
      error_description?: string;
    };

    const parts = [
      maybeError.message,
      maybeError.details,
      maybeError.hint,
      maybeError.error_description,
      maybeError.code ? `code: ${maybeError.code}` : null,
    ].filter(Boolean);

    if (parts.length) return parts.join(" | ");

    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function getAdjustedColumn(type: LayoutType, col: number) {
  if (type !== "bus") return col;
  return col;
}

function getSlotColumn(
  type: LayoutType,
  adjustedX: number,
  cols: number,
  useLegacyBusAisle: boolean
) {
  if (type !== "bus") return adjustedX;
  if (!useLegacyBusAisle) return adjustedX;
  const leftSideCount = Math.ceil(cols / 2);
  return adjustedX > leftSideCount ? adjustedX - 1 : adjustedX;
}

function buildSeats(
  type: LayoutType,
  rows: number,
  cols: number,
  removedSlots: Set<string>,
  layoutId: string,
  seatSettings: Record<string, SeatSetting>,
  existingSeatIdentities: Record<string, ExistingSeatIdentity> = {}
): PreviewSeat[] {
  const safeRows = Math.max(1, rows);
  const safeCols = Math.max(1, cols);
  const items: PreviewSeat[] = [];
  const usedNumbers = new Set<number>();

  for (const identity of Object.values(existingSeatIdentities)) {
    const seatKey = identity.seatKey ?? "";
    const match = /^S(\d+)$/.exec(seatKey);
    if (match) usedNumbers.add(Number(match[1]));
  }

  let nextSeatNumber = 1;
  const getNextSeatNumber = () => {
    while (usedNumbers.has(nextSeatNumber)) {
      nextSeatNumber += 1;
    }
    const value = nextSeatNumber;
    usedNumbers.add(value);
    nextSeatNumber += 1;
    return value;
  };

  for (let row = 0; row < safeRows; row += 1) {
    for (let col = 0; col < safeCols; col += 1) {
      const slotKey = `${row}:${col}`;
      if (removedSlots.has(slotKey)) continue;
      const setting = seatSettings[slotKey] ?? {
        seatType: "standard",
        isSelectable: true,
      };
      const existingIdentity = existingSeatIdentities[slotKey];
      const generatedNumber = getNextSeatNumber();
      const seatKey = existingIdentity?.seatKey ?? `S${generatedNumber}`;
      const label =
        existingIdentity?.label && existingIdentity.label.trim()
          ? existingIdentity.label
          : String(generatedNumber);

      items.push({
        id: `preview-${slotKey}`,
        layout_id: layoutId,
        seat_key: seatKey,
        label,
        x: getAdjustedColumn(type, col),
        y: row,
        width: 1,
        height: 1,
        shape: "seat",
        seat_type: setting.seatType,
        is_selectable: setting.isSelectable,
        slotKey,
      });
    }
  }

  return items;
}

export default function TravelLayoutPage() {
  const params = useParams<{ lang: string; id: string }>();
  const lang = params.lang;
  const travelId = params.id;
  const guard = useRequireTravelLayoutAccess(lang, travelId);
  const t = useT(lang);

  const [travelName, setTravelName] = useState("");
  const [layoutId, setLayoutId] = useState<string | null>(null);
  const [layoutName, setLayoutName] = useState("");
  const [layoutType, setLayoutType] = useState<LayoutType>("bus");
  const [rows, setRows] = useState(10);
  const [columns, setColumns] = useState(4);
  const [removedSlots, setRemovedSlots] = useState<string[]>([]);
  const [seatSettings, setSeatSettings] = useState<Record<string, SeatSetting>>({});
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [existingSeats, setExistingSeats] = useState<ExistingSeatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadLayout = useCallback(async (isMounted: () => boolean) => {
    if (guard !== "allowed") return;

    setLoading(true);
    setMsg(null);

    try {
      const { data: travel, error: travelError } = await supabase
        .from("travels")
        .select("id, name, layout_id")
        .eq("id", travelId)
        .single();

      if (!isMounted()) return;
      if (travelError) throw travelError;

      const travelRow = travel as TravelLayoutRow;
      setTravelName(travelRow.name ?? "Travel");
      setLayoutId(travelRow.layout_id);
      setLayoutName(
        travelRow.layout_id ? `${travelRow.name ?? "Travel"} layout` : ""
      );

      if (travelRow.layout_id) {
        const [
          { data: layout, error: layoutError },
          { data: savedSeats, error: savedSeatsError },
        ] = await Promise.all([
          supabase
            .from("venue_layouts")
            .select("id, name, type, rows_count, cols_count")
            .eq("id", travelRow.layout_id)
            .single(),
          supabase
            .from("layout_seats")
            .select("id, x, y, seat_key, label, seat_type, is_selectable")
            .eq("layout_id", travelRow.layout_id),
        ]);

        if (!isMounted()) return;
        if (layoutError) throw layoutError;
        if (savedSeatsError) throw savedSeatsError;

        const layoutRow = layout as VenueLayoutRow;
        const nextRows = Math.max(1, layoutRow.rows_count);
        const nextCols = Math.max(1, layoutRow.cols_count);
        const existingSeatRows = (savedSeats ?? []) as ExistingSeatRow[];
        const useLegacyBusAisle = hasLegacyBusAisleLayout(
          existingSeatRows,
          nextCols
        );
        const hidden = new Set<string>();
        const nextSeatSettings: Record<string, SeatSetting> = {};

        for (const seat of existingSeatRows) {
          const row = Math.floor(seat.y);
          const col = getSlotColumn(
            layoutRow.type,
            Math.floor(seat.x),
            nextCols,
            useLegacyBusAisle
          );
          const slotKey = `${row}:${col}`;

          nextSeatSettings[slotKey] = {
            seatType: seat.seat_type ?? "standard",
            isSelectable: seat.is_selectable !== false,
          };
        }

        for (let row = 0; row < nextRows; row += 1) {
          for (let col = 0; col < nextCols; col += 1) {
            const slotKey = `${row}:${col}`;
            if (!nextSeatSettings[slotKey]) hidden.add(slotKey);
          }
        }

        setLayoutName(layoutRow.name);
        setLayoutType(layoutRow.type);
        setRows(nextRows);
        setColumns(nextCols);
        setRemovedSlots(Array.from(hidden));
        setSeatSettings(nextSeatSettings);
        setExistingSeats(existingSeatRows);
        setSelectedSlot(Object.keys(nextSeatSettings)[0] ?? null);
      } else {
        setExistingSeats([]);
      }
    } catch (error) {
      console.error(error);
      setMsg(
        getErrorMessage(
          error,
          t("page.travel_layout.load_failed", "Failed to load layout")
        )
      );
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [guard, travelId, t]);

  useEffect(() => {
    if (guard !== "allowed") return;

    let mounted = true;
    const isMounted = () => mounted;

    void loadLayout(isMounted);

    return () => {
      mounted = false;
    };
  }, [guard, loadLayout]);

  const removedSlotSet = useMemo(() => new Set(removedSlots), [removedSlots]);
  const existingSeatIdentities = useMemo(() => {
    const useLegacyBusAisle = hasLegacyBusAisleLayout(existingSeats, Math.max(1, columns));
    const map: Record<string, ExistingSeatIdentity> = {};

    for (const seat of existingSeats) {
      const row = Math.floor(seat.y);
      const col = getSlotColumn(
        layoutType,
        Math.floor(seat.x),
        Math.max(1, columns),
        useLegacyBusAisle
      );
      map[`${row}:${col}`] = {
        seatKey: seat.seat_key,
        label: seat.label,
      };
    }

    return map;
  }, [columns, existingSeats, layoutType]);

  const previewSeats = useMemo(
    () =>
      buildSeats(
        layoutType,
        rows,
        columns,
        removedSlotSet,
        layoutId ?? "preview-layout",
        seatSettings,
        existingSeatIdentities
      ),
    [
      columns,
      existingSeatIdentities,
      layoutId,
      layoutType,
      removedSlotSet,
      rows,
      seatSettings,
    ]
  );

  const activeCapacity = previewSeats.length;

  const toggleSlot = (slotKey: string) => {
    setRemovedSlots((current) =>
      current.includes(slotKey)
        ? current.filter((item) => item !== slotKey)
        : [...current, slotKey]
    );
  };

  const updateSelectedSlot = (updater: (current: SeatSetting) => SeatSetting) => {
    if (!selectedSlot) return;

    setSeatSettings((current) => ({
      ...current,
      [selectedSlot]: updater(
        current[selectedSlot] ?? { seatType: "standard", isSelectable: true }
      ),
    }));
  };

  const saveLayout = async () => {
    setSaving(true);
    setMsg(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setMsg(t("page.travel_layout.signin_again", "You need to sign in again."));
        return;
      }

      let nextLayoutId = layoutId;

      if (!nextLayoutId) {
        const { data: insertedLayout, error: insertError } = await supabase
          .from("venue_layouts")
          .insert({
            name: layoutName.trim() || `${travelName} layout`,
            type: layoutType,
            rows_count: Math.max(1, rows),
            cols_count: Math.max(1, columns),
            created_by: user.id,
          })
          .select("id")
          .single();

        if (insertError || !insertedLayout) throw insertError;

        nextLayoutId = insertedLayout.id;

        const { error: travelUpdateError } = await supabase
          .from("travels")
          .update({ layout_id: nextLayoutId })
          .eq("id", travelId);

        if (travelUpdateError) throw travelUpdateError;
      } else {
        const { error: updateLayoutError } = await supabase
          .from("venue_layouts")
          .update({
            name: layoutName.trim() || `${travelName} layout`,
            type: layoutType,
            rows_count: Math.max(1, rows),
            cols_count: Math.max(1, columns),
          })
          .eq("id", nextLayoutId);

        if (updateLayoutError) throw updateLayoutError;
      }

      if (!nextLayoutId) {
        throw new Error("Layout id was not created.");
      }

      const nextSeats = buildSeats(
        layoutType,
        rows,
        columns,
        removedSlotSet,
        nextLayoutId,
        seatSettings,
        existingSeatIdentities
      );

      const existingBySlot = new Map<string, ExistingSeatRow>();
      const useLegacyBusAisle = hasLegacyBusAisleLayout(existingSeats, Math.max(1, columns));
      for (const seat of existingSeats) {
        const row = Math.floor(seat.y);
        const col = getSlotColumn(
          layoutType,
          Math.floor(seat.x),
          Math.max(1, columns),
          useLegacyBusAisle
        );
        existingBySlot.set(`${row}:${col}`, seat);
      }

      const nextBySlot = new Map(nextSeats.map((seat) => [seat.slotKey, seat]));

      const seatsToUpdate = nextSeats
        .map((seat) => {
          const existing = existingBySlot.get(seat.slotKey);
          if (!existing) return null;

          return {
            id: existing.id,
            layout_id: nextLayoutId,
            seat_key: seat.seat_key,
            label: seat.label,
            x: seat.x,
            y: seat.y,
            width: seat.width,
            height: seat.height,
            shape: seat.shape,
            seat_type: seat.seat_type,
            is_selectable: seat.is_selectable,
          };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;

      const seatsToInsert = nextSeats
        .filter((seat) => !existingBySlot.has(seat.slotKey))
        .map((seat) => ({
          layout_id: nextLayoutId,
          seat_key: seat.seat_key,
          label: seat.label,
          x: seat.x,
          y: seat.y,
          width: seat.width,
          height: seat.height,
          shape: seat.shape,
          seat_type: seat.seat_type,
          is_selectable: seat.is_selectable,
        }));

      const seatsToDelete = existingSeats
        .filter((seat) => {
          const row = Math.floor(seat.y);
          const col = getSlotColumn(
            layoutType,
            Math.floor(seat.x),
            Math.max(1, columns),
            useLegacyBusAisle
          );
          return !nextBySlot.has(`${row}:${col}`);
        })
        .map((seat) => seat.id);

      if (seatsToDelete.length) {
        const { count, error: referencesError } = await supabase
          .from("reservation_items")
          .select("id", { count: "exact", head: true })
          .in("layout_seat_id", seatsToDelete);

        if (referencesError) throw referencesError;
        if ((count ?? 0) > 0) {
          throw new Error(
            t(
              "page.travel_layout.cannot_remove_reserved",
              "Some seats already have reservations. You can change VIP/Locked status, but you cannot remove reserved seats from the layout."
            )
          );
        }
      }

      if (seatsToUpdate.length) {
        const { error: updateSeatsError } = await supabase
          .from("layout_seats")
          .upsert(seatsToUpdate, { onConflict: "id" });

        if (updateSeatsError) throw updateSeatsError;
      }

      if (seatsToInsert.length) {
        const { error: insertSeatsError } = await supabase
          .from("layout_seats")
          .insert(seatsToInsert);

        if (insertSeatsError) throw insertSeatsError;
      }

      if (seatsToDelete.length) {
        const { error: deleteSeatsError } = await supabase
          .from("layout_seats")
          .delete()
          .in("id", seatsToDelete);

        if (deleteSeatsError) throw deleteSeatsError;
      }

      const { data: refreshedSeats, error: refreshedSeatsError } = await supabase
        .from("layout_seats")
        .select("id, x, y, seat_key, label, seat_type, is_selectable")
        .eq("layout_id", nextLayoutId);

      if (refreshedSeatsError) throw refreshedSeatsError;

      setLayoutId(nextLayoutId);
      setExistingSeats((refreshedSeats ?? []) as ExistingSeatRow[]);
      setMsg(t("page.travel_layout.saved", "Seat layout saved."));
    } catch (error) {
      console.error(error);
      setMsg(
        getErrorMessage(
          error,
          t("page.travel_layout.save_failed", "Failed to save layout")
        )
      );
    } finally {
      setSaving(false);
    }
  };

  if (guard === "loading" || loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="h-64 animate-pulse rounded-3xl bg-zinc-100" />
      </main>
    );
  }

  if (guard !== "allowed") {
    return null;
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-900">
            {t("page.travel_layout.title", "Seat Layout")}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {travelName || t("page.travel_layout.travel", "Travel")}:{" "}
            {t(
              "page.travel_layout.subtitle",
              "set the maximum grid, then remove extra seats directly in the preview."
            )}
          </p>
        </div>

        <Link
          href={`/${lang}/dashboard/travels/${travelId}/edit`}
          className="rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
        >
          {t("page.travel_layout.back_to_travel", "Back to travel")}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-zinc-700">
                {t("page.travel_layout.layout_name", "Layout name")}
              </label>
              <input
                value={layoutName}
                onChange={(event) => setLayoutName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-200 focus:ring-4"
                placeholder={`${travelName || "Travel"} layout`}
              />
            </div>

            <div>
              <label htmlFor="layout-type-select" className="block text-sm font-semibold text-zinc-700">
                {t("page.travel_layout.layout_type", "Layout type")}
              </label>
              <select
                id="layout-type-select"
                value={layoutType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLayoutType(e.target.value as LayoutType)}
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-200 focus:ring-4"
              >
                <option value="bus">{t("page.travel_layout.type_bus", "Bus")}</option>
                <option value="concert">{t("page.travel_layout.type_concert", "Concert")}</option>
                <option value="custom">{t("page.travel_layout.type_custom", "Custom")}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700">
                {t("page.travel_layout.row_count", "Row count")}
              </label>
              <input
                type="number"
                min={1}
                value={rows}
                onChange={(event) => setRows(Number(event.target.value) || 1)}
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-200 focus:ring-4"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700">
                {t("page.travel_layout.max_seats_per_row", "Max seats per row")}
              </label>
              <input
                type="number"
                min={1}
                value={columns}
                onChange={(event) => setColumns(Number(event.target.value) || 1)}
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-200 focus:ring-4"
              />
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-600">
              <div>
                {t("page.travel_layout.active_seats", "Active seats")}:{" "}
                <span className="font-semibold text-zinc-900">{activeCapacity}</span>
              </div>
              <div className="mt-1">
                {t("page.travel_layout.rows", "Rows")}: <span className="font-semibold text-zinc-900">{rows}</span>
              </div>
              <div className="mt-1">
                {t("page.travel_layout.max_seats_per_row", "Max seats per row")}:{" "}
                <span className="font-semibold text-zinc-900">{columns}</span>
              </div>
              <div className="mt-1">
                {t("page.travel_layout.removed_seats", "Removed seats")}:{" "}
                <span className="font-semibold text-zinc-900">
                  {removedSlots.length}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              <div className="font-semibold text-zinc-900">
                {t("page.travel_layout.selected_slot", "Selected slot")}:
                <span className="ms-2">{selectedSlot ?? "-"}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => selectedSlot && toggleSlot(selectedSlot)}
                  className="rounded-xl bg-zinc-200 px-3 py-2 text-xs font-bold text-zinc-800"
                >
                  {selectedSlot && removedSlotSet.has(selectedSlot)
                    ? t("page.travel_layout.restore_seat", "Restore seat")
                    : t("page.travel_layout.remove_seat", "Remove seat")}
                </button>
                <button
                  type="button"
                  disabled={!selectedSlot || removedSlotSet.has(selectedSlot)}
                  onClick={() =>
                    updateSelectedSlot(() => ({
                      seatType: "standard",
                      isSelectable: true,
                    }))
                  }
                  className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-800 disabled:opacity-50"
                >
                  Standard
                </button>
                <button
                  type="button"
                  disabled={!selectedSlot || removedSlotSet.has(selectedSlot)}
                  onClick={() =>
                    updateSelectedSlot(() => ({
                      seatType: "vip",
                      isSelectable: true,
                    }))
                  }
                  className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900 disabled:opacity-50"
                >
                  VIP
                </button>
                <button
                  type="button"
                  disabled={!selectedSlot || removedSlotSet.has(selectedSlot)}
                  onClick={() =>
                    updateSelectedSlot((current) => ({
                      seatType: current.seatType === "vip" ? "vip" : "standard",
                      isSelectable: false,
                    }))
                  }
                  className="rounded-xl bg-zinc-300 px-3 py-2 text-xs font-bold text-zinc-800 disabled:opacity-50"
                >
                  Locked
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void saveLayout()}
              disabled={saving}
              className="w-full rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {saving
                ? t("page.travel_layout.saving", "Saving...")
                : t("page.travel_layout.save", "Save seat layout")}
            </button>

            {msg ? <div className="text-sm text-zinc-700">{msg}</div> : null}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-zinc-900">
                {t("page.travel_layout.preview", "Preview")}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {t(
                  "page.travel_layout.preview_help",
                  "Click a seat to remove it from the layout. Click again to restore it."
                )}
              </p>
            </div>
            <div className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-700">
              {previewSeats.length} seats
            </div>
          </div>

          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: Math.max(1, rows) }).flatMap((_, row) =>
              Array.from({ length: Math.max(1, columns) }).map((__, col) => {
                const slotKey = `${row}:${col}`;
                const seat = previewSeats.find((item) => item.slotKey === slotKey);
                const adjustedCol = getAdjustedColumn(layoutType, col);
                const isSelectedSlot = selectedSlot === slotKey;
                const isLocked = seat ? seat.is_selectable === false : false;
                const isVip = seat?.seat_type === "vip";

                return (
                  <button
                    key={slotKey}
                    type="button"
                    onClick={() => setSelectedSlot(slotKey)}
                    className={[
                      "rounded-2xl border px-3 py-4 text-center transition",
                      isSelectedSlot ? "ring-4 ring-emerald-200" : "",
                      seat
                        ? isLocked
                          ? "border-zinc-400 bg-zinc-300 text-zinc-700"
                          : isVip
                          ? "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200"
                          : "border-zinc-200 bg-zinc-50 hover:border-rose-300 hover:bg-rose-50"
                        : "border-dashed border-zinc-200 bg-zinc-100 text-zinc-400 hover:border-zinc-300",
                    ].join(" ")}
                    style={{
                      gridColumnStart: adjustedCol + 1,
                      gridRowStart: row + 1,
                    }}
                  >
                    {seat ? (
                      <>
                        <div className="text-sm font-bold text-zinc-900">{seat.label}</div>
                        <div className="mt-1 text-[11px] text-zinc-500">
                          {isLocked ? "Locked" : isVip ? "VIP" : seat.seat_key}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs font-semibold">
                        {t("page.travel_layout.removed", "Removed")}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
