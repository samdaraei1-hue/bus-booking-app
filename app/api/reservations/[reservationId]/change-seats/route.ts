import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/supabaseRoute";
import { isReservationActive } from "@/lib/reservations";
import { canChangeSeatForReservation } from "@/lib/reservationPolicies";

type ChangeSeatsBody = {
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

export async function POST(
  request: Request,
  context: { params: Promise<{ reservationId: string }> }
) {
  try {
    const { reservationId } = await context.params;
    const { supabase, user } = await authenticateRequest(request);
    const body = (await request.json()) as ChangeSeatsBody;
    const seatIds = Array.from(
      new Set((body.seatIds ?? []).map((item) => item.trim()).filter(Boolean))
    );

    if (!reservationId || seatIds.length === 0) {
      return NextResponse.json(
        { error: "New seat selection is required." },
        { status: 400 }
      );
    }

    const { data: reservationGroup, error: groupError } = await supabase
      .from("reservation_groups")
      .select(
        `
          id,
          status,
          travel_id,
          booker_user_id,
          travels:travel_id (
            departure_at,
            layout_id
          )
        `
      )
      .eq("id", reservationId)
      .eq("booker_user_id", user.id)
      .single();

    if (groupError || !reservationGroup) {
      return NextResponse.json(
        { error: "Reservation not found." },
        { status: 404 }
      );
    }

    const departureAt =
      (reservationGroup.travels as { departure_at?: string | null } | null)
        ?.departure_at ?? null;
    const layoutId =
      (reservationGroup.travels as { layout_id?: string | null } | null)
        ?.layout_id ?? null;

    if (!canChangeSeatForReservation(reservationGroup.status, departureAt)) {
      return NextResponse.json(
        { error: "Seat change is not allowed for this reservation." },
        { status: 409 }
      );
    }

    if (!layoutId) {
      return NextResponse.json(
        { error: "Travel layout not found." },
        { status: 404 }
      );
    }

    const { data: currentItems, error: currentItemsError } = await supabase
      .from("reservation_items")
      .select("id, layout_seat_id, status")
      .eq("reservation_group_id", reservationId)
      .order("created_at", { ascending: true });

    if (currentItemsError || !currentItems?.length) {
      return NextResponse.json(
        { error: "Reservation seats not found." },
        { status: 404 }
      );
    }

    if (seatIds.length !== currentItems.length) {
      return NextResponse.json(
        { error: "You must select the same number of seats." },
        { status: 400 }
      );
    }

    const currentSeatIds = currentItems.map((item) => item.layout_seat_id as string);

    const { data: seats, error: seatsError } = await supabase
      .from("layout_seats")
      .select("id, is_selectable")
      .eq("layout_id", layoutId)
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
        { error: "One or more selected seats are invalid or unavailable." },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();

    await supabase
      .from("seat_locks")
      .delete()
      .eq("travel_id", reservationGroup.travel_id)
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
        .eq("reservation_groups.travel_id", reservationGroup.travel_id),
      supabase
        .from("seat_locks")
        .select("layout_seat_id, expires_at")
        .eq("travel_id", reservationGroup.travel_id)
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
      const group = row.reservation_groups;
      if (
        group &&
        isReservationActive(group.status, group.expires_at) &&
        !currentSeatIds.includes(row.layout_seat_id)
      ) {
        blockedSeatIds.add(row.layout_seat_id);
      }
    });

    ((lockRows ?? []) as SeatLockRow[]).forEach((row) => {
      if (
        (!row.expires_at || new Date(row.expires_at).getTime() > Date.now()) &&
        !currentSeatIds.includes(row.layout_seat_id)
      ) {
        blockedSeatIds.add(row.layout_seat_id);
      }
    });

    if (blockedSeatIds.size > 0) {
      return NextResponse.json(
        { error: "One or more selected seats are no longer available." },
        { status: 409 }
      );
    }

    const temporaryLockExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const changedSeatIds = seatIds.filter((seatId) => !currentSeatIds.includes(seatId));

    if (changedSeatIds.length > 0) {
      const { error: lockInsertError } = await supabase.from("seat_locks").insert(
        changedSeatIds.map((seatId) => ({
          travel_id: reservationGroup.travel_id,
          layout_seat_id: seatId,
          lock_type: "temporary_hold",
          locked_by: user.id,
          expires_at: temporaryLockExpiry,
        }))
      );

      if (lockInsertError) {
        return NextResponse.json(
          { error: "One or more selected seats are no longer available." },
          { status: 409 }
        );
      }
    }

    const sortedCurrentItems = [...currentItems];
    const sortedSeatIds = [...seatIds];

    for (let index = 0; index < sortedCurrentItems.length; index += 1) {
      const currentItem = sortedCurrentItems[index];
      const nextSeatId = sortedSeatIds[index];

      const { error } = await supabase
        .from("reservation_items")
        .update({
          layout_seat_id: nextSeatId,
        })
        .eq("id", currentItem.id)
        .eq("reservation_group_id", reservationId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    await supabase
      .from("seat_locks")
      .delete()
      .eq("travel_id", reservationGroup.travel_id)
      .eq("lock_type", "temporary_hold")
      .in("layout_seat_id", currentSeatIds);

    if (changedSeatIds.length > 0) {
      await supabase
        .from("seat_locks")
        .delete()
        .eq("travel_id", reservationGroup.travel_id)
        .eq("lock_type", "temporary_hold")
        .in("layout_seat_id", changedSeatIds);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to change seats." },
      { status: 500 }
    );
  }
}
