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

export default function DashboardTranslationsPage() {
  const params = useParams<{ lang: string }>();
  const lang = params.lang;
  const t = useT(lang);

  const [langFilter, setLangFilter] = useState<string>(lang);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);

  const [namespaceInput, setNamespaceInput] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editNamespace, setEditNamespace] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setMsg(null);

    let q = supabase
      .from("translations")
      .select("namespace, key, lang, value")
      .eq("lang", langFilter);

    const { data, error } = await q.order("namespace", { ascending: true }).order("key", { ascending: true });

    if (error) {
      setItems([]);
      setMsg(error.message);
    } else {
      setItems((data ?? []) as Translation[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [langFilter]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (i) =>
        i.namespace.toLowerCase().includes(s) ||
        i.key.toLowerCase().includes(s) ||
        i.value.toLowerCase().includes(s)
    );
  }, [items, search]);

  const resetForm = () => {
    setNamespaceInput("");
    setKeyInput("");
    setValueInput("");
    setEditKey(null);
    setEditNamespace(null);
  };

  const upsert = async () => {
    setMsg(null);
    if (!namespaceInput.trim() || !keyInput.trim()) {
      setMsg("namespace و key لازم است.");
      return;
    }

    const row = {
      namespace: namespaceInput.trim(),
      key: keyInput.trim(),
      lang: langFilter,
      value: valueInput,
    };

    const { error } = await supabase.from("translations").upsert(row, {
      onConflict: "lang,namespace,key",
    });

    if (error) setMsg(error.message);
    else {
      setMsg("ذخیره شد ✅");
      resetForm();
      await load();
    }
  };

  const remove = async (namespace: string, key: string) => {
    setMsg(null);

    const { error } = await supabase
      .from("translations")
      .delete()
      .eq("namespace", namespace)
      .eq("key", key)
      .eq("lang", langFilter);

    if (error) setMsg(error.message);
    else {
      setMsg("حذف شد ✅");
      await load();
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">{t("page.dashboard.translations", "مدیریت ترجمه‌ها")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("page.dashboard.translations_desc", "متن‌های چندزبانه‌ی سایت")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <label htmlFor="lang" className="block text-sm font-semibold text-zinc-700">
                {t("page.admin.translations.language")}
              </label>
              <select
                id="lang"
                title="Language"
                value={langFilter}
                onChange={(e) => setLangFilter(e.target.value)}
                className="mt-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[220px] flex-1">
              <label htmlFor="search" className="block text-sm font-semibold text-zinc-700">
                {t("page.admin.translations.search")}
              </label>
              <input
                id="search"
                title="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
                placeholder="namespace / key / value ..."
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-2xl bg-zinc-100" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200">
              {filtered.map((row) => (
                <div key={`${row.namespace}.${row.key}`} className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="text-xs text-zinc-500">{row.namespace}</div>
                    <div className="text-sm font-bold text-zinc-900">{row.key}</div>
                    <div className="mt-1 break-words text-sm text-zinc-600">{row.value}</div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditNamespace(row.namespace);
                        setEditKey(row.key);
                        setNamespaceInput(row.namespace);
                        setKeyInput(row.key);
                        setValueInput(row.value);
                      }}
                      className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-200"
                    >
                      {t("page.admin.translations.edit")}
                    </button>

                    <button
                      type="button"
                      onClick={() => remove(row.namespace, row.key)}
                      className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
                    >
                      {t("page.admin.translations.delete")}
                    </button>
                  </div>
                </div>
              ))}

              {filtered.length === 0 ? (
                <div className="p-6 text-sm text-zinc-600">چیزی پیدا نشد.</div>
              ) : null}
            </div>
          )}
        </section>

        <aside className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-extrabold">
            {editKey ? t("page.admin.translations.edit") : t("page.admin.translations.create")}
          </h2>

          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700" htmlFor="namespace">
                Namespace
              </label>
              <input
                id="namespace"
                value={namespaceInput}
                onChange={(e) => setNamespaceInput(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
                placeholder="page.home"
                disabled={!!editNamespace}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700" htmlFor="key">
                Key
              </label>
              <input
                id="key"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
                placeholder="hero.title"
                disabled={!!editKey}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700" htmlFor="value">
                Value
              </label>
              <textarea
                id="value"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                className="mt-2 h-28 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-rose-200 focus:ring-4"
                placeholder="متن ترجمه..."
              />
            </div>

            <button
              type="button"
              onClick={upsert}
              className="w-full rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-zinc-800"
            >
              {t("common.save")}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="w-full rounded-2xl bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
            >
              {t("page.admin.translations.clear_form")}
            </button>

            {msg ? <div className="text-sm text-zinc-700">{msg}</div> : null}
          </div>
        </aside>
      </div>
    </main>
  );
}