export type SupportedLang = "en" | "fa" | "de";

export type LegalCopy = {
  title: string;
  intro: string;
  paragraphs: string[];
  footerLinkLabel: string;
};

const privacyCopy: Record<SupportedLang, LegalCopy> = {
  en: {
    title: "Privacy Notice",
    intro:
      "This page explains how we handle personal data when you book, log in, or contact support.",
    paragraphs: [
      "We process the personal data you provide during booking, login and support communication to manage reservations, contact you about your booking, and keep the service secure.",
      "The main booking data we store includes name, email address, phone number, reservation details, travel selection and payment status.",
      "We do not use optional tracking cookies by default. Essential cookies and local storage may still be used for login sessions, language selection and keeping an in-progress reservation from being lost.",
      "If you want a complete legally reviewed notice for Germany/EU use, this page should still be finalized with your real company details, data retention periods, processor list, contact email and legal basis wording.",
    ],
    footerLinkLabel: "Cookie notice",
  },
  fa: {
    title: "اطلاعیه حریم خصوصی",
    intro:
      "این صفحه توضیح می‌دهد که ما هنگام رزرو، ورود و ارتباط با پشتیبانی، داده‌های شخصی را چگونه پردازش می‌کنیم.",
    paragraphs: [
      "ما اطلاعاتی را که هنگام رزرو، ورود و ارتباط با پشتیبانی وارد می‌کنید برای مدیریت رزروها، اطلاع‌رسانی درباره رزرو و حفظ امنیت سرویس پردازش می‌کنیم.",
      "اطلاعات اصلی ذخیره‌شده شامل نام، ایمیل، شماره تلفن، جزئیات رزرو، انتخاب سفر و وضعیت پرداخت است.",
      "به‌صورت پیش‌فرض از کوکی‌های ردیابی اختیاری استفاده نمی‌کنیم. با این حال ممکن است برای ورود، انتخاب زبان و جلوگیری از از دست رفتن رزرو در حال انجام، از کوکی‌های ضروری و local storage استفاده شود.",
      "اگر یک متن کامل و بررسی‌شده‌ی حقوقی برای استفاده در آلمان/اتحادیه اروپا می‌خواهید، این صفحه هنوز باید با اطلاعات واقعی شرکت، مدت نگهداری داده‌ها، فهرست پردازش‌گرها، ایمیل تماس و متن مبنای قانونی تکمیل شود.",
    ],
    footerLinkLabel: "اطلاعیه کوکی‌ها",
  },
  de: {
    title: "Datenschutzhinweis",
    intro:
      "Diese Seite erklärt, wie wir personenbezogene Daten bei Buchung, Anmeldung und Support-Kontakt verarbeiten.",
    paragraphs: [
      "Wir verarbeiten die von dir bei Buchung, Anmeldung und Support-Kontakt angegebenen personenbezogenen Daten, um Reservierungen zu verwalten, dich zu deiner Buchung zu kontaktieren und den Dienst sicher zu halten.",
      "Zu den wichtigsten gespeicherten Buchungsdaten gehören Name, E-Mail-Adresse, Telefonnummer, Reservierungsdaten, Reisedaten und Zahlungsstatus.",
      "Wir verwenden standardmäßig keine optionalen Tracking-Cookies. Notwendige Cookies und lokaler Speicher können jedoch für Login-Sitzungen, die Sprachauswahl und das Verhindern des Verlusts einer laufenden Reservierung genutzt werden.",
      "Wenn du einen vollständig rechtlich geprüften Hinweis für Deutschland/EU brauchst, sollte diese Seite noch mit echten Firmendaten, Aufbewahrungsfristen, Auftragsverarbeitern, Kontakt-E-Mail und Rechtsgrundlagen ergänzt werden.",
    ],
    footerLinkLabel: "Cookie-Hinweis",
  },
};

const cookieCopy: Record<SupportedLang, LegalCopy> = {
  en: {
    title: "Cookie Notice",
    intro:
      "This page explains the essential cookies and storage we use to keep the site working.",
    paragraphs: [
      "This site currently relies on essential technologies for login, session continuity, language switching and preserving in-progress reservations.",
      "If optional analytics, advertising or personalization cookies are introduced later, they should stay off by default until the visitor gives clear consent.",
      "Visitors should also be able to revisit their choice, read what each category does and continue using the site with essential cookies only.",
    ],
    footerLinkLabel: "Privacy notice",
  },
  fa: {
    title: "اطلاعیه کوکی‌ها",
    intro:
      "این صفحه کوکی‌ها و فضای ذخیره‌سازی ضروری مورد استفاده برای کارکرد سایت را توضیح می‌دهد.",
    paragraphs: [
      "این سایت در حال حاضر برای ورود، حفظ نشست کاربر، تغییر زبان و نگهداری رزرو در حال انجام، به فناوری‌های ضروری متکی است.",
      "اگر بعداً کوکی‌های اختیاری برای تحلیل، تبلیغات یا شخصی‌سازی اضافه شوند، باید تا زمان دریافت رضایت روشن کاربر به‌صورت پیش‌فرض خاموش بمانند.",
      "کاربران باید بتوانند انتخاب خود را دوباره بازبینی کنند، ببینند هر دسته چه کاری انجام می‌دهد و همچنان با کوکی‌های ضروری از سایت استفاده کنند.",
    ],
    footerLinkLabel: "اطلاعیه حریم خصوصی",
  },
  de: {
    title: "Cookie-Hinweis",
    intro:
      "Diese Seite erklärt die notwendigen Cookies und Speichermechanismen, die die Website am Laufen halten.",
    paragraphs: [
      "Diese Website verwendet derzeit notwendige Technologien für Login, Sitzungsfortführung, Sprachwechsel und das Speichern laufender Reservierungen.",
      "Wenn später optionale Analyse-, Werbe- oder Personalisierungs-Cookies hinzugefügt werden, sollten sie standardmäßig deaktiviert bleiben, bis der Besucher ausdrücklich zustimmt.",
      "Besucher sollten ihre Auswahl außerdem später erneut überprüfen, sehen können, was jede Kategorie macht, und die Website weiterhin nur mit den notwendigen Cookies nutzen können.",
    ],
    footerLinkLabel: "Datenschutzhinweis",
  },
};

export function getPrivacyCopy(lang: string) {
  return privacyCopy[(lang as SupportedLang) || "en"] ?? privacyCopy.en;
}

export function getCookieCopy(lang: string) {
  return cookieCopy[(lang as SupportedLang) || "en"] ?? cookieCopy.en;
}
