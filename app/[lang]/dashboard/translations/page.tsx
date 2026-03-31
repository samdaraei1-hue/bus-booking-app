"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Translation } from "@/lib/types";
import { useT } from "@/lib/translations/useT.client";

const LANGS = [
  { code: "fa", label: "فارسی" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
] as const;

type TranslationRow = Translation & {
  entity_id?: string | null;
};

export default function DashboardTranslationsPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const t = useT(lang);

  const [langFilter, setLangFilter] = useState<string>(lang);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<TranslationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [namespaceInput, setNamespaceInput] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [entityIdInput, setEntityIdInput] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editNamespace, setEditNamespace] = useState<string | null>(null);
  const [editEntityId, setEditEntityId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [langFilter]);

  const load = async () => {
    setLoading(true);
    setMsg(null);

    try {
      const { data, error } = await supabase
        .from("translations")
        .select("namespace, key, lang, value, entity_id")
        .eq("lang", langFilter)
        .order("namespace", { ascending: true })
        .order("key", { ascending: true });

      if (error) throw error;
      setItems((data ?? []) as TranslationRow[]);
    } catch (error) {
      console.error(error);
      setItems([]);
      setMsg(error instanceof Error ? error.message : "Failed to load translations");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;

    return items.filter((item) =>
      [item.namespace, item.key, item.value, item.entity_id]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle))
    );
  }, [items, search]);

  const resetForm = () => {
    setNamespaceInput("");
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
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          {t("page.dashboard.translations_desc", "Multilingual site texts")}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <section className="page-card p-4 sm:p-6">
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-[220px_1fr]">
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
              placeholder="namespace / key / value / entity id"
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 transition focus:ring-4"
            />
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
              No translations found.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => (
                <div
                  key={`${item.namespace}.${item.key}.${item.entity_id ?? "base"}`}
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
              <p className="mt-2 text-xs text-zinc-500">
                New records are saved with this language.
              </p>
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
                placeholder="optional for travel-specific translation"
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
