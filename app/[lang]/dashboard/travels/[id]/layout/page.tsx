"use client";

import { useEffect, useMemo, useState } from "react";
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

function getAdjustedColumn(type: LayoutType, col: number, cols: number) {
  if (type !== "bus") return col;
  const leftSideCount = Math.ceil(cols / 2);
  return col >= leftSideCount ? col + 1 : col;
}

function buildSeats(
  type: LayoutType,
  rows: number,
  cols: number,
  removedSlots: Set<string>,
  layoutId: string
): PreviewSeat[] {
  const safeRows = Math.max(1, rows);
  const safeCols = Math.max(1, cols);
  const items: PreviewSeat[] = [];
  let seatNumber = 1;

  for (let row = 0; row < safeRows; row += 1) {
    for (let col = 0; col < safeCols; col += 1) {
      const slotKey = `${row}:${col}`;
      if (removedSlots.has(slotKey)) continue;

      items.push({
        id: `preview-${slotKey}`,
        layout_id: layoutId,
        seat_key: `S${seatNumber}`,
        label: String(seatNumber),
        x: getAdjustedColumn(type, col, safeCols),
        y: row,
        width: 1,
        height: 1,
        shape: "seat",
        seat_type: "standard",
        is_selectable: true,
        slotKey,
      });

      seatNumber += 1;
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (guard !== "allowed") return;

    let mounted = true;

    (async () => {
      setLoading(true);
      setMsg(null);

      try {
        const { data: travel, error: travelError } = await supabase
          .from("travels")
          .select("id, name, layout_id")
          .eq("id", travelId)
          .single();

        if (!mounted) return;
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
              .select("x, y")
              .eq("layout_id", travelRow.layout_id),
          ]);

          if (!mounted) return;
          if (layoutError) throw layoutError;
          if (savedSeatsError) throw savedSeatsError;

          const layoutRow = layout as VenueLayoutRow;
          const nextRows = Math.max(1, layoutRow.rows_count);
          const nextCols = Math.max(1, layoutRow.cols_count);
          const existingSeats = (savedSeats ?? []) as Array<{ x: number; y: number }>;
          const hidden = new Set<string>();

          for (let row = 0; row < nextRows; row += 1) {
            for (let col = 0; col < nextCols; col += 1) {
              const expectedX = getAdjustedColumn(layoutRow.type, col, nextCols);
              const exists = existingSeats.some(
                (seat) => Math.floor(seat.x) === expectedX && Math.floor(seat.y) === row
              );

              if (!exists) {
                hidden.add(`${row}:${col}`);
              }
            }
          }

          setLayoutName(layoutRow.name);
          setLayoutType(layoutRow.type);
          setRows(nextRows);
          setColumns(nextCols);
          setRemovedSlots(Array.from(hidden));
        }
      } catch (error) {
        console.error(error);
        setMsg(
          error instanceof Error
            ? error.message
            : t("page.travel_layout.load_failed", "Failed to load layout")
        );
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [guard, travelId]);

  const removedSlotSet = useMemo(() => new Set(removedSlots), [removedSlots]);

  const previewSeats = useMemo(
    () =>
      buildSeats(
        layoutType,
        rows,
        columns,
        removedSlotSet,
        layoutId ?? "preview-layout"
      ),
    [columns, layoutId, layoutType, removedSlotSet, rows]
  );

  const activeCapacity = previewSeats.length;

  const toggleSlot = (slotKey: string) => {
    setRemovedSlots((current) =>
      current.includes(slotKey)
        ? current.filter((item) => item !== slotKey)
        : [...current, slotKey]
    );
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

        const { error: deleteSeatsError } = await supabase
          .from("layout_seats")
          .delete()
          .eq("layout_id", nextLayoutId);

        if (deleteSeatsError) throw deleteSeatsError;
      }

      if (!nextLayoutId) {
        throw new Error("Layout id was not created.");
      }

      const seatsToInsert = buildSeats(
        layoutType,
        rows,
        columns,
        removedSlotSet,
        nextLayoutId
      ).map((seat) => ({
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

      const { error: insertSeatsError } = await supabase
        .from("layout_seats")
        .insert(seatsToInsert);

      if (insertSeatsError) throw insertSeatsError;

      setLayoutId(nextLayoutId);
      setMsg(t("page.travel_layout.saved", "Seat layout saved."));
    } catch (error) {
      console.error(error);
      setMsg(
        error instanceof Error
          ? error.message
          : t("page.travel_layout.save_failed", "Failed to save layout")
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
              <label className="block text-sm font-semibold text-zinc-700">
                {t("page.travel_layout.layout_type", "Layout type")}
              </label>
              <select
                value={layoutType}
                onChange={(event) => setLayoutType(event.target.value as LayoutType)}
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-emerald-200 focus:ring-4"
              >
                <option value="bus">Bus</option>
                <option value="concert">Concert</option>
                <option value="custom">Custom</option>
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
              gridTemplateColumns: `repeat(${layoutType === "bus" ? columns + 1 : Math.max(1, columns)}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: Math.max(1, rows) }).flatMap((_, row) =>
              Array.from({ length: Math.max(1, columns) }).map((__, col) => {
                const slotKey = `${row}:${col}`;
                const seat = previewSeats.find((item) => item.slotKey === slotKey);
                const adjustedCol = getAdjustedColumn(layoutType, col, Math.max(1, columns));

                return (
                  <button
                    key={slotKey}
                    type="button"
                    onClick={() => toggleSlot(slotKey)}
                    className={[
                      "rounded-2xl border px-3 py-4 text-center transition",
                      seat
                        ? "border-zinc-200 bg-zinc-50 hover:border-rose-300 hover:bg-rose-50"
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
                        <div className="mt-1 text-[11px] text-zinc-500">{seat.seat_key}</div>
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
