import type { ReservationStatus } from "@/lib/types";
import {
  buildReservationEmail,
  type ReservationEmailLang,
} from "@/lib/email/reservationEmailTemplate";
import { sendEmail } from "@/lib/email/sendEmail";

type ReservationNotificationTrigger =
  | "group_status"
  | "seat_status"
  | "awaiting_payment"
  | "paid";

function normalizeLang(value: string | null | undefined): ReservationEmailLang {
  if (value === "fa" || value === "de") return value;
  return "en";
}

type TranslationRow = {
  namespace: string;
  key: string;
  value: string;
};

async function loadEmailTranslations(
  supabase: any,
  lang: ReservationEmailLang
) {
  const { data, error } = await supabase
    .from("translations")
    .select("namespace, key, value")
    .eq("lang", lang)
    .eq("namespace", "email");

  if (error) {
    return {};
  }

  if (!data) {
    return {};
  }

  const rows = Array.isArray(data) ? data : [data];
  const dict: Record<string, string> = {};

  (rows as TranslationRow[]).forEach((row) => {
    dict[`${row.namespace}.${row.key}`] = row.value;
  });

  return dict;
}

export async function sendReservationStatusEmail(
  supabaseClient: unknown,
  reservationId: string,
  trigger: ReservationNotificationTrigger
) {
  const supabase = supabaseClient as {
    from: (table: string) => {
      select: (query: string) => {
        eq: (column: string, value: string) => {
          single: () => Promise<{
            data: unknown;
            error: { message?: string } | null;
          }>;
        };
      };
    };
  };

  const { data, error } = await supabase
    .from("reservation_groups")
    .select(
      `
        id,
        status,
        notification_lang,
        booker:booker_user_id (
          name,
          email
        ),
        travels:travel_id (
          name,
          origin,
          destination,
          departure_at,
          payment_instructions
        ),
        reservation_items (
          status,
          layout_seats:layout_seat_id (
            label,
            seat_key
          )
        )
      `
    )
    .eq("id", reservationId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to load reservation for email.");
  }

  const row = data as {
    id: string;
    status: ReservationStatus;
    notification_lang?: string | null;
    booker: { name?: string | null; email?: string | null } | null;
    travels:
      | {
          name?: string | null;
          origin?: string | null;
          destination?: string | null;
          departure_at?: string | null;
          payment_instructions?: string | null;
        }
      | null;
    reservation_items?: Array<{
      status?: ReservationStatus | null;
      layout_seats?:
        | { label?: string | null; seat_key?: string | null }
        | Array<{ label?: string | null; seat_key?: string | null }>
        | null;
    }>;
  };

  const recipient = row.booker?.email?.trim();
  if (!recipient) {
    return { ok: false as const, skipped: true as const, reason: "missing_email" };
  }

  const lang = normalizeLang(row.notification_lang);
  const emailTranslations = await loadEmailTranslations(supabase, lang);
  const seats = (row.reservation_items ?? []).map((item) => {
    const relation = item.layout_seats;
    const seat = Array.isArray(relation) ? relation[0] : relation;
    return seat?.label || seat?.seat_key || "-";
  });

  const routeLabel = [row.travels?.origin, row.travels?.destination]
    .filter(Boolean)
    .join(" - ");

  const email = buildReservationEmail({
    lang,
    name: row.booker?.name?.trim() || "Traveler",
    reservationId: row.id,
    travelName: row.travels?.name?.trim() || "Reservation",
    routeLabel,
    departureAt: row.travels?.departure_at ?? null,
    paymentInstructions: row.travels?.payment_instructions ?? null,
    seats,
    status: row.status,
    trigger,
    translations: emailTranslations,
  });

  return sendEmail({
    to: recipient,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}
