type SeatRelation =
  | { label?: string | null; seat_key?: string | null }
  | Array<{ label?: string | null; seat_key?: string | null }>
  | null
  | undefined;

export function getSeatLabelValue(seatRelation: SeatRelation) {
  if (Array.isArray(seatRelation)) {
    return seatRelation[0]?.label || seatRelation[0]?.seat_key || "";
  }

  return seatRelation?.label || seatRelation?.seat_key || "";
}
