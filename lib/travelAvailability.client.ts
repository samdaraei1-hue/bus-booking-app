import { supabase } from "@/lib/supabaseClient";
import type { Travel } from "@/lib/types";
import { getBookingMode } from "@/lib/offerings";

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

export async function getTravelSoldOutMap(travels: Travel[]) {
  if (travels.length === 0) {
    return {} as Record<string, boolean>;
  }

  const [reservationResponse, layoutSeatResponse] = await Promise.all([
    supabase
      .from("reservation_items")
      .select("status, reservation_groups:reservation_group_id(travel_id)"),
    supabase.from("layout_seats").select("layout_id, is_selectable"),
  ]);

  if (reservationResponse.error) {
    throw reservationResponse.error;
  }

  if (layoutSeatResponse.error) {
    throw layoutSeatResponse.error;
  }

  const paidByTravel = new Map<string, number>();

  for (const item of (reservationResponse.data || []) as unknown as ReservationItemStatRow[]) {
    const reservationGroup = Array.isArray(item.reservation_groups)
      ? item.reservation_groups[0]
      : item.reservation_groups;
    const travelId = reservationGroup?.travel_id;

    if (!travelId || item.status !== "paid") continue;

    paidByTravel.set(travelId, (paidByTravel.get(travelId) || 0) + 1);
  }

  const capacityByLayout = new Map<string, number>();

  for (const seat of (layoutSeatResponse.data || []) as LayoutSeatCapacityRow[]) {
    if (!seat.layout_id || seat.is_selectable === false) continue;

    capacityByLayout.set(
      seat.layout_id,
      (capacityByLayout.get(seat.layout_id) || 0) + 1
    );
  }

  const soldOutMap: Record<string, boolean> = {};

  for (const travel of travels) {
    const paid = paidByTravel.get(travel.id) || 0;
    const capacity =
      getBookingMode(travel.booking_mode) === "capacity_only"
        ? Math.max(0, Number(travel.max_capacity) || 0)
        : Math.max(0, capacityByLayout.get(travel.layout_id ?? "") || 0);

    soldOutMap[travel.id] = capacity > 0 && paid >= capacity;
  }

  return soldOutMap;
}
