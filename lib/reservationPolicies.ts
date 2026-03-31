export const PAID_SEAT_CHANGE_HOURS_BEFORE_DEPARTURE = 24;

export function canChangeSeatForReservation(
  status: string,
  departureAt?: string | null
) {
  if (status === "held" || status === "awaiting_payment") {
    return true;
  }

  if (status !== "paid") {
    return false;
  }

  if (!departureAt) {
    return false;
  }

  const departureTime = new Date(departureAt).getTime();

  if (Number.isNaN(departureTime)) {
    return false;
  }

  const cutoff =
    departureTime - PAID_SEAT_CHANGE_HOURS_BEFORE_DEPARTURE * 60 * 60 * 1000;

  return Date.now() < cutoff;
}
