import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/supabaseRoute";

export async function POST(
  request: Request,
  context: { params: Promise<{ reservationId: string }> }
) {
  try {
    const { reservationId } = await context.params;
    const { supabase, user } = await authenticateRequest(request);

    if (!reservationId) {
      return NextResponse.json(
        { error: "Reservation not found." },
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

    if (reservationGroup.status !== "awaiting_payment") {
      return NextResponse.json(
        { error: "Reservation is not ready for payment." },
        { status: 409 }
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from("reservation_items")
      .select("id, layout_seat_id, passenger_name, passenger_phone")
      .eq("reservation_group_id", reservationId);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 400 });
    }

    if (
      !items?.length ||
      items.some(
        (item) => !item.passenger_name?.trim() || !item.passenger_phone?.trim()
      )
    ) {
      return NextResponse.json(
        { error: "Passenger details are incomplete." },
        { status: 409 }
      );
    }

    const { error: updateItemsError } = await supabase
      .from("reservation_items")
      .update({ status: "paid" })
      .eq("reservation_group_id", reservationId);

    if (updateItemsError) {
      return NextResponse.json(
        { error: updateItemsError.message },
        { status: 400 }
      );
    }

    const { error: updateGroupError } = await supabase
      .from("reservation_groups")
      .update({
        status: "paid",
        payment_provider: "paypal_sandbox",
        payment_ref: crypto.randomUUID(),
        paid_at: new Date().toISOString(),
      })
      .eq("id", reservationId)
      .eq("booker_user_id", user.id);

    if (updateGroupError) {
      return NextResponse.json(
        { error: updateGroupError.message },
        { status: 400 }
      );
    }

    await supabase
      .from("seat_locks")
      .delete()
      .eq("travel_id", reservationGroup.travel_id)
      .eq("lock_type", "temporary_hold")
      .in(
        "layout_seat_id",
        items.map((item) => item.layout_seat_id as string)
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to complete payment." },
      { status: 500 }
    );
  }
}
