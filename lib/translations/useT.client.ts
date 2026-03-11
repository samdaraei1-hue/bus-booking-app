"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TranslationRow = {
  namespace: string;
  key: string;
  value: string;
};

type Dict = Record<string, string>;

export function useT(lang: string) {
  const [dict, setDict] = useState<Dict>({});

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase
        .from("translations")
        .select("namespace, key, value")
        .eq("lang", lang);

      if (!mounted) return;

      if (error || !data) {
        setDict({});
        return;
      }

      const next: Dict = {};
      (data as TranslationRow[]).forEach((row) => {
        next[`${row.namespace}.${row.key}`] = row.value;
      });

      setDict(next);
    })();

    return () => {
      mounted = false;
    };
  }, [lang]);

  return useMemo(() => {
    return (fullKey: string, fallback?: string) =>
      dict[fullKey] ?? fallback ?? fullKey;
  }, [dict]);
}