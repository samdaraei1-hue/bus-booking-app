"use client";

import { useMemo } from "react";
import { useTranslationsContext } from "@/lib/translations/TranslationsProvider.client";

export function useT(lang: string) {
  const context = useTranslationsContext();
  const resolvedDict =
    context && context.lang === lang ? context.dict : {};

  return useMemo(() => {
    return (fullKey: string, fallback?: string) =>
      resolvedDict[fullKey] ?? fallback ?? fullKey;
  }, [resolvedDict]);
}
