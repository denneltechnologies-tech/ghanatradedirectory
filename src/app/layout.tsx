import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { env } from "@/lib/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: "Ghana Business Directory — find trusted businesses across Ghana",
    template: "%s · Ghana Business Directory",
  },
  description:
    "Search Ghanaian businesses by sector and location, view products and services, and contact them directly. Request delivery and transport quotes from logistics providers.",
  openGraph: {
    type: "website",
    siteName: "Ghana Business Directory",
    locale: "en_GH",
    title: "Ghana Business Directory",
    description:
      "Discover trusted Ghanaian businesses and logistics providers. Search by sector, region and district.",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
