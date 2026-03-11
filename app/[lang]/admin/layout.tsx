import { requireAdmin } from "@/lib/auth/requireAdmin";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  await requireAdmin(lang);

  return <>{children}</>;
}