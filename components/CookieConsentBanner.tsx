"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/lib/translations/useT.client";

const STORAGE_KEY = "cookie-consent-v1";

export default function CookieConsentBanner({ lang }: { lang: string }) {
  const t = useT(lang);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const current = window.localStorage.getItem(STORAGE_KEY);
      setVisible(!current);
    } catch {
      setVisible(true);
    }
  }, []);

  const saveChoice = (value: "essential" | "all") => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-zinc-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="font-semibold text-zinc-950">
            {t("cookie.title", "Cookies and privacy")}
          </div>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            {t(
              "cookie.description",
              "We use essential cookies for login and reservation flow. If optional cookies are added later, you will be able to manage them here."
            )}{" "}
            <Link href={`/${lang}/cookies`} className="font-semibold text-rose-700 underline underline-offset-2">
              {t("cookie.learn_more", "Learn more")}
            </Link>{" "}
            <span>{t("common.and", "and")}</span>{" "}
            <Link href={`/${lang}/privacy`} className="font-semibold text-rose-700 underline underline-offset-2">
              {t("cookie.privacy_notice", "privacy notice")}
            </Link>
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => saveChoice("essential")}
            className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
          >
            {t("cookie.essential_only", "Use essential only")}
          </button>
          <button
            type="button"
            onClick={() => saveChoice("all")}
            className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            {t("cookie.accept_all", "Accept all")}
          </button>
        </div>
      </div>
    </div>
  );
}
