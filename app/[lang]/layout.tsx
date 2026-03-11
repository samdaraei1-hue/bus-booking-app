import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DocumentDirection from "@/components/DocumentDirection";

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900">
      <DocumentDirection lang={lang} />
      <Navbar lang={lang} />
      <main>{children}</main>
      <Footer lang={lang} />
    </div>
  );
}