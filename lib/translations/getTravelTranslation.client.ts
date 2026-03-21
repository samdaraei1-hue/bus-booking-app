import { supabase } from "@/lib/supabaseClient";

const travelTranslationCache = new Map<string, Record<string, string>>();

function getCacheKey(lang: string, travelId: string) {
  return `${lang}:${travelId}`;
}

export async function getTravelTranslations(travelId: string, lang: string) {
  const cached = travelTranslationCache.get(getCacheKey(lang, travelId));
  if (cached) return cached;

  const { data, error } = await supabase
    .from("translations")
    .select("key, value")
    .eq("namespace", "travel")
    .eq("entity_id", travelId)
    .eq("lang", lang);

  if (error || !data) {
    return {};
  }

  const map: Record<string, string> = {};
  data.forEach((row) => {
    map[row.key] = row.value;
  });

  travelTranslationCache.set(getCacheKey(lang, travelId), map);
  return map;
}

export async function getTravelTranslationsMap(
  travelIds: string[],
  lang: string
) {
  const ids = Array.from(new Set(travelIds.filter(Boolean)));
  const result: Record<string, Record<string, string>> = {};

  if (!ids.length) return result;

  const missingIds: string[] = [];

  ids.forEach((id) => {
    const cached = travelTranslationCache.get(getCacheKey(lang, id));
    if (cached) {
      result[id] = cached;
    } else {
      missingIds.push(id);
    }
  });

  if (!missingIds.length) return result;

  const { data, error } = await supabase
    .from("translations")
    .select("entity_id, key, value")
    .eq("namespace", "travel")
    .eq("lang", lang)
    .in("entity_id", missingIds);

  if (error || !data) {
    missingIds.forEach((id) => {
      result[id] = result[id] ?? {};
    });
    return result;
  }

  missingIds.forEach((id) => {
    result[id] = result[id] ?? {};
  });

  data.forEach((row) => {
    if (!row.entity_id) return;
    result[row.entity_id] = result[row.entity_id] ?? {};
    result[row.entity_id][row.key] = row.value;
  });

  Object.entries(result).forEach(([id, map]) => {
    travelTranslationCache.set(getCacheKey(lang, id), map);
  });

  return result;
}
