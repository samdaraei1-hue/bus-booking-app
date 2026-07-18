import Link from "next/link";
import { fetchT } from "@/lib/translations/fetchT.server";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await fetchT(lang);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(24,24,27,0.08)]">
        <div className="bg-gradient-to-br from-rose-50 via-white to-zinc-50 px-8 py-10">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-700">
              {t("page.legal.badge", "Legal")}
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-950">
              {t("page.privacy.title", "Privacy Notice")}
            </h1>
            <p className="mt-4 text-base leading-8 text-zinc-600">
              {t(
                "page.privacy.intro",
                "This page explains how we handle personal data when you book, log in, or contact support."
              )}
            </p>
          </div>
        </div>

        <div className="grid gap-6 px-8 py-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5 text-sm leading-8 text-zinc-700">
            <p>
              {t(
                "page.privacy.paragraph1",
                "We process the personal data you provide during booking, login and support communication to manage reservations, contact you about your booking, and keep the service secure."
              )}
            </p>
            <p>
              {t(
                "page.privacy.paragraph2",
                "The main booking data we store includes name, email address, phone number, reservation details, travel selection and payment status."
              )}
            </p>
            <p>
              {t(
                "page.privacy.paragraph3",
                "We do not use optional tracking cookies by default. Essential cookies and local storage may still be used for login sessions, language selection and keeping an in-progress reservation from being lost."
              )}
            </p>
            <p>
              {t(
                "page.privacy.paragraph4",
                "If you want a complete legally reviewed notice for Germany/EU use, this page should still be finalized with your real company details, data retention periods, processor list, contact email and legal basis wording."
              )}
            </p>
          </div>

          <aside className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6">
            <div className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {t("common.quick_links", "Quick links")}
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <Link
                href={`/${lang}/cookies`}
                className="block rounded-2xl bg-white px-4 py-3 font-semibold text-rose-700 shadow-sm ring-1 ring-zinc-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {t("page.privacy.cookie_link", "Cookie notice")}
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
