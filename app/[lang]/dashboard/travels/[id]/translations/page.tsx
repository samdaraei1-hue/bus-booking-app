"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useRequireTravelLayoutAccess } from "@/lib/auth/requireTravelLayoutAccess";
import { useT } from "@/lib/translations/useT.client";

type TravelRow = {
  id: string;
  name: string | null;
  type: "travel" | "event" | null;
  origin: string | null;
  destination: string | null;
  description: string | null;
};

type LangCode = "fa" | "en" | "de";

type TranslationForm = {
  name: string;
  origin: string;
  destination: string;
  description: string;
};

type FieldLabels = {
  name: string;
  origin: string;
  destination: string;
  description: string;
};

const LANGS: Array<{ code: LangCode; label: string }> = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "fa", label: "فارسی" },
];

const EMPTY_FORM: TranslationForm = {
  name: "",
  origin: "",
  destination: "",
  description: "",
};

const LANG_THEMES: Record<
  LangCode,
  {
    badge: string;
    panel: string;
    accent: string;
    inputRing: string;
  }
> = {
  de: {
    badge: "bg-amber-100 text-amber-800",
    panel: "from-amber-50 to-white",
    accent: "text-amber-700",
    inputRing: "focus:ring-amber-200",
  },
  en: {
    badge: "bg-sky-100 text-sky-800",
    panel: "from-sky-50 to-white",
    accent: "text-sky-700",
    inputRing: "focus:ring-sky-200",
  },
  fa: {
    badge: "bg-emerald-100 text-emerald-800",
    panel: "from-emerald-50 to-white",
    accent: "text-emerald-700",
    inputRing: "focus:ring-emerald-200",
  },
};

const FIELD_LABELS: Record<
  LangCode,
  {
    travel: FieldLabels;
    event: FieldLabels;
  }
> = {
  fa: {
    travel: {
      name: "نام",
      origin: "مبدا",
      destination: "مقصد",
      description: "توضیحات",
    },
    event: {
      name: "نام برنامه",
      origin: "محل برگزاری",
      destination: "مقصد",
      description: "توضیحات",
    },
  },
  en: {
    travel: {
      name: "Name",
      origin: "Origin",
      destination: "Destination",
      description: "Description",
    },
    event: {
      name: "Program name",
      origin: "Venue",
      destination: "Destination",
      description: "Description",
    },
  },
  de: {
    travel: {
      name: "Name",
      origin: "Abfahrt",
      destination: "Ziel",
      description: "Beschreibung",
    },
    event: {
      name: "Programmname",
      origin: "Veranstaltungsort",
      destination: "Ziel",
      description: "Beschreibung",
    },
  },
};

export default function TravelTranslationsPage() {
  const params = useParams<{ lang: string; id: string }>();
  const lang = params.lang;
  const travelId = params.id;
  const guard = useRequireTravelLayoutAccess(lang, travelId);
  const t = useT(lang);

  const [travel, setTravel] = useState<TravelRow | null>(null);
  const [forms, setForms] = useState<Record<LangCode, TranslationForm>>({
    fa: { ...EMPTY_FORM },
    en: { ...EMPTY_FORM },
    de: { ...EMPTY_FORM },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (guard !== "allowed") return;

    let mounted = true;

    (async () => {
      setLoading(true);
      setMsg(null);

      try {
        const [{ data: travelRow, error: travelError }, { data, error }] =
          await Promise.all([
            supabase
              .from("travels")
              .select("id, name, type, origin, destination, description")
              .eq("id", travelId)
              .single(),
            supabase
              .from("translations")
              .select("lang, key, value")
              .eq("namespace", "travel")
              .eq("entity_id", travelId),
          ]);

        if (!mounted) return;
        if (travelError) throw travelError;
        if (error) throw error;

        const nextTravel = travelRow as TravelRow;
        setTravel(nextTravel);

        const baseForm: TranslationForm = {
          name: nextTravel.name ?? "",
          origin: nextTravel.origin ?? "",
          destination: nextTravel.destination ?? "",
          description: nextTravel.description ?? "",
        };

        const nextForms: Record<LangCode, TranslationForm> = {
          fa: { ...baseForm },
          en: { ...baseForm },
          de: { ...baseForm },
        };

        ((data ?? []) as Array<{ lang: string; key: string; value: string }>).forEach(
          (row) => {
            const normalizedLang = row.lang.trim().toLowerCase() as LangCode;
            if (!nextForms[normalizedLang]) return;
            if (row.key in nextForms[normalizedLang]) {
              (nextForms[normalizedLang] as Record<string, string>)[row.key] = row.value;
            }
          }
        );

        setForms(nextForms);
      } catch (error) {
        console.error(error);
        setMsg(error instanceof Error ? error.message : "Failed to load translations");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [guard, travelId]);

  const isEvent = travel?.type === "event";
  const pageTitleName =
    (lang === "de" || lang === "en" || lang === "fa") && travel
      ? forms[lang as LangCode].name.trim() || travel.name || travel.id
      : travel?.name || travel?.id || "";

  const updateField = (
    langCode: LangCode,
    field: keyof TranslationForm,
    value: string
  ) => {
    setForms((current) => ({
      ...current,
      [langCode]: {
        ...current[langCode],
        [field]: value,
      },
    }));
  };

  const saveTranslations = async () => {
    if (!travel) return;

    setSaving(true);
    setMsg(null);

    try {
      const rows = LANGS.flatMap(({ code }) => {
        const values = forms[code];
        const entries: Array<{ key: keyof TranslationForm; value: string }> = [
          { key: "name", value: values.name.trim() },
          { key: "origin", value: values.origin.trim() },
          { key: "description", value: values.description.trim() },
          { key: "destination", value: values.destination.trim() },
        ];

        return entries
          .filter((entry) => entry.value && (!isEvent || entry.key !== "destination"))
          .map((entry) => ({
            lang: code,
            namespace: "travel",
            key: entry.key,
            entity_id: travel.id,
            value: entry.value,
          }));
      });

      const { error: deleteError } = await supabase
        .from("translations")
        .delete()
        .eq("namespace", "travel")
        .eq("entity_id", travel.id)
        .in("key", isEvent ? ["name", "origin", "description"] : ["name", "origin", "destination", "description"]);

      if (deleteError) throw deleteError;

      if (rows.length) {
        const { error } = await supabase.from("translations").insert(rows);
        if (error) throw error;
      }

      setMsg(t("page.profile.saved", "Saved"));
    } catch (error) {
      console.error(error);
      setMsg(error instanceof Error ? error.message : "Failed to save translations");
    } finally {
      setSaving(false);
    }
  };

  if (guard === "loading" || loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="h-64 animate-pulse rounded-3xl bg-zinc-100" />
      </main>
    );
  }

  if (guard !== "allowed" || !travel) {
    return null;
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
            {travel.type === "event"
              ? t("travel.type.event", "Event")
              : t("travel.type.travel", "Travel")}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
            {t("page.travel_translations.title", "Travel Translations")}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {pageTitleName}
          </p>
        </div>

        <Link
          href={`/${lang}/dashboard/travels`}
          className="rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
        >
          {t("common.back", "Back")}
        </Link>
      </div>

      <div className="grid gap-6">
        {LANGS.map(({ code, label }) => {
          const labels = isEvent
            ? FIELD_LABELS[code].event
            : FIELD_LABELS[code].travel;
          const theme = LANG_THEMES[code];
          const completionCount = [
            forms[code].name,
            forms[code].origin,
            forms[code].description,
            isEvent ? "skip" : forms[code].destination,
          ].filter((value) => value && value !== "skip").length;
          const totalFields = isEvent ? 3 : 4;
          const isComplete = completionCount === totalFields;

          return (
          <section
            key={code}
            className={`overflow-hidden rounded-[30px] border border-zinc-200 bg-gradient-to-br ${theme.panel} shadow-sm`}
          >
            <div className="border-b border-zinc-200/80 px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">{label}</h2>
                  <p className={`mt-1 text-sm font-medium ${theme.accent}`}>
                    {isComplete
                      ? t("page.travel_translations.ready", "Ready")
                      : t("page.travel_translations.in_progress", "In progress")}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${theme.badge}`}>
                    {completionCount}/{totalFields}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-5 px-6 py-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  {labels.name}
                </label>
                <input
                  value={forms[code].name}
                  onChange={(event) => updateField(code, "name", event.target.value)}
                  className={`w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition ${theme.inputRing} focus:ring-4`}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  {labels.origin}
                </label>
                <input
                  value={forms[code].origin}
                  onChange={(event) => updateField(code, "origin", event.target.value)}
                  className={`w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition ${theme.inputRing} focus:ring-4`}
                />
              </div>

              {!isEvent ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-700">
                    {labels.destination}
                  </label>
                  <input
                    value={forms[code].destination}
                    onChange={(event) =>
                      updateField(code, "destination", event.target.value)
                    }
                    className={`w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition ${theme.inputRing} focus:ring-4`}
                  />
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  {labels.description}
                </label>
                <textarea
                  value={forms[code].description}
                  onChange={(event) =>
                    updateField(code, "description", event.target.value)
                  }
                  className={`min-h-40 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition ${theme.inputRing} focus:ring-4`}
                />
              </div>
            </div>
          </section>
          );
        })}
      </div>

      <div className="sticky bottom-6 mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[26px] border border-zinc-200 bg-white/95 px-5 py-4 shadow-xl backdrop-blur">
        <div>
          <div className="text-sm font-bold text-zinc-900">
            {t("page.travel_translations.save_bar_title", "Save travel translations")}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {t(
              "page.travel_translations.save_bar_help",
              "Changes for all languages will be saved together."
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {msg ? <div className="text-sm text-zinc-700">{msg}</div> : null}
          <button
            type="button"
            onClick={() => void saveTranslations()}
            disabled={saving}
            className="rounded-2xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {saving ? t("page.travel_translations.saving", "Saving...") : t("common.save", "Save")}
          </button>
        </div>
      </div>
    </main>
  );
}
