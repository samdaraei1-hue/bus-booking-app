import Link from "next/link";

export default async function CookiesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-3xl font-extrabold text-zinc-950">Cookie Notice</h1>
        <div className="mt-6 space-y-6 text-sm leading-7 text-zinc-700">
          <p>
            This site currently relies on essential technologies for login,
            session continuity, language switching and preserving in-progress
            reservations.
          </p>
          <p>
            If optional analytics, advertising or personalization cookies are
            introduced later, they should stay off by default until the visitor
            gives clear consent.
          </p>
          <p>
            Visitors should also be able to revisit their choice, read what each
            category does and continue using the site with essential cookies only.
          </p>
        </div>

        <div className="mt-8">
          <Link
            href={`/${lang}/privacy`}
            className="font-semibold text-rose-700 underline underline-offset-2"
          >
            Privacy notice
          </Link>
        </div>
      </div>
    </main>
  );
}
