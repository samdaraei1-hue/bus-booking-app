import HomeClient from "./home/HomeClient";

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return <HomeClient lang={lang} />;
}