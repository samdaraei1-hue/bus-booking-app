import Link from "next/link";
import { fetchT } from "@/lib/translations/fetchT.server";

export default async function CookiesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await fetchT(lang);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(24,24,27,0.08)]">
        <div className="bg-gradient-to-br from-zinc-50 via-white to-rose-50 px-8 py-10">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
              {t("page.legal.badge", "Legal")}
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-950">
              {t("page.cookies.title", "Cookie Notice")}
            </h1>
            <p className="mt-4 text-base leading-8 text-zinc-600">
              {t(
                "page.cookies.intro",
                "This page explains the essential cookies and storage we use to keep the site working."
              )}
            </p>
          </div>
        </div>

        <div className="grid gap-6 px-8 py-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5 text-sm leading-8 text-zinc-700">
            <p>
              {t(
                "page.cookies.paragraph1",
                "This site currently relies on essential technologies for login, session continuity, language switching and preserving in-progress reservations."
              )}
            </p>
            <p>
              {t(
                "page.cookies.paragraph2",
                "If optional analytics, advertising or personalization cookies are introduced later, they should stay off by default until the visitor gives clear consent."
              )}
            </p>
            <p>
              {t(
                "page.cookies.paragraph3",
                "Visitors should also be able to revisit their choice, read what each category does and continue using the site with essential cookies only."
              )}
            </p>
          </div>

          <aside className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6">
            <div className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {t("common.quick_links", "Quick links")}
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <Link
                href={`/${lang}/privacy`}
                className="block rounded-2xl bg-white px-4 py-3 font-semibold text-rose-700 shadow-sm ring-1 ring-zinc-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {t("page.cookies.privacy_link", "Privacy notice")}
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
