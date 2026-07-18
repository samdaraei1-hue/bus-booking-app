import { NextResponse } from "next/server";
import type { ReservationStatus } from "@/lib/types";
import { authenticateDashboardRequest } from "@/lib/server/dashboardAccess";
import { sendReservationStatusEmail } from "@/lib/email/reservationNotifications";

type Body = {
  seatId?: string;
  status?: ReservationStatus;
};

type CurrentSeatItemRow = {
  id: string;
  status: ReservationStatus;
  layout_seat_id: string | null;
  reservation_groups:
    | { travel_id: string }
    | Array<{ travel_id: string }>
    | null;
};

const ALLOWED_STATUSES: ReservationStatus[] = [
  "held",
  "awaiting_payment",
  "paid",
  "cancelled",
  "expired",
];

const RELEASING_STATUSES: ReservationStatus[] = ["cancelled", "expired"];

export async function POST(
  request: Request,
  context: { params: Promise<{ reservationId: string }> }
) {
  try {
    const { reservationId } = await context.params;
    const { supabase } = await authenticateDashboardRequest(request);
    const body = (await request.json()) as Body;
    const seatId = body.seatId?.trim();
    const status = body.status;

    if (!reservationId || !seatId || !status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid seat status update." }, { status: 400 });
    }

    const { data: currentItem, error: currentItemError } = await supabase
      .from("reservation_items")
      .select(
        `
          id,
          status,
          layout_seat_id,
          reservation_groups:reservation_group_id (
            travel_id
          )
        `
      )
      .eq("id", seatId)
      .eq("reservation_group_id", reservationId)
      .single();

    if (currentItemError || !currentItem) {
      return NextResponse.json({ error: "Reservation seat not found." }, { status: 404 });
    }

    const currentSeatItem = currentItem as CurrentSeatItemRow;
    const currentStatus = currentSeatItem.status;
    const travelId = Array.isArray(currentSeatItem.reservation_groups)
      ? currentSeatItem.reservation_groups[0]?.travel_id ?? null
      : currentSeatItem.reservation_groups?.travel_id ?? null;

    const { error } = await supabase
      .from("reservation_items")
      .update({ status })
      .eq("id", seatId)
      .eq("reservation_group_id", reservationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (RELEASING_STATUSES.includes(status) && travelId && currentSeatItem.layout_seat_id) {
      const { error: lockDeleteError } = await supabase
        .from("seat_locks")
        .delete()
        .eq("travel_id", travelId)
        .eq("lock_type", "temporary_hold")
        .eq("layout_seat_id", currentSeatItem.layout_seat_id);

      if (lockDeleteError) {
        await supabase
          .from("reservation_items")
          .update({ status: currentStatus })
          .eq("id", seatId)
          .eq("reservation_group_id", reservationId);
        return NextResponse.json({ error: lockDeleteError.message }, { status: 400 });
      }
    }

    try {
      await sendReservationStatusEmail(supabase, reservationId, "seat_status");
    } catch (error) {
      console.error("Failed to send seat status email", error);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.error(error);
    return NextResponse.json({ error: "Failed to update seat status." }, { status: 500 });
  }
}
