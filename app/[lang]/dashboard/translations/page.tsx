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
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">
          {t("page.dashboard.translations", "مدیریت ترجمه‌ها")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {t("page.dashboard.translations_desc", "متن‌های چندزبانه‌ی سایت")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_400px]">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <div className="mb-4 grid gap-4 md:grid-cols-[220px_1fr]">
            <select
              value={langFilter}
              onChange={(event) => setLangFilter(event.target.value)}
              title="Translation language"
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
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
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-12 animate-pulse rounded-2xl bg-zinc-100"
                />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200">
              {filtered.map((item) => (
                <div
                  key={`${item.namespace}.${item.key}.${item.entity_id ?? "base"}`}
                  className="flex items-start justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-zinc-500">{item.namespace}</div>
                    <div className="text-sm font-bold text-zinc-900">{item.key}</div>
                    {item.entity_id ? (
                      <div className="mt-1 text-xs text-zinc-400">
                        entity: {item.entity_id}
                      </div>
                    ) : null}
                    <div className="mt-2 break-words text-sm text-zinc-600">
                      {item.value}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
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
                      {t("page.admin.translations.edit", "ویرایش")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(item.namespace, item.key, item.entity_id)}
                      className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
                    >
                      {t("page.admin.translations.delete", "حذف")}
                    </button>
                  </div>
                </div>
              ))}

              {!filtered.length ? (
                <div className="p-6 text-sm text-zinc-500">No translations found.</div>
              ) : null}
            </div>
          )}
        </section>

        <aside className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-extrabold text-zinc-900">
            {editKey
              ? t("page.admin.translations.edit", "ویرایش")
              : t("page.admin.translations.create", "ایجاد")}
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
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
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
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
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
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
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
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
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
                className="mt-2 h-32 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
                placeholder="Translation text..."
              />
            </div>

            <button
              type="button"
              onClick={() => void upsert()}
              className="w-full rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-zinc-800"
            >
              {t("common.save", "ذخیره")}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="w-full rounded-2xl bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
            >
              {t("page.admin.translations.clear_form", "پاک کردن فرم")}
            </button>

            {msg ? <div className="text-sm text-zinc-700">{msg}</div> : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
