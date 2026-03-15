import "./globals.css";
import { Inter, Vazirmatn } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
});

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
    <html lang="fa" >
      <body className={`${inter.variable} ${vazirmatn.variable}`}>
        {children}
      </body>
    </html>
  );
}