"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Translation } from "@/lib/types";
import { useT } from "@/lib/translations/useT.client";

const LANGS = [
  { code: "fa", label: "فارسی" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
] as const;

const UI_NAMESPACE_GROUPS = [
  {
    value: "common",
    title: "Common",
    description: "Buttons and shared labels used all over the site.",
  },
  {
    value: "button",
    title: "Buttons",
    description: "Generic action labels such as add, edit, and delete.",
  },
  {
    value: "confirm",
    title: "Confirmations",
    description: "Confirmation prompts like delete approval.",
  },
  {
    value: "error",
    title: "Errors",
    description: "Generic error messages used across forms and pages.",
  },
  {
    value: "navbar",
    title: "Navbar",
    description: "Top navigation labels and header texts.",
  },
  {
    value: "footer",
    title: "Footer",
    description: "Footer headings, brand text, and social section.",
  },
  {
    value: "page.home",
    title: "Home Page",
    description: "Hero, section titles, and CTA texts on the homepage.",
  },
  {
    value: "page.login",
    title: "Login Page",
    description: "Login form labels, help text, and actions.",
  },
  {
    value: "page.travels",
    title: "Listing Page",
    description: "Texts on the trips and programs listing page.",
  },
  {
    value: "page.travel_detail",
    title: "Detail Page",
    description: "Labels on the trip or program detail page.",
  },
  {
    value: "page.seat_map",
    title: "Seat Map",
    description: "Seat selection, participant count, and helper texts.",
  },
  {
    value: "page.reservation_details",
    title: "Reservation Details",
    description: "Participant details before payment.",
  },
  {
    value: "page.payment",
    title: "Payment",
    description: "Payment screen messages, instructions, and actions.",
  },
  {
    value: "page.my_bookings",
    title: "My Bookings",
    description: "Booking history, statuses, and follow-up actions.",
  },
  {
    value: "page.profile",
    title: "Profile",
    description: "Profile edit labels and save state texts.",
  },
  {
    value: "page.dashboard",
    title: "Dashboard",
    description: "Dashboard labels and management shortcuts.",
  },
  {
    value: "page.travel_layout",
    title: "Travel Layout",
    description: "Seat layout builder and layout editor texts.",
  },
  {
    value: "page.travel_translations",
    title: "Travel Translations",
    description: "Dedicated item translation editor texts.",
  },
  {
    value: "page.admin",
    title: "Admin Translations",
    description: "Older admin translation screen labels.",
  },
  {
    value: "dashboard.reservations",
    title: "Reservations Dashboard",
    description: "Reservation management table filters and statuses.",
  },
  {
    value: "dashboardtravels",
    title: "Dashboard Travels Table",
    description: "Column names used in the dashboard travel list.",
  },
  {
    value: "travels",
    title: "Travel Form",
    description: "Trip or program create/edit form labels.",
  },
  {
    value: "event",
    title: "Program Form",
    description: "Program-specific labels like organizer and venue.",
  },
  {
    value: "travel.type",
    title: "Offering Types",
    description: "Trip, event, hiking, camping, and other type labels.",
  },
  {
    value: "role",
    title: "Roles",
    description: "Role labels and fallback role values.",
  },
  {
    value: "table",
    title: "Table Labels",
    description: "Generic table column labels used in the dashboard.",
  },
] as const;

type TranslationRow = Translation & {
  id?: string;
  entity_id?: string | null;
};

type TravelListRow = {
  id: string;
  name: string | null;
  kind: string | null;
  type: string | null;
  origin: string | null;
  destination: string | null;
};

type NamespaceGroup = {
  value: string;
  title: string;
  description: string;
};

function humanizeNamespace(value: string) {
  return value
    .replaceAll(".", " / ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export default function DashboardTranslationsPage() {
  const params = useParams<{ lang: string }>();
  const searchParams = useSearchParams();
  const lang = params.lang;
  const t = useT(lang);

  const [langFilter, setLangFilter] = useState<string>(lang);
  const [search, setSearch] = useState("");
  const [entitySearch, setEntitySearch] = useState("");
  const [items, setItems] = useState<TranslationRow[]>([]);
  const [travels, setTravels] = useState<TravelListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [namespaceInput, setNamespaceInput] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [entityIdInput, setEntityIdInput] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editNamespace, setEditNamespace] = useState<string | null>(null);
  const [editEntityId, setEditEntityId] = useState<string | null>(null);
  const [namespaceFilter, setNamespaceFilter] = useState<string>(
    searchParams.get("namespace") ?? ""
  );
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const nextNamespace = searchParams.get("namespace") ?? "";
    setNamespaceFilter(nextNamespace);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);

    try {
      const [{ data: translationsData, error: translationsError }, { data: travelsData, error: travelsError }] =
        await Promise.all([
          supabase
            .from("translations")
            .select("id, namespace, key, lang, value, entity_id")
            .eq("lang", langFilter)
            .order("namespace", { ascending: true })
            .order("key", { ascending: true }),
          supabase
            .from("travels")
            .select("id, name, kind, type, origin, destination")
            .order("departure_at", { ascending: false }),
        ]);

      if (translationsError) throw translationsError;
      if (travelsError) throw travelsError;

      setItems((translationsData ?? []) as TranslationRow[]);
      setTravels((travelsData ?? []) as TravelListRow[]);
    } catch (error) {
      console.error(error);
      setItems([]);
      setTravels([]);
      setMsg(error instanceof Error ? error.message : "Failed to load translations");
    } finally {
      setLoading(false);
    }
  }, [langFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return items.filter((item) => {
      if (namespaceFilter && item.namespace !== namespaceFilter) return false;
      if (!needle) return true;

      return [item.namespace, item.key, item.value, item.entity_id]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
    });
  }, [items, namespaceFilter, search]);

  const namespaceGroups = useMemo(() => {
    const baseGroups = [...UI_NAMESPACE_GROUPS];
    const knownValues = new Set<string>(baseGroups.map((group) => group.value));
    const dynamicNamespaces = Array.from(
      new Set(items.map((item) => item.namespace).filter((value) => value && value !== "travel"))
    )
      .filter((namespace) => !knownValues.has(namespace))
      .sort((a, b) => a.localeCompare(b));

    const dynamicGroups: NamespaceGroup[] = dynamicNamespaces.map((namespace) => ({
      value: namespace,
      title: humanizeNamespace(namespace),
      description: "Detected from existing translation records.",
    }));

    return [...baseGroups, ...dynamicGroups];
  }, [items]);

  const entityResults = useMemo(() => {
    const needle = entitySearch.trim().toLowerCase();
    if (!needle) return travels.slice(0, 12);

    return travels.filter((travel) =>
      [travel.name, travel.origin, travel.destination, travel.kind, travel.type]
        .filter(Boolean)
        .some((value) => normalizeText(value).includes(needle))
    );
  }, [entitySearch, travels]);

  const resetForm = () => {
    setNamespaceInput("");
    setKeyInput("");
    setEntityIdInput("");
    setValueInput("");
    setEditKey(null);
    setEditNamespace(null);
    setEditEntityId(null);
  };

  const openCreateFromGroup = (namespace: string) => {
    setNamespaceFilter(namespace);
    setNamespaceInput(namespace);
    setKeyInput("");
    setEntityIdInput("");
    setValueInput("");
    setEditKey(null);
    setEditNamespace(null);
    setEditEntityId(null);
  };

  const upsert = async () => {
    setMsg(null);

    if (!namespaceInput.trim() || !keyInput.trim() || !valueInput.trim()) {
      setMsg("Language, namespace, key, and value are required.");
      return;
    }

    try {
      const row = {
        namespace: namespaceInput.trim(),
        key: keyInput.trim(),
        lang: langFilter,
        entity_id: entityIdInput.trim() || null,
        value: valueInput,
      };

      const { error } = await supabase.from("translations").upsert(row, {
        onConflict: "lang,namespace,key,entity_id",
      });

      if (error) throw error;

      setMsg("Saved");
      resetForm();
      await load();
    } catch (error) {
      console.error(error);
      setMsg(error instanceof Error ? error.message : "Failed to save translation");
    }
  };

  const remove = async (namespace: string, key: string, entityId?: string | null) => {
    setMsg(null);

    try {
      let query = supabase
        .from("translations")
        .delete()
        .eq("namespace", namespace)
        .eq("key", key)
        .eq("lang", langFilter);

      if (entityId) query = query.eq("entity_id", entityId);
      else query = query.is("entity_id", null);

      const { error } = await query;
      if (error) throw error;

      setMsg("Deleted");
      await load();
    } catch (error) {
      console.error(error);
      setMsg(error instanceof Error ? error.message : "Failed to delete translation");
    }
  };

  return (
    <main className="page-shell">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl">
          {t("page.dashboard.translations", "Manage Translations")}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
          {t(
            "page.dashboard.translations_desc",
            "Find broken UI texts faster, then jump directly to item-specific translations for travel and program data."
          )}
        </p>
      </div>

      <section className="page-card mb-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-lg font-extrabold text-zinc-900">
              UI Translation Finder
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Pick a page area first, then search inside that section. This is much
              easier than guessing the exact namespace and key from memory.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={langFilter}
              onChange={(event) => setLangFilter(event.target.value)}
              title="Translation language"
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 transition focus:ring-4"
            >
              {LANGS.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.label}
                </option>
              ))}
            </select>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by text, namespace, key, or entity id"
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 transition focus:ring-4"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {namespaceGroups.map((group) => {
            const isActive = namespaceFilter === group.value;
            const itemCount = items.filter((item) => item.namespace === group.value).length;

            return (
              <button
                key={group.value}
                type="button"
                onClick={() => openCreateFromGroup(group.value)}
                className={`rounded-3xl border p-4 text-start transition ${
                  isActive
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-zinc-50/70 text-zinc-900 hover:bg-zinc-100"
                }`}
              >
                <div className="text-sm font-bold">{group.title}</div>
                <div
                  className={`mt-2 text-xs ${
                    isActive ? "text-zinc-200" : "text-zinc-500"
                  }`}
                >
                  {group.description}
                </div>
                <div
                  className={`mt-2 text-[11px] ${
                    isActive ? "text-zinc-300" : "text-zinc-400"
                  }`}
                >
                  {itemCount} translation{itemCount === 1 ? "" : "s"}
                </div>
                <div
                  className={`mt-3 text-xs font-semibold ${
                    isActive ? "text-zinc-300" : "text-zinc-400"
                  }`}
                >
                  {group.value}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700">
            {namespaceFilter ? `Filtered: ${namespaceFilter}` : "Showing all namespaces"}
          </div>
          {namespaceFilter ? (
            <button
              type="button"
              onClick={() => setNamespaceFilter("")}
              className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-200"
            >
              Clear filter
            </button>
          ) : null}
        </div>
      </section>

      <section className="page-card mb-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-lg font-extrabold text-zinc-900">
              Content Translation Editor
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Travel and program names, origins, destinations, and descriptions are
              stored per item. Search the item here and open its dedicated translation
              editor.
            </p>
          </div>

          <input
            value={entitySearch}
            onChange={(event) => setEntitySearch(event.target.value)}
            placeholder="Search travel or program name"
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 transition focus:ring-4"
          />
        </div>

        <div className="mt-5 grid gap-3">
          {entityResults.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
              No matching trips or programs found.
            </div>
          ) : (
            entityResults.map((travel) => (
              <div
                key={travel.id}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold text-zinc-900">
                    {travel.name || travel.id}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {[travel.origin, travel.destination].filter(Boolean).join(" / ") || "-"}
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {travel.kind || travel.type || "travel"}
                  </div>
                </div>

                <Link
                  href={`/${lang}/dashboard/travels/${travel.id}/translations`}
                  className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Open item translations
                </Link>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <section className="page-card p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-zinc-900">
                Matching UI Texts
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Edit existing translations or create missing ones for the selected section.
              </p>
            </div>
            <div className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700">
              {filtered.length} result{filtered.length === 1 ? "" : "s"}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-2xl bg-zinc-100"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
              No translations found for this filter. Use the form to create the missing text.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item, index) => (
                <div
                  key={
                    item.id ??
                    `${item.namespace}.${item.key}.${item.entity_id ?? "base"}.${item.value}.${index}`
                  }
                  className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        {item.namespace}
                      </div>
                      <div className="mt-1 break-all text-sm font-bold text-zinc-900">
                        {item.key}
                      </div>
                      {item.entity_id ? (
                        <div className="mt-1 break-all text-xs text-zinc-400">
                          entity: {item.entity_id}
                        </div>
                      ) : null}
                      <div className="mt-3 break-words text-sm leading-6 text-zinc-600">
                        {item.value}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2 self-start">
                      <button
                        type="button"
                        onClick={() => {
                          setEditNamespace(item.namespace);
                          setEditKey(item.key);
                          setEditEntityId(item.entity_id ?? null);
                          setNamespaceInput(item.namespace);
                          setKeyInput(item.key);
                          setEntityIdInput(item.entity_id ?? "");
                          setValueInput(item.value);
                        }}
                        className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-200"
                      >
                        {t("page.admin.translations.edit", "Edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(item.namespace, item.key, item.entity_id)}
                        className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
                      >
                        {t("page.admin.translations.delete", "Delete")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="page-card p-5 sm:p-6 xl:sticky xl:top-24 xl:h-fit">
          <h2 className="text-lg font-extrabold text-zinc-900">
            {editKey
              ? t("page.admin.translations.edit", "Edit")
              : t("page.admin.translations.create", "Create")}
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            If a text is missing entirely, pick the page area on the left first, then add the key here.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label
                className="block text-sm font-semibold text-zinc-700"
                htmlFor="translation-lang"
              >
                Language
              </label>
              <select
                id="translation-lang"
                value={langFilter}
                onChange={(event) => setLangFilter(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 transition focus:ring-4"
              >
                {LANGS.map((entry) => (
                  <option key={entry.code} value={entry.code}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="block text-sm font-semibold text-zinc-700"
                htmlFor="namespace"
              >
                Namespace
              </label>
              <input
                id="namespace"
                value={namespaceInput}
                onChange={(event) => setNamespaceInput(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 transition focus:ring-4"
                placeholder="page.home"
                disabled={!!editNamespace}
              />
            </div>

            <div>
              <label
                className="block text-sm font-semibold text-zinc-700"
                htmlFor="translation-key"
              >
                Key
              </label>
              <input
                id="translation-key"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 transition focus:ring-4"
                placeholder="hero.title"
                disabled={!!editKey}
              />
            </div>

            <div>
              <label
                className="block text-sm font-semibold text-zinc-700"
                htmlFor="entity-id"
              >
                Entity Id
              </label>
              <input
                id="entity-id"
                value={entityIdInput}
                onChange={(event) => setEntityIdInput(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 transition focus:ring-4"
                placeholder="Leave empty for UI text"
                disabled={editEntityId !== null}
              />
            </div>

            <div>
              <label
                className="block text-sm font-semibold text-zinc-700"
                htmlFor="translation-value"
              >
                Value
              </label>
              <textarea
                id="translation-value"
                value={valueInput}
                onChange={(event) => setValueInput(event.target.value)}
                className="mt-2 h-32 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 transition focus:ring-4"
                placeholder="Translation text..."
              />
            </div>

            <button
              type="button"
              onClick={() => void upsert()}
              className="w-full rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-zinc-800"
            >
              {t("common.save", "Save")}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="w-full rounded-2xl bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
            >
              {t("page.admin.translations.clear_form", "Clear Form")}
            </button>

            {msg ? <div className="text-sm text-zinc-700">{msg}</div> : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
