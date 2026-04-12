import type { Travel } from "@/lib/types";

export type OfferingKind =
  | "trip"
  | "event"
  | "hiking"
  | "walking"
  | "camping"
  | "mixed_trip"
  | "custom";

export type BookingMode = "seat_map" | "capacity_only";

export function getOfferingKind(value: string | null | undefined): OfferingKind {
  switch (value) {
    case "trip":
    case "event":
    case "hiking":
    case "walking":
    case "camping":
    case "mixed_trip":
      return value;
    default:
      return "custom";
  }
}

export function getBookingMode(value: string | null | undefined): BookingMode {
  return value === "capacity_only" ? "capacity_only" : "seat_map";
}

export function isSeatMapBooking(travel: Pick<Travel, "booking_mode"> | null | undefined) {
  return getBookingMode(travel?.booking_mode) === "seat_map";
}

export function isLocationOnlyOffering(travel: Pick<Travel, "booking_mode" | "kind" | "type"> | null | undefined) {
  const kind = getOfferingKind(travel?.kind ?? travel?.type);
  return (
    getBookingMode(travel?.booking_mode) === "capacity_only" ||
    kind === "event" ||
    kind === "hiking" ||
    kind === "walking" ||
    kind === "camping"
  );
}
