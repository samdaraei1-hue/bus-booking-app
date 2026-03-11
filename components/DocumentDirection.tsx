"use client";

import { useEffect } from "react";

export default function DocumentDirection({ lang }: { lang: string }) {
  useEffect(() => {
    const isRTL = lang === "fa";
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
  }, [lang]);

  return null;
}