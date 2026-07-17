import Link from "next/link";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-3xl font-extrabold text-zinc-950">Privacy Notice</h1>
        <div className="mt-6 space-y-6 text-sm leading-7 text-zinc-700">
          <p>
            We process the personal data you provide during booking, login and
            support communication to manage reservations, contact you about your
            booking, and keep the service secure.
          </p>
          <p>
            The main booking data we store includes name, email address, phone
            number, reservation details, travel selection and payment status.
          </p>
          <p>
            We do not use optional tracking cookies by default. Essential
            cookies and local storage may still be used for login sessions,
            language selection and keeping an in-progress reservation from being
            lost.
          </p>
          <p>
            If you want a complete legally reviewed notice for Germany/EU use,
            this page should still be finalized with your real company details,
            data retention periods, processor list, contact email and legal
            basis wording.
          </p>
        </div>

        <div className="mt-8">
          <Link
            href={`/${lang}/cookies`}
            className="font-semibold text-rose-700 underline underline-offset-2"
          >
            Cookie notice
          </Link>
        </div>
      </div>
    </main>
  );
}
