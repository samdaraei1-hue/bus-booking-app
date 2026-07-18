import Link from "next/link";
import { getCookieCopy } from "@/lib/legalContent";

export default async function CookiesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const copy = getCookieCopy(lang);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(24,24,27,0.08)]">
        <div className="bg-gradient-to-br from-zinc-50 via-white to-rose-50 px-8 py-10">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
              Legal
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-950">
              {copy.title}
            </h1>
            <p className="mt-4 text-base leading-8 text-zinc-600">
              {copy.intro}
            </p>
          </div>
        </div>

        <div className="grid gap-6 px-8 py-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5 text-sm leading-8 text-zinc-700">
            {copy.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <aside className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6">
            <div className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Quick links
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <Link
                href={`/${lang}/privacy`}
                className="block rounded-2xl bg-white px-4 py-3 font-semibold text-rose-700 shadow-sm ring-1 ring-zinc-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {copy.footerLinkLabel}
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
