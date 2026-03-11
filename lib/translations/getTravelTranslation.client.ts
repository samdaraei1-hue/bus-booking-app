import { supabase } from "@/lib/supabaseClient";

export async function getTravelTranslations(travelId: string, lang: string) {
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

  return map;
}