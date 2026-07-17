import "./globals.css";
import "@fontsource/vazirmatn/index.css";

export const metadata = {
  title: "Energy Travel",
  description: "Modern bus booking platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa">
      <body>{children}</body>
    </html>
  );
}
