import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/supabaseRoute";
import { isReservationActive } from "@/lib/reservations";

type HoldReservationBody = {
  travelId?: string;
  seatIds?: string[];
};

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

export async function POST(request: Request) {
  try {
    const { supabase, user } = await authenticateRequest(request);
    const body = (await request.json()) as HoldReservationBody;

    const travelId = body.travelId?.trim() ?? "";
    const seatIds = Array.from(
      new Set((body.seatIds ?? []).map((item) => item.trim()).filter(Boolean))
    );

    if (!travelId || seatIds.length === 0) {
      return NextResponse.json(
        { error: "Travel and at least one seat are required." },
        { status: 400 }
      );
    }

    if (seatIds.length > 12) {
      return NextResponse.json(
        { error: "Too many seats requested at once." },
        { status: 400 }
      );
    }

    const { data: travel, error: travelError } = await supabase
      .from("travels")
      .select("id, layout_id")
      .eq("id", travelId)
      .single();

    if (travelError || !travel?.layout_id) {
      return NextResponse.json(
        { error: "Travel layout not found." },
        { status: 404 }
      );
    }

    const { data: seats, error: seatsError } = await supabase
      .from("layout_seats")
      .select("id, is_selectable")
      .eq("layout_id", travel.layout_id)
      .in("id", seatIds);

    if (seatsError) {
      return NextResponse.json({ error: seatsError.message }, { status: 400 });
    }

    const selectableSeatIds = new Set(
      (seats ?? [])
        .filter((seat) => seat.is_selectable !== false)
        .map((seat) => seat.id as string)
    );

    if (selectableSeatIds.size !== seatIds.length) {
      return NextResponse.json(
        { error: "One or more seats are invalid or unavailable." },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();

    await supabase
      .from("seat_locks")
      .delete()
      .eq("travel_id", travelId)
      .eq("lock_type", "temporary_hold")
      .in("layout_seat_id", seatIds)
      .lt("expires_at", nowIso);

    const [
      { data: reservationRows, error: reservationsError },
      { data: lockRows, error: locksError },
    ] = await Promise.all([
      supabase
        .from("reservation_items")
        .select(
          "layout_seat_id, reservation_groups:reservation_group_id(status, expires_at)"
        )
        .in("layout_seat_id", seatIds)
        .eq("reservation_groups.travel_id", travelId),
      supabase
        .from("seat_locks")
        .select("layout_seat_id, expires_at")
        .eq("travel_id", travelId)
        .in("layout_seat_id", seatIds),
    ]);

    if (reservationsError) {
      return NextResponse.json(
        { error: reservationsError.message },
        { status: 400 }
      );
    }

    if (locksError) {
      return NextResponse.json({ error: locksError.message }, { status: 400 });
    }

    const blockedSeatIds = new Set<string>();

    ((reservationRows ?? []) as unknown as ReservationItemRow[]).forEach((row) => {
      const reservationGroup = row.reservation_groups;
      if (
        reservationGroup &&
        isReservationActive(
          reservationGroup.status,
          reservationGroup.expires_at
        )
      ) {
        blockedSeatIds.add(row.layout_seat_id);
      }
    });

    ((lockRows ?? []) as SeatLockRow[]).forEach((row) => {
      if (!row.expires_at || new Date(row.expires_at).getTime() > Date.now()) {
        blockedSeatIds.add(row.layout_seat_id);
      }
    });

    if (blockedSeatIds.size > 0) {
      return NextResponse.json(
        { error: "One or more selected seats are no longer available." },
        { status: 409 }
      );
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: lockInsertError } = await supabase.from("seat_locks").insert(
      seatIds.map((seatId) => ({
        travel_id: travelId,
        layout_seat_id: seatId,
        lock_type: "temporary_hold",
        locked_by: user.id,
        expires_at: expiresAt,
      }))
    );

    if (lockInsertError) {
      return NextResponse.json(
        { error: "One or more selected seats are no longer available." },
        { status: 409 }
      );
    }

    const { data: reservationGroup, error: groupError } = await supabase
      .from("reservation_groups")
      .insert({
        travel_id: travelId,
        booker_user_id: user.id,
        status: "held",
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (groupError || !reservationGroup) {
      await supabase
        .from("seat_locks")
        .delete()
        .eq("travel_id", travelId)
        .eq("lock_type", "temporary_hold")
        .in("layout_seat_id", seatIds);

      return NextResponse.json(
        { error: groupError?.message ?? "Failed to create reservation." },
        { status: 400 }
      );
    }

    const { error: itemsError } = await supabase.from("reservation_items").insert(
      seatIds.map((seatId) => ({
        reservation_group_id: reservationGroup.id,
        layout_seat_id: seatId,
        status: "held",
      }))
    );

    if (itemsError) {
      await supabase
        .from("reservation_items")
        .delete()
        .eq("reservation_group_id", reservationGroup.id);
      await supabase.from("reservation_groups").delete().eq("id", reservationGroup.id);
      await supabase
        .from("seat_locks")
        .delete()
        .eq("travel_id", travelId)
        .eq("lock_type", "temporary_hold")
        .in("layout_seat_id", seatIds);

      return NextResponse.json({ error: itemsError.message }, { status: 400 });
    }

    return NextResponse.json({
      reservationId: reservationGroup.id,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to create reservation hold." },
      { status: 500 }
    );
  }
}

