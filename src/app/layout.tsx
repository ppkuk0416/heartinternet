import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "HearthDeck Hub | 오늘 플레이할 덱을 찾으세요",
    template: "%s | HearthDeck Hub",
  },
  description:
    "현재 패치의 하스스톤 덱을 발견하고, 운영법을 이해하고, 한 번에 코드를 복사하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <div className="site-frame">
          <SiteHeader />
          <main className="min-h-[calc(100vh-10rem)]">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
