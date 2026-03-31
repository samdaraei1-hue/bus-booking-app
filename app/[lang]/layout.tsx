import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DocumentDirection from "@/components/DocumentDirection";
import { fetchTranslationDict } from "@/lib/translations/fetchT.server";
import { TranslationsProvider } from "@/lib/translations/TranslationsProvider.client";

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const initialDict = await fetchTranslationDict(lang);

  return (
    <TranslationsProvider lang={lang} initialDict={initialDict}>
      <div className="min-h-dvh bg-zinc-50 text-zinc-900">
        <DocumentDirection lang={lang} />
        <Navbar lang={lang} />
        <main className="pb-8">{children}</main>
        <Footer lang={lang} />
      </div>
    </TranslationsProvider>
  );
}
