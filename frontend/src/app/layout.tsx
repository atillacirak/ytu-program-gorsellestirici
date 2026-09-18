import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "YTÜ Program Görselleştirici",
  description: "YTÜ OBS ders programı görselleştirme - gönüllü proje",
  metadataBase: new URL("https://ytuprogram.vercel.app"),
  openGraph: {
    title: "YTÜ Program Görselleştirici",
    description: "YTÜ OBS ders programı görselleştirme - gönüllü proje",
    url: "https://ytuprogram.vercel.app",
    siteName: "YTÜ Program Görselleştirici",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "YTÜ Program Görselleştirici - OBS Ders Programı Çizelgeleme",
      },
    ],
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "YTÜ Program Görselleştirici",
    description: "YTÜ OBS ders programı görselleştirme - gönüllü proje",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      style={{ colorScheme: "light" }}
      className={`${inter.variable} ${jetbrainsMono.variable} font-sans h-full antialiased bg-[#f8fafc] text-slate-900`}
    >
      <body
        className="min-h-full flex flex-col bg-[#f8fafc] text-slate-900 font-sans"
        style={{ colorScheme: "light" }}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
