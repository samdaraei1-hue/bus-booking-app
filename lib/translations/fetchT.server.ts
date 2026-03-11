import { supabase } from "@/lib/supabaseClient";

type TranslationRow = {
  namespace: string;
  key: string;
  value: string;
};

export async function fetchT(lang: string) {
  const { data } = await supabase
    .from("translations")
    .select("namespace, key, value")
    .eq("lang", lang);

  const dict: Record<string, string> = {};

  (data as TranslationRow[] | null)?.forEach((row) => {
    dict[`${row.namespace}.${row.key}`] = row.value;
  });

  return (fullKey: string, fallback?: string) =>
    dict[fullKey] ?? fallback ?? fullKey;
}