import { supabase } from "@/lib/supabaseClient";

type TranslationRow = {
  namespace: string;
  key: string;
  value: string;
};

export async function fetchTranslationDict(lang: string) {
  const dict: Record<string, string> = {};
  try {
    const { data, error } = await supabase
      .from("translations")
      .select("namespace, key, value")
      .eq("lang", lang);

    if (error) {
      console.error("Failed to fetch translation dict", error);
      return dict;
    }

    (data as TranslationRow[] | null)?.forEach((row) => {
      dict[`${row.namespace}.${row.key}`] = row.value;
    });
  } catch (error) {
    console.error("Failed to fetch translation dict", error);
  }

  return dict;
}

export async function fetchT(lang: string) {
  const dict = await fetchTranslationDict(lang);

  return (fullKey: string, fallback?: string) =>
    dict[fullKey] ?? fallback ?? fullKey;
}
