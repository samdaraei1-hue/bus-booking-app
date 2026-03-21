import type { ReservationStatus } from "@/lib/types";

export const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  "held",
  "awaiting_payment",
  "paid",
];

export function isReservationActive(
  status: string,
  expiresAt?: string | null
) {
  if (!ACTIVE_RESERVATION_STATUSES.includes(status as ReservationStatus)) {
    return false;
  }

  if (status !== "held") return true;
  if (!expiresAt) return true;

  return new Date(expiresAt).getTime() > Date.now();
}
