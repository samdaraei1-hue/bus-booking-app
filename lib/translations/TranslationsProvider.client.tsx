"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";

type Dict = Record<string, string>;

type TranslationContextValue = {
  lang: string;
  dict: Dict;
};

const translationCache = new Map<string, Dict>();

const TranslationContext = createContext<TranslationContextValue | null>(null);

async function fetchTranslations(lang: string) {
  const { data, error } = await supabase
    .from("translations")
    .select("namespace, key, value")
    .eq("lang", lang);

  if (error || !data) {
    throw error ?? new Error(`Failed to load translations for ${lang}`);
  }

  const next: Dict = {};
  data.forEach((row) => {
    next[`${row.namespace}.${row.key}`] = row.value;
  });

  translationCache.set(lang, next);
  return next;
}

export function TranslationsProvider({
  lang,
  initialDict,
  children,
}: {
  lang: string;
  initialDict: Dict;
  children: React.ReactNode;
}) {
  const [dict, setDict] = useState<Dict>(() => {
    translationCache.set(lang, initialDict);
    return translationCache.get(lang) ?? initialDict;
  });
  const requestIdRef = useRef(0);

  useEffect(() => {
    translationCache.set(lang, initialDict);
    setDict(initialDict);
  }, [initialDict, lang]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const requestId = ++requestIdRef.current;

      try {
        const next = await fetchTranslations(lang);
        if (!mounted || requestId !== requestIdRef.current) return;
        setDict(next);
      } catch (error) {
        if (!mounted || requestId !== requestIdRef.current) return;
        console.error("Failed to load translations", error);
      }
    };

    if (Object.keys(initialDict).length === 0) {
      void load();
    }

    return () => {
      mounted = false;
    };
  }, [initialDict, lang]);

  const value = useMemo(
    () => ({
      lang,
      dict,
    }),
    [dict, lang]
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslationsContext() {
  return useContext(TranslationContext);
}
