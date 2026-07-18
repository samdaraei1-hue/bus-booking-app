import type { ReservationStatus } from "@/lib/types";

export type ReservationEmailLang = "fa" | "en" | "de";

type TranslationDict = Record<string, string>;

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
  paymentInstructions?: string | null;
  translations?: TranslationDict;
};

type ReservationEmailCopy = {
  subject: string;
  eyebrow: string;
  title: string;
  intro: string;
  statusSummary: string;
  statusLabel: string;
  reservationLabel: string;
  travelLabel: string;
  routeLabel: string;
  departureLabel: string;
  seatsLabel: string;
  paymentInstructionsLabel: string;
  footer: string;
  accent: {
    bg: string;
    fg: string;
    border: string;
  };
};

function formatDate(value: string | null, lang: ReservationEmailLang) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString(
    lang === "fa" ? "fa-IR" : lang === "de" ? "de-DE" : "en-US"
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatPaymentInstructionsHtml(value: string) {
  return escapeHtml(value)
    .replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noreferrer" style="color:#be123c;text-decoration:underline;">$1</a>'
    )
    .replaceAll("\n", "<br />");
}

function translate(
  translations: TranslationDict | undefined,
  key: string,
  fallback: string
) {
  return translations?.[key]?.trim() || fallback;
}

function replaceTemplate(value: string, vars: Record<string, string>) {
  return value.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
}

function getStatusAccent(status: ReservationStatus) {
  switch (status) {
    case "paid":
      return { bg: "#dcfce7", fg: "#166534", border: "#86efac" };
    case "awaiting_payment":
      return { bg: "#fef3c7", fg: "#92400e", border: "#fcd34d" };
    case "cancelled":
      return { bg: "#fee2e2", fg: "#991b1b", border: "#fca5a5" };
    case "expired":
      return { bg: "#f4f4f5", fg: "#3f3f46", border: "#d4d4d8" };
    case "held":
    default:
      return { bg: "#e0f2fe", fg: "#075985", border: "#7dd3fc" };
  }
}

function getStatusLabel(
  status: ReservationStatus,
  lang: ReservationEmailLang,
  translations?: TranslationDict
) {
  const fallback = {
    fa: {
      held: "نگه داشته شده",
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

  return translate(translations, `email.status.${status}`, fallback[lang][status]);
}

function getCopy(input: ReservationEmailInput): ReservationEmailCopy {
  const translations = input.translations;
  const accent = getStatusAccent(input.status);
  const statusLabel = getStatusLabel(input.status, input.lang, translations);

  const fallback = {
    fa: {
      eyebrow: "به‌روزرسانی رزرو",
      statusSummary: "وضعیت رزرو",
      reservationLabel: "کد رزرو",
      travelLabel: "عنوان",
      routeLabel: "مسیر / محل",
      departureLabel: "زمان شروع",
      seatsLabel: "صندلی‌ها",
      paymentInstructionsLabel: "راهنمای پرداخت",
      footer: "اگر این تغییر را انتظار نداشتید، لطفاً با پشتیبانی تماس بگیرید.",
      subject: {
        group_status: "به‌روزرسانی رزرو {travelName}",
        seat_status: "به‌روزرسانی صندلی‌های {travelName}",
        awaiting_payment: "رزرو آماده پرداخت است: {travelName}",
        paid: "پرداخت رزرو {travelName} تایید شد",
      },
      title: {
        group_status: "وضعیت رزرو شما تغییر کرده است",
        seat_status: "انتخاب صندلی‌های شما به‌روزرسانی شد",
        awaiting_payment: "رزرو شما آماده پرداخت است",
        paid: "پرداخت شما تایید شد",
      },
      intro: {
        group_status: "وضعیت رزرو شما در سیستم به‌روزرسانی شد.",
        seat_status: "وضعیت یک یا چند صندلی در رزرو شما به‌روزرسانی شد.",
        awaiting_payment:
          "مشخصات مسافران ثبت شد و رزرو شما اکنون آماده پرداخت است.",
        paid: "رزرو شما اکنون تایید شده و صندلی‌هایتان قطعی شده‌اند.",
      },
    },
    en: {
      eyebrow: "Reservation update",
      statusSummary: "Reservation status",
      reservationLabel: "Reservation ID",
      travelLabel: "Travel",
      routeLabel: "Route / Venue",
      departureLabel: "Start time",
      seatsLabel: "Seats",
      paymentInstructionsLabel: "Payment instructions",
      footer: "If you did not expect this change, please contact support.",
      subject: {
        group_status: "Reservation update for {travelName}",
        seat_status: "Seat update for {travelName}",
        awaiting_payment: "Reservation ready for payment: {travelName}",
        paid: "Payment confirmed for {travelName}",
      },
      title: {
        group_status: "Your reservation status has changed",
        seat_status: "Your seat selection was updated",
        awaiting_payment: "Your reservation is ready for payment",
        paid: "Your payment has been confirmed",
      },
      intro: {
        group_status: "Your reservation status was updated in the system.",
        seat_status:
          "One or more seat statuses in your reservation were updated.",
        awaiting_payment:
          "Participant details were saved and your reservation is now ready for payment.",
        paid: "Your reservation is now confirmed and your seats are secured.",
      },
    },
    de: {
      eyebrow: "Reservierungs-Update",
      statusSummary: "Reservierungsstatus",
      reservationLabel: "Reservierungs-ID",
      travelLabel: "Titel",
      routeLabel: "Route / Ort",
      departureLabel: "Beginn",
      seatsLabel: "Sitze",
      paymentInstructionsLabel: "Zahlungshinweise",
      footer: "Wenn du diese Änderung nicht erwartet hast, kontaktiere bitte den Support.",
      subject: {
        group_status: "Reservierungs-Update für {travelName}",
        seat_status: "Sitz-Update für {travelName}",
        awaiting_payment: "Reservierung zur Zahlung bereit: {travelName}",
        paid: "Zahlung bestätigt für {travelName}",
      },
      title: {
        group_status: "Der Status deiner Reservierung hat sich geändert",
        seat_status: "Deine Sitzplatzwahl wurde aktualisiert",
        awaiting_payment: "Deine Reservierung ist zahlungsbereit",
        paid: "Deine Zahlung wurde bestätigt",
      },
      intro: {
        group_status:
          "Der Status deiner Reservierung wurde im System aktualisiert.",
        seat_status:
          "Der Status eines oder mehrerer Sitze in deiner Reservierung wurde aktualisiert.",
        awaiting_payment:
          "Die Teilnehmerdaten wurden gespeichert und deine Reservierung ist jetzt zahlungsbereit.",
        paid: "Deine Reservierung ist jetzt bestätigt und deine Sitze sind gesichert.",
      },
    },
  } as const;

  const subject = replaceTemplate(
    translate(
      translations,
      `email.subject.${input.trigger}`,
      fallback[input.lang].subject[input.trigger]
    ),
    { travelName: input.travelName }
  );

  return {
    subject,
    eyebrow: translate(translations, "email.eyebrow", fallback[input.lang].eyebrow),
    title: translate(
      translations,
      `email.title.${input.trigger}`,
      fallback[input.lang].title[input.trigger]
    ),
    intro: translate(
      translations,
      `email.intro.${input.trigger}`,
      fallback[input.lang].intro[input.trigger]
    ),
    statusSummary: translate(
      translations,
      "email.status_summary",
      fallback[input.lang].statusSummary
    ),
    statusLabel,
    reservationLabel: translate(
      translations,
      "email.reservation_label",
      fallback[input.lang].reservationLabel
    ),
    travelLabel: translate(
      translations,
      "email.travel_label",
      fallback[input.lang].travelLabel
    ),
    routeLabel: translate(
      translations,
      "email.route_label",
      fallback[input.lang].routeLabel
    ),
    departureLabel: translate(
      translations,
      "email.departure_label",
      fallback[input.lang].departureLabel
    ),
    seatsLabel: translate(
      translations,
      "email.seats_label",
      fallback[input.lang].seatsLabel
    ),
    paymentInstructionsLabel: translate(
      translations,
      "email.payment_instructions_label",
      fallback[input.lang].paymentInstructionsLabel
    ),
    footer: translate(translations, "email.footer", fallback[input.lang].footer),
    accent,
  };
}

export function buildReservationEmail(input: ReservationEmailInput) {
  const copy = getCopy(input);
  const seats = input.seats.length ? input.seats.join(", ") : "-";
  const departure = formatDate(input.departureAt, input.lang);
  const paymentInstructions = input.paymentInstructions?.trim() ?? "";
  const accentStyle = `background:${copy.accent.bg};color:${copy.accent.fg};border:1px solid ${copy.accent.border};`;

  const rows: Array<{ label: string; value: string; isHtml?: boolean }> = [
    { label: copy.statusSummary, value: copy.statusLabel },
    { label: copy.reservationLabel, value: input.reservationId },
    { label: copy.travelLabel, value: input.travelName },
    { label: copy.routeLabel, value: input.routeLabel || "-" },
    { label: copy.departureLabel, value: departure },
    { label: copy.seatsLabel, value: seats },
  ];

  if (input.trigger === "awaiting_payment" && paymentInstructions) {
    rows.push({
      label: copy.paymentInstructionsLabel,
      value: formatPaymentInstructionsHtml(paymentInstructions),
      isHtml: true,
    });
  }

  const html = `
    <div style="margin:0;padding:32px 16px;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e4e4e7;box-shadow:0 20px 50px rgba(0,0,0,0.06);">
        <div style="padding:28px 28px 18px;background:linear-gradient(135deg,#18181b,#3f3f46);color:#ffffff;">
          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.72;">${escapeHtml(copy.eyebrow)}</div>
          <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.2;">${escapeHtml(copy.title)}</h1>
          <p style="margin:0;font-size:15px;line-height:1.8;opacity:0.9;">${escapeHtml(copy.intro)}</p>
          <div style="margin-top:18px;display:inline-flex;padding:8px 14px;border-radius:999px;font-size:12px;font-weight:700;${accentStyle}">
            ${escapeHtml(copy.statusSummary)}: ${escapeHtml(copy.statusLabel)}
          </div>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 18px;font-size:15px;line-height:1.8;">${escapeHtml(input.name || "Traveler")},</p>
          <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:10px;">
            ${rows
              .map(
                ({ label, value, isHtml }) => `
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;width:180px;font-size:13px;color:#71717a;vertical-align:top;">${escapeHtml(label)}</td>
                    <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:14px;font-weight:600;color:#18181b;white-space:pre-wrap;">${isHtml ? value : escapeHtml(value)}</td>
                  </tr>
                `
              )
              .join("")}
          </table>
          <div style="margin-top:22px;padding:16px 18px;border-radius:18px;background:#fafaf9;color:#52525b;font-size:13px;line-height:1.8;">
            ${escapeHtml(copy.footer)}
          </div>
        </div>
      </div>
    </div>
  `;

  const text = [
    copy.title,
    copy.intro,
    `${copy.statusSummary}: ${copy.statusLabel}`,
    `${copy.reservationLabel}: ${input.reservationId}`,
    `${copy.travelLabel}: ${input.travelName}`,
    `${copy.routeLabel}: ${input.routeLabel || "-"}`,
    `${copy.departureLabel}: ${departure}`,
    `${copy.seatsLabel}: ${seats}`,
    ...(input.trigger === "awaiting_payment" && paymentInstructions
      ? [`${copy.paymentInstructionsLabel}: ${paymentInstructions}`]
      : []),
    copy.footer,
  ].join("\n");

  return {
    subject: copy.subject,
    html,
    text,
  };
}
