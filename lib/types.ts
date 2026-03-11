export type Travel = {
  id: string;
  name: string;
  origin: string;
  destination: string;
  departure_at: string;
  return_at: string;
  price: number | string;
  description: string | null;
};

export type Translation = {
  namespace: string;
  key: string;
  lang: "fa" | "en" | "de";
  value: string;
};

export type UserRole = "admin" | "user";

export type BusSeatReservation = {
  id: string;
  travel_id: string;
  leader_id: string | null;
  seat_no: number;
  passenger_name: string | null;
  passenger_email: string | null;
  passenger_phone: string | null;
  booker_user_id: string;
  status: string;
};

export type TravelBusSeat = {
  id: string;
  travel_id: string;
  leader_id: string | null;
  seat_no: number;
};