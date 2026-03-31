import type { ReservationStatus } from "@/lib/types";

const STATUS_LABELS: Record<ReservationStatus, string> = {
  held: "Held",
  awaiting_payment: "Awaiting Payment",
  paid: "Paid",
  cancelled: "Cancelled",
  expired: "Expired",
};

const STATUS_TONES: Record<ReservationStatus, string> = {
  held: "bg-sky-100 text-sky-700",
  awaiting_payment: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
  expired: "bg-zinc-200 text-zinc-700",
};

export function getReservationStatusLabel(
  status: string,
  t?: (key: string, fallback?: string) => string
) {
  const typedStatus = status as ReservationStatus;
  const fallback = STATUS_LABELS[typedStatus] ?? status;

  return t ? t(`reservation.status.${status}`, fallback) : fallback;
}

export function getReservationStatusTone(status: string) {
  return STATUS_TONES[status as ReservationStatus] ?? "bg-zinc-100 text-zinc-700";
}

export function summarizeReservationStatuses(statuses: string[]) {
  const uniqueStatuses = Array.from(new Set(statuses.filter(Boolean)));

  if (uniqueStatuses.length === 0) {
    return {
      kind: "none" as const,
      status: null,
    };
  }

  if (uniqueStatuses.length === 1) {
    return {
      kind: "single" as const,
      status: uniqueStatuses[0],
    };
  }

  return {
    kind: "mixed" as const,
    status: null,
  };
}
