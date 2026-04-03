import type { ReservationStatus } from "@/lib/types";

export type ReservationEmailLang = "fa" | "en" | "de";

type ReservationEmailInput = {
  lang: ReservationEmailLang;
  name: string;
  reservationId: string;
  travelName: string;
  routeLabel: string;
  departureAt: string | null;
  seats: string[];
  status: ReservationStatus;
  trigger: "group_status" | "seat_status" | "awaiting_payment" | "paid";
};

function formatDate(value: string | null, lang: ReservationEmailLang) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString(
    lang === "fa" ? "fa-IR" : lang === "de" ? "de-DE" : "en-US"
  );
}

function getStatusLabel(status: ReservationStatus, lang: ReservationEmailLang) {
  const labels = {
    fa: {
      held: "نگه‌داشته شده",
      awaiting_payment: "در انتظار پرداخت",
      paid: "پرداخت شده",
      cancelled: "لغو شده",
      expired: "منقضی شده",
    },
    en: {
      held: "Held",
      awaiting_payment: "Awaiting payment",
      paid: "Paid",
      cancelled: "Cancelled",
      expired: "Expired",
    },
    de: {
      held: "Reserviert",
      awaiting_payment: "Warten auf Zahlung",
      paid: "Bezahlt",
      cancelled: "Storniert",
      expired: "Abgelaufen",
    },
  } as const;

  return labels[lang][status];
}

function getCopy(input: ReservationEmailInput) {
  const statusLabel = getStatusLabel(input.status, input.lang);

  const copies = {
    fa: {
      subject:
        input.trigger === "paid"
          ? `تایید پرداخت رزرو ${input.travelName}`
          : `به‌روزرسانی وضعیت رزرو ${input.travelName}`,
      eyebrow: "به‌روزرسانی رزرو",
      title:
        input.trigger === "paid"
          ? "پرداخت شما با موفقیت ثبت شد"
          : "وضعیت رزرو شما تغییر کرد",
      intro:
        input.trigger === "awaiting_payment"
          ? "مشخصات مسافران ثبت شده و رزرو شما آماده پرداخت است."
          : input.trigger === "seat_status"
          ? "وضعیت یکی یا چند صندلی در رزرو شما به‌روزرسانی شده است."
          : input.trigger === "paid"
          ? "رزرو شما نهایی شده و صندلی‌ها با موفقیت ثبت شدند."
          : "وضعیت رزرو شما در سیستم به‌روزرسانی شد.",
      statusLabel: "وضعیت فعلی",
      reservationLabel: "کد رزرو",
      travelLabel: "عنوان",
      routeLabel: "مسیر / محل",
      departureLabel: "زمان شروع",
      seatsLabel: "صندلی‌ها",
      footer: "اگر این تغییر را انتظار نداشتید، لطفاً با پشتیبانی تماس بگیرید.",
    },
    en: {
      subject:
        input.trigger === "paid"
          ? `Payment confirmed for ${input.travelName}`
          : `Reservation update for ${input.travelName}`,
      eyebrow: "Reservation Update",
      title:
        input.trigger === "paid"
          ? "Your payment has been confirmed"
          : "Your reservation status has changed",
      intro:
        input.trigger === "awaiting_payment"
          ? "Passenger details were saved and your reservation is now ready for payment."
          : input.trigger === "seat_status"
          ? "One or more seat statuses in your reservation were updated."
          : input.trigger === "paid"
          ? "Your reservation is now confirmed and your seats are secured."
          : "Your reservation status was updated in the system.",
      statusLabel: "Current status",
      reservationLabel: "Reservation ID",
      travelLabel: "Title",
      routeLabel: "Route / Venue",
      departureLabel: "Start time",
      seatsLabel: "Seats",
      footer: "If you did not expect this change, please contact support.",
    },
    de: {
      subject:
        input.trigger === "paid"
          ? `Zahlung bestaetigt fuer ${input.travelName}`
          : `Reservierungs-Update fuer ${input.travelName}`,
      eyebrow: "Reservierungs-Update",
      title:
        input.trigger === "paid"
          ? "Deine Zahlung wurde bestaetigt"
          : "Der Status deiner Reservierung hat sich geaendert",
      intro:
        input.trigger === "awaiting_payment"
          ? "Die Passagierdaten wurden gespeichert und deine Reservierung ist jetzt zahlungsbereit."
          : input.trigger === "seat_status"
          ? "Der Status eines oder mehrerer Sitze in deiner Reservierung wurde aktualisiert."
          : input.trigger === "paid"
          ? "Deine Reservierung ist jetzt bestaetigt und deine Sitze sind gesichert."
          : "Der Status deiner Reservierung wurde im System aktualisiert.",
      statusLabel: "Aktueller Status",
      reservationLabel: "Reservierungs-ID",
      travelLabel: "Titel",
      routeLabel: "Route / Ort",
      departureLabel: "Beginn",
      seatsLabel: "Sitze",
      footer: "Wenn du diese Aenderung nicht erwartet hast, kontaktiere bitte den Support.",
    },
  } as const;

  return { ...copies[input.lang], statusLabel };
}

export function buildReservationEmail(input: ReservationEmailInput) {
  const copy = getCopy(input);
  const seats = input.seats.length ? input.seats.join(", ") : "-";
  const departure = formatDate(input.departureAt, input.lang);

  const html = `
    <div style="margin:0;padding:32px 16px;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e4e4e7;box-shadow:0 20px 50px rgba(0,0,0,0.06);">
        <div style="padding:28px 28px 18px;background:linear-gradient(135deg,#18181b,#3f3f46);color:#ffffff;">
          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.72;">${copy.eyebrow}</div>
          <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.2;">${copy.title}</h1>
          <p style="margin:0;font-size:15px;line-height:1.8;opacity:0.9;">${copy.intro}</p>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 18px;font-size:15px;line-height:1.8;">${input.name || "Traveler"},</p>
          <div style="display:grid;gap:12px;">
            ${[
              [copy.statusLabel, copy.statusLabel ? copy.statusLabel && copy.statusLabel : "", copy.statusLabel],
            ]
              .map(() => "")
              .join("")}
          </div>
          <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:10px;">
            ${[
              [copy.statusLabel, copy.statusLabel ? getStatusLabel(input.status, input.lang) : ""],
              [copy.reservationLabel, input.reservationId],
              [copy.travelLabel, input.travelName],
              [copy.routeLabel, input.routeLabel || "-"],
              [copy.departureLabel, departure],
              [copy.seatsLabel, seats],
            ]
              .map(
                ([label, value]) => `
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;width:180px;font-size:13px;color:#71717a;vertical-align:top;">${label}</td>
                    <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:14px;font-weight:600;color:#18181b;">${value}</td>
                  </tr>
                `
              )
              .join("")}
          </table>
          <div style="margin-top:22px;padding:16px 18px;border-radius:18px;background:#fafaf9;color:#52525b;font-size:13px;line-height:1.8;">
            ${copy.footer}
          </div>
        </div>
      </div>
    </div>
  `;

  const text = [
    copy.title,
    copy.intro,
    `${copy.statusLabel}: ${getStatusLabel(input.status, input.lang)}`,
    `${copy.reservationLabel}: ${input.reservationId}`,
    `${copy.travelLabel}: ${input.travelName}`,
    `${copy.routeLabel}: ${input.routeLabel || "-"}`,
    `${copy.departureLabel}: ${departure}`,
    `${copy.seatsLabel}: ${seats}`,
    copy.footer,
  ].join("\n");

  return {
    subject: copy.subject,
    html,
    text,
  };
}
