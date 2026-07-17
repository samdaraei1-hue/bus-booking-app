import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/supabaseRoute";
import { sendReservationStatusEmail } from "@/lib/email/reservationNotifications";
import { parseTravelAddons } from "@/lib/travelAddons";

type PassengerItemInput = {
  id?: string;
  passenger_name?: string;
  passenger_email?: string;
  passenger_phone?: string;
};

type PassengerAddonInput = {
  addonId?: string;
  quantity?: number;
};

type PassengerBody = {
  items?: PassengerItemInput[];
  addons?: PassengerAddonInput[];
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

    const [
      { data: travel, error: travelError },
      { data: travelAddonRows, error: travelAddonError },
    ] = await Promise.all([
      supabase
        .from("travels")
        .select("id, price, addons")
        .eq("id", reservationGroup.travel_id)
        .single(),
      supabase
        .from("travel_addons")
        .select("id, name, description, price, pricing_mode, is_active, sort_order")
        .eq("travel_id", reservationGroup.travel_id)
        .order("sort_order", { ascending: true }),
    ]);

    if (travelError || !travel) {
      return NextResponse.json(
        { error: "Travel not found." },
        { status: 404 }
      );
    }

    if (travelAddonError) {
      return NextResponse.json({ error: travelAddonError.message }, { status: 400 });
    }

    const { data: dbItems, error: itemsError } = await supabase
      .from("reservation_items")
      .select("id, layout_seat_id")
      .eq("reservation_group_id", reservationId);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 400 });
    }

    const travelAddons = (
      (travelAddonRows ?? []).length > 0
        ? parseTravelAddons(travelAddonRows)
        : parseTravelAddons(travel.addons)
    ).filter((addon) => addon.is_active);
    const addonInputMap = new Map(
      (body.addons ?? [])
        .map((item) => ({
          addonId: item.addonId?.trim() ?? "",
          quantity: Number(item.quantity) || 0,
        }))
        .filter((item) => Boolean(item.addonId))
        .map((item) => [item.addonId, item.quantity] as const)
    );

    const addonSelections: Array<{
      addon_id: string;
      name: string;
      description: string | null;
      unit_price: number;
      pricing_mode: "per_booking" | "per_participant";
      quantity: number;
      total_price: number;
    }> = [];
    const knownAddonIds = new Set(travelAddons.map((addon) => addon.id));

    for (const addonId of addonInputMap.keys()) {
      if (!knownAddonIds.has(addonId)) {
        return NextResponse.json(
          { error: "One or more selected services are invalid." },
          { status: 400 }
        );
      }
    }

    for (const addon of travelAddons) {
      const requestedQuantity = addonInputMap.get(addon.id) ?? 0;

      if (requestedQuantity <= 0) continue;

      const nextQuantity =
        addon.pricing_mode === "per_participant"
          ? requestedQuantity
          : 1;

      if (
        nextQuantity < 1 ||
        nextQuantity > items.length ||
        (addon.pricing_mode === "per_booking" && requestedQuantity !== 1)
      ) {
        return NextResponse.json(
          { error: "Selected add-on quantity is invalid." },
          { status: 400 }
        );
      }

      addonSelections.push({
        addon_id: addon.id,
        name: addon.name,
        description: addon.description,
        unit_price: addon.price,
        pricing_mode: addon.pricing_mode,
        quantity: nextQuantity,
        total_price: addon.price * nextQuantity,
      });
    }

    const baseAmount = (Number(travel.price) || 0) * items.length;
    const addonsAmount = addonSelections.reduce(
      (total, item) => total + item.total_price,
      0
    );
    const totalAmount = baseAmount + addonsAmount;

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
      .update({
        status: "awaiting_payment",
        base_amount: baseAmount,
        addons_amount: addonsAmount,
        total_amount: totalAmount,
        addon_selections: addonSelections,
      })
      .eq("id", reservationId)
      .eq("booker_user_id", user.id);

    if (updateGroupError) {
      return NextResponse.json(
        { error: updateGroupError.message },
        { status: 400 }
      );
    }

    const { error: deleteAddonRowsError } = await supabase
      .from("reservation_addons")
      .delete()
      .eq("reservation_group_id", reservationId);

    if (deleteAddonRowsError) {
      return NextResponse.json(
        { error: deleteAddonRowsError.message },
        { status: 400 }
      );
    }

    if (addonSelections.length > 0) {
      const reservationAddonRows = addonSelections.map((item) => ({
        reservation_group_id: reservationId,
        travel_addon_id: travelAddons.find((addon) => addon.id === item.addon_id)?.id ?? null,
        addon_id: item.addon_id,
        name: item.name,
        description: item.description,
        unit_price: item.unit_price,
        pricing_mode: item.pricing_mode,
        quantity: item.quantity,
        total_price: item.total_price,
      }));

      const { error: insertAddonRowsError } = await supabase
        .from("reservation_addons")
        .insert(reservationAddonRows);

      if (insertAddonRowsError) {
        return NextResponse.json(
          { error: insertAddonRowsError.message },
          { status: 400 }
        );
      }
    }

    try {
      await sendReservationStatusEmail(supabase, reservationId, "awaiting_payment");
    } catch (error) {
      console.error("Failed to send awaiting_payment email", error);
    }

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
