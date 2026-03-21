export type Travel = {
  id: string;
  name: string;
  type?: "travel" | "event" | null;
  origin: string;
  destination: string;
  departure_at: string;
  return_at: string;
  price: number | string;
  description: string | null;
  image_url?: string | null;
  layout_id?: string | null;
};

export type Translation = {
  namespace: string;
  key: string;
  lang: "fa" | "en" | "de";
  value: string;
};

export type UserRole = "admin" | "user";

export type LayoutSeat = {
  id: string;
  layout_id: string;
  seat_key: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: string;
  seat_type: string;
  is_selectable: boolean;
};

export type ReservationStatus =
  | "held"
  | "awaiting_payment"
  | "paid"
  | "cancelled"
  | "expired";

export type ReservationGroup = {
  id: string;
  travel_id: string;
  booker_user_id: string;
  status: ReservationStatus;
  payment_provider: string | null;
  payment_ref: string | null;
  expires_at: string | null;
  paid_at: string | null;
};

export type ReservationItem = {
  id: string;
  reservation_group_id: string;
  layout_seat_id: string;
  passenger_name: string | null;
  passenger_email: string | null;
  passenger_phone: string | null;
  status: ReservationStatus;
};
