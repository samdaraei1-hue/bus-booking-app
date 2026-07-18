import { NextResponse } from "next/server";
import type { ReservationStatus } from "@/lib/types";
import { authenticateDashboardRequest } from "@/lib/server/dashboardAccess";
import { sendReservationStatusEmail } from "@/lib/email/reservationNotifications";

type Body = {
  status?: ReservationStatus;
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
    const status = body.status;

    if (!reservationId || !status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid reservation status." }, { status: 400 });
    }

    const { data: reservationGroup, error: groupFetchError } = await supabase
      .from("reservation_groups")
      .select(
        `
          id,
          status,
          travel_id,
          reservation_items (
            id,
            layout_seat_id
          )
        `
      )
      .eq("id", reservationId)
      .single();

    if (groupFetchError || !reservationGroup) {
      return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
    }

    const currentStatus = reservationGroup.status as ReservationStatus;
    const seatIds = (reservationGroup.reservation_items ?? [])
      .map((item) => item.layout_seat_id as string | null)
      .filter((value): value is string => Boolean(value));

    const { error: groupError } = await supabase
      .from("reservation_groups")
      .update({ status })
      .eq("id", reservationId);

    if (groupError) {
      return NextResponse.json({ error: groupError.message }, { status: 400 });
    }

    const { error: itemsError } = await supabase
      .from("reservation_items")
      .update({ status })
      .eq("reservation_group_id", reservationId);

    if (itemsError) {
      await supabase
        .from("reservation_groups")
        .update({ status: currentStatus })
        .eq("id", reservationId);
      return NextResponse.json({ error: itemsError.message }, { status: 400 });
    }

    if (RELEASING_STATUSES.includes(status) && seatIds.length > 0) {
      const { error: lockDeleteError } = await supabase
        .from("seat_locks")
        .delete()
        .eq("travel_id", reservationGroup.travel_id)
        .eq("lock_type", "temporary_hold")
        .in("layout_seat_id", seatIds);

      if (lockDeleteError) {
        await supabase
          .from("reservation_groups")
          .update({ status: currentStatus })
          .eq("id", reservationId);
        await supabase
          .from("reservation_items")
          .update({ status: currentStatus })
          .eq("reservation_group_id", reservationId);
        return NextResponse.json({ error: lockDeleteError.message }, { status: 400 });
      }
    }

    const emailResult = await sendReservationStatusEmail(
      supabase,
      reservationId,
      "group_status"
    );

    return NextResponse.json(
      emailResult.ok
        ? { ok: true }
        : { ok: true, warning: emailResult.reason }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.error(error);
    return NextResponse.json({ error: "Failed to update reservation status." }, { status: 500 });
  }
}
