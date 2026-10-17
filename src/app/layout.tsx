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
    default: "GhanaMarketTrade — Find and buy anything in Ghana",
    template: "%s · GhanaMarketTrade",
  },
  description:
    "Find and buy anything in Ghana. Search verified Ghanaian businesses by sector and location, view products and services, and contact them directly.",
  icons: {
    icon: "/app-icon.png",
    apple: "/app-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "GhanaMarketTrade",
    locale: "en_GH",
    title: "GhanaMarketTrade — Find and buy anything in Ghana",
    description:
      "Find and buy anything in Ghana. Discover trusted Ghanaian businesses, products, services, and logistics providers.",
    images: ["/logo.png"],
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
