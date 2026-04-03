import { NextResponse } from "next/server";
import type { ReservationStatus } from "@/lib/types";
import { authenticateDashboardRequest } from "@/lib/server/dashboardAccess";
import { sendReservationStatusEmail } from "@/lib/email/reservationNotifications";

type Body = {
  seatId?: string;
  status?: ReservationStatus;
};

const ALLOWED_STATUSES: ReservationStatus[] = [
  "held",
  "awaiting_payment",
  "paid",
  "cancelled",
  "expired",
];

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

    const { error } = await supabase
      .from("reservation_items")
      .update({ status })
      .eq("id", seatId)
      .eq("reservation_group_id", reservationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await sendReservationStatusEmail(supabase, reservationId, "seat_status");

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
