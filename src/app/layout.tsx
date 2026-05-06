import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PharmPOS - Pharmacy Billing & Inventory Management",
  description: "Simple, fast, and powerful pharmacy management system for medical shops",
  keywords: ["pharmacy", "billing", "inventory", "medical shop", "POS"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.svg",
  },
  manifest: "/manifest.json",
};

const faviconScript = `(function(){try{var s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%230d9488"/><rect x="13" y="4" width="6" height="10" rx="1.5" fill="white" opacity=".95"/><rect x="4" y="13" width="10" height="6" rx="1.5" fill="white" opacity=".95"/><rect x="18" y="13" width="10" height="6" rx="1.5" fill="white" opacity=".95"/><rect x="13" y="18" width="6" height="10" rx="1.5" fill="white" opacity=".95"/></svg>';var u='data:image/svg+xml,'+s;document.querySelectorAll('link[rel*="icon"]').forEach(function(e){e.remove()});var l=document.createElement('link');l.rel='icon';l.href=u;document.head.appendChild(l);var l2=document.createElement('link');l2.rel='shortcut icon';l2.href=u;document.head.appendChild(l2)}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Script id="favicon-fix" strategy="afterInteractive">
          {faviconScript}
        </Script>
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
