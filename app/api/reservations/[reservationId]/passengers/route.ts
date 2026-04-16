import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/supabaseRoute";
import { sendReservationStatusEmail } from "@/lib/email/reservationNotifications";

type PassengerItemInput = {
  id?: string;
  passenger_name?: string;
  passenger_email?: string;
  passenger_phone?: string;
};

type PassengerBody = {
  items?: PassengerItemInput[];
};

export async function POST(
  request: Request,
  context: { params: Promise<{ reservationId: string }> }
) {
  try {
    const { reservationId } = await context.params;
    const { supabase, user } = await authenticateRequest(request);
    const body = (await request.json()) as PassengerBody;
    const items = body.items ?? [];

    if (!reservationId || items.length === 0) {
      return NextResponse.json(
        { error: "Reservation items are required." },
        { status: 400 }
      );
    }

    const { data: reservationGroup, error: groupError } = await supabase
      .from("reservation_groups")
      .select("id, travel_id, status")
      .eq("id", reservationId)
      .eq("booker_user_id", user.id)
      .single();

    if (groupError || !reservationGroup) {
      return NextResponse.json(
        { error: "Reservation not found." },
        { status: 404 }
      );
    }

    if (!["held", "awaiting_payment"].includes(reservationGroup.status)) {
      return NextResponse.json(
        { error: "Reservation can no longer be updated." },
        { status: 409 }
      );
    }

    const { data: dbItems, error: itemsError } = await supabase
      .from("reservation_items")
      .select("id, layout_seat_id")
      .eq("reservation_group_id", reservationId);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 400 });
    }

    const dbIds = new Set((dbItems ?? []).map((item) => item.id as string));
    const payloadIds = new Set(items.map((item) => item.id?.trim()).filter(Boolean));

    if (dbIds.size === 0 || dbIds.size !== payloadIds.size) {
      return NextResponse.json(
        { error: "Reservation items are invalid." },
        { status: 400 }
      );
    }

    for (const id of payloadIds) {
      if (!dbIds.has(id as string)) {
        return NextResponse.json(
          { error: "Reservation items are invalid." },
          { status: 400 }
        );
      }
    }

    for (const item of items) {
      const passengerName = item.passenger_name?.trim() ?? "";
      const passengerPhone = item.passenger_phone?.trim() ?? "";
      const passengerEmail = item.passenger_email?.trim() ?? "";

      if (!item.id?.trim() || !passengerName || !passengerPhone) {
        return NextResponse.json(
          { error: "Participant name and phone are required for every selected item." },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from("reservation_items")
        .update({
          passenger_name: passengerName,
          passenger_email: passengerEmail || null,
          passenger_phone: passengerPhone,
          status: "awaiting_payment",
        })
        .eq("id", item.id.trim())
        .eq("reservation_group_id", reservationId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    const { error: updateGroupError } = await supabase
      .from("reservation_groups")
      .update({ status: "awaiting_payment" })
      .eq("id", reservationId)
      .eq("booker_user_id", user.id);

    if (updateGroupError) {
      return NextResponse.json(
        { error: updateGroupError.message },
        { status: 400 }
      );
    }

    await sendReservationStatusEmail(supabase, reservationId, "awaiting_payment");

    const seatIds = (dbItems ?? []).map((item) => item.layout_seat_id as string);

    await supabase
      .from("seat_locks")
      .delete()
      .eq("travel_id", reservationGroup.travel_id)
      .eq("lock_type", "temporary_hold")
      .in("layout_seat_id", seatIds);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to save participant details." },
      { status: 500 }
    );
  }
}
