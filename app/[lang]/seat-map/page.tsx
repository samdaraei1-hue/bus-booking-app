"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import SeatGrid from "@/components/travel/SeatGrid";
import { useT } from "@/lib/translations/useT.client";
import type { LayoutSeat, Travel } from "@/lib/types";
import { isReservationActive } from "@/lib/reservations";
import { getTravelTranslations } from "@/lib/translations/getTravelTranslation.client";
import { fetchWithSupabaseAuth } from "@/lib/api/fetchWithSupabaseAuth.client";
import { canChangeSeatForReservation } from "@/lib/reservationPolicies";

type ReservationItemRow = {
  layout_seat_id: string;
  reservation_groups: {
    status: string;
    expires_at: string | null;
  } | null;
};

type SeatLockRow = {
  layout_seat_id: string;
  expires_at: string | null;
};

type EditableReservationGroup = {
  id: string;
  status: string;
  travel_id: string;
  travels: {
    departure_at: string | null;
  } | null;
};

const PENDING_SELECTION_KEY = "pending-seat-selection";

export default function SeatMapPage() {
  const router = useRouter();
  const routeParams = useParams<{ lang: string }>();
  const lang = routeParams.lang;
  const t = useT(lang);

  const sp = useSearchParams();
  const travelId = sp.get("travel") ?? "";
  const reservationId = sp.get("reservation") ?? "";
  const isViewMode = sp.get("view") === "1";
  const isChangeMode = sp.get("change") === "1";
  const pendingSelectionParam = sp.get("selected") ?? "";

  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [viewSeatIds, setViewSeatIds] = useState<string[]>([]);
  const [seats, setSeats] = useState<LayoutSeat[]>([]);
  const [unavailableSeatIds, setUnavailableSeatIds] = useState<string[]>([]);
  const [travelTitle, setTravelTitle] = useState("");
  const [seatLimit, setSeatLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [gridSeed, setGridSeed] = useState("default");

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!travelId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setMsg(null);

      try {
        const { data: travelRow, error: travelError } = await supabase
          .from("travels")
          .select("id, name, origin, destination, layout_id")
          .eq("id", travelId)
          .single();

        if (!mounted) return;

        if (travelError) {
          setMsg(travelError.message);
          return;
        }

        const travel = travelRow as Pick<
          Travel,
          "id" | "name" | "origin" | "destination" | "layout_id"
        >;
        if (!travel.layout_id) {
          setMsg(
            t(
              "page.seat_map.no_layout",
              "No seat layout is assigned to this travel yet."
            )
          );
          return;
        }

        const translated = await getTravelTranslations(travel.id, lang);
        if (!mounted) return;
        const translatedRoute = `${translated.origin ?? travel.origin ?? ""} - ${
          translated.destination ?? travel.destination ?? ""
        }`
          .replace(/\s+-\s+$/, "")
          .trim();
        setTravelTitle(
          translated.name ?? (translatedRoute || travel.name || travel.id)
        );

        const [
          { data: seatRows, error: seatsError },
          { data: reservationRows, error: reservationsError },
          { data: lockRows, error: locksError },
          { data: selectedReservationRows, error: selectedReservationError },
          { data: editableReservation, error: editableReservationError },
        ] = await Promise.all([
          supabase
            .from("layout_seats")
            .select(
              "id, layout_id, seat_key, label, x, y, width, height, shape, seat_type, is_selectable"
            )
            .eq("layout_id", travel.layout_id),
          supabase
            .from("reservation_items")
            .select(
              "layout_seat_id, reservation_groups:reservation_group_id(status, expires_at)"
            )
            .eq("reservation_groups.travel_id", travelId),
          supabase
            .from("seat_locks")
            .select("layout_seat_id, expires_at")
            .eq("travel_id", travelId),
          reservationId
            ? supabase
                .from("reservation_items")
                .select("layout_seat_id")
                .eq("reservation_group_id", reservationId)
            : Promise.resolve({ data: [], error: null }),
          reservationId && isChangeMode
            ? supabase
                .from("reservation_groups")
                .select(
                  `
                    id,
                    status,
                    travel_id,
                    travels:travel_id (
                      departure_at
                    )
                  `
                )
                .eq("id", reservationId)
                .single()
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (!mounted) return;

        if (seatsError) {
          setMsg(seatsError.message);
          return;
        }

        setSeats((seatRows ?? []) as LayoutSeat[]);

        const blockedSeatIds = new Set<string>();

        if (!reservationsError) {
          ((reservationRows ?? []) as unknown as ReservationItemRow[]).forEach(
            (row) => {
              const group = row.reservation_groups;
              if (group && isReservationActive(group.status, group.expires_at)) {
                blockedSeatIds.add(row.layout_seat_id);
              }
            }
          );
        }

        if (!locksError) {
          ((lockRows ?? []) as SeatLockRow[]).forEach((row) => {
            if (!row.expires_at || new Date(row.expires_at).getTime() > Date.now()) {
              blockedSeatIds.add(row.layout_seat_id);
            }
          });
        }

        if (!selectedReservationError) {
          const selectedIds = (selectedReservationRows ?? []).map(
            (row) => row.layout_seat_id as string
          );
          setViewSeatIds(selectedIds);
          if (isChangeMode) {
            setSelectedSeatIds(selectedIds);
            setSeatLimit(selectedIds.length);
            setGridSeed(selectedIds.join(","));
          }
          selectedIds.forEach((seatId) => blockedSeatIds.delete(seatId));
        }

        if (isChangeMode) {
          const editableGroup = editableReservation as EditableReservationGroup | null;

          if (editableReservationError || !editableGroup) {
            setMsg("Seat change is not available for this reservation.");
            return;
          }

          if (
            !canChangeSeatForReservation(
              editableGroup.status,
              editableGroup.travels?.departure_at
            )
          ) {
            setMsg("Seat change is not available for this reservation.");
          }
        }

        setUnavailableSeatIds(Array.from(blockedSeatIds));
      } catch (error) {
        if (!mounted) return;
        setMsg(
          error instanceof Error ? error.message : "Failed to load seat map"
        );
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [lang, reservationId, router, t, travelId]);

  useEffect(() => {
    if (isViewMode || isChangeMode || !travelId) return;

    const restorePendingSelection = () => {
      const idsFromQuery = pendingSelectionParam
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      let ids = idsFromQuery;

      if (!ids.length) {
        try {
          const raw = window.sessionStorage.getItem(PENDING_SELECTION_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as {
              travelId?: string;
              seatIds?: string[];
            };
            if (parsed.travelId === travelId && Array.isArray(parsed.seatIds)) {
              ids = parsed.seatIds.filter(Boolean);
            }
          }
        } catch (error) {
          console.error("Failed to restore pending seat selection", error);
        }
      }

      if (ids.length) {
        setSelectedSeatIds(ids);
        setGridSeed(ids.join(","));
      }
    };

    restorePendingSelection();
  }, [isChangeMode, isViewMode, pendingSelectionParam, travelId]);

  useEffect(() => {
    if (isViewMode || isChangeMode || !travelId) return;

    try {
      if (selectedSeatIds.length) {
        window.sessionStorage.setItem(
          PENDING_SELECTION_KEY,
          JSON.stringify({ travelId, seatIds: selectedSeatIds })
        );
      } else {
        window.sessionStorage.removeItem(PENDING_SELECTION_KEY);
      }
    } catch (error) {
      console.error("Failed to persist pending seat selection", error);
    }
  }, [isChangeMode, isViewMode, selectedSeatIds, travelId]);

  const canContinue =
    !isViewMode &&
    selectedSeatIds.length > 0 &&
    !!travelId &&
    (!seatLimit || selectedSeatIds.length === seatLimit);
  const selectedSeatsLabel = useMemo(
    () =>
      seats
        .filter((seat) =>
          (isViewMode ? viewSeatIds : selectedSeatIds).includes(seat.id)
        )
        .map((seat) => seat.label)
        .join(", "),
    [isViewMode, seats, selectedSeatIds, viewSeatIds]
  );

  const createHeldReservation = async () => {
    setMsg(null);

    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    if (authError || !user) {
      const next = `/${lang}/seat-map?travel=${encodeURIComponent(
        travelId
      )}&selected=${encodeURIComponent(selectedSeatIds.join(","))}`;
      router.push(`/${lang}/login?next=${encodeURIComponent(next)}`);
      return;
    }

    const response = await fetchWithSupabaseAuth("/api/reservations/hold", {
      method: "POST",
      body: JSON.stringify({
        travelId,
        seatIds: selectedSeatIds,
      }),
    });

    if (!response.ok) {
      setMsg(
        (response.data as { error?: string } | null)?.error ??
          "Failed to create reservation hold"
      );
      return;
    }

    const reservationId =
      (response.data as { reservationId?: string } | null)?.reservationId ?? "";

    if (!reservationId) {
      setMsg("Failed to create reservation hold");
      return;
    }

    try {
      window.sessionStorage.removeItem(PENDING_SELECTION_KEY);
    } catch {}

    router.push(
      `/${lang}/reservation-details?reservation=${encodeURIComponent(reservationId)}`
    );
  };

  const changeSeats = async () => {
    if (!reservationId) return;

    setMsg(null);

    const response = await fetchWithSupabaseAuth(
      `/api/reservations/${encodeURIComponent(reservationId)}/change-seats`,
      {
        method: "POST",
        body: JSON.stringify({
          seatIds: selectedSeatIds,
        }),
      }
    );

    if (!response.ok) {
      setMsg(
        (response.data as { error?: string } | null)?.error ??
          "Failed to change seats."
      );
      return;
    }

    router.push(`/${lang}/my-bookings`);
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="h-72 animate-pulse rounded-3xl bg-zinc-100" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">{t("page.seat_map.title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {travelId
            ? `${t("page.seat_map.subtitle_with_travel")} ${travelTitle || travelId}`
            : t("page.seat_map.subtitle_without_travel")}
        </p>
        {isViewMode ? (
          <p className="mt-2 text-sm text-sky-700">
            {t(
              "page.seat_map.view_mode",
              "This map is shown in read-only mode for your reservation."
            )}
          </p>
        ) : isChangeMode ? (
          <p className="mt-2 text-sm text-amber-700">
            {seatLimit
              ? `Select exactly ${seatLimit} seat(s) to replace your current selection.`
              : "Select your new seats."}
          </p>
        ) : null}
        {msg ? <p className="mt-2 text-sm text-rose-600">{msg}</p> : null}
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <div className="mb-4 text-center text-xs font-bold tracking-wide text-zinc-500">
          {t("page.seat_map.bus_back", "Back of Bus")}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-700">
            {t("page.seat_map.bus_map")}
          </div>
          <div className="text-sm text-zinc-600">
            {t("page.seat_map.selected_count")}:{" "}
            <span className="font-bold">
              {isViewMode ? viewSeatIds.length : selectedSeatIds.length}
            </span>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold text-zinc-700">
          <span className="rounded-full bg-zinc-100 px-3 py-1">Standard</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">VIP</span>
          <span className="rounded-full bg-zinc-300 px-3 py-1 text-zinc-700">Locked</span>
        </div>

        <SeatGrid
          key={isViewMode ? `view-${reservationId}` : `edit-${gridSeed}`}
          seats={seats}
          unavailableSeatIds={unavailableSeatIds}
          initialSelectedSeatIds={isViewMode ? viewSeatIds : selectedSeatIds}
          readOnly={isViewMode}
          maxSelection={seatLimit ?? undefined}
          onChange={setSelectedSeatIds}
        />

        {selectedSeatsLabel ? (
          <div className="mt-4 text-sm text-zinc-600">
            {t("page.seat_map.selected_label", "Selected")}:
            <span className="font-semibold"> {selectedSeatsLabel}</span>
          </div>
        ) : null}

        <div className="mt-6 text-center text-xs font-bold tracking-wide text-zinc-500">
          {t("page.seat_map.bus_front", "Front of Bus")}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-2xl bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
          >
            {t("common.back")}
          </button>

          {!isViewMode ? (
            <button
              type="button"
              disabled={!canContinue}
              onClick={() =>
                void (isChangeMode ? changeSeats() : createHeldReservation())
              }
              className={
                "rounded-2xl px-6 py-3 text-sm font-bold text-white shadow-lg transition " +
                (canContinue
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "cursor-not-allowed bg-zinc-300")
              }
            >
              {isChangeMode ? "Confirm Seat Change" : t("page.seat_map.continue_payment")}
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
