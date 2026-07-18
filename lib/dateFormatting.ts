export function getDateLocale(lang: string) {
  if (lang === "fa") return "fa-IR-u-ca-gregory-nu-latn";
  if (lang === "de") return "de-DE";
  return "en-US";
}

export function formatDateTime(value: string | null | undefined, lang: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(getDateLocale(lang), {
    calendar: "gregory",
    numberingSystem: "latn",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDateOnly(value: string | null | undefined, lang: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(getDateLocale(lang), {
    calendar: "gregory",
    numberingSystem: "latn",
    dateStyle: "medium",
  }).format(date);
}
