import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import Header from "../components/Header";
import "./globals.css";

const inter = localFont({
  src: "./fonts/inter.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
  preload: false,
});

const notoSans = localFont({
  src: "./fonts/notosans.woff2",
  variable: "--font-noto-sans",
  weight: "400 700",
  display: "swap",
  preload: false,
});

const dmSans = localFont({
  src: "./fonts/dmsans.woff2",
  variable: "--font-dm-sans",
  weight: "400 700",
  display: "swap",
});

const vollkorn = localFont({
  src: "./fonts/vollkorn.woff2",
  variable: "--font-vollkorn",
  weight: "500 700",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const sourceCodePro = localFont({
  src: "./fonts/sourcecodepro.woff2",
  variable: "--font-source-code-pro",
  weight: "400 600",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
});

const lora = localFont({
  src: "./fonts/lora.woff2",
  variable: "--font-lora",
  weight: "400 700",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  preload: false,
});

const outfit = localFont({
  src: "./fonts/outfit.woff2",
  variable: "--font-outfit",
  weight: "100 900",
  display: "swap",
  preload: false,
});

const jetbrainsMono = localFont({
  src: "./fonts/jetbrainsmono.woff2",
  variable: "--font-jetbrains-mono",
  weight: "100 800",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "YTÜ Dostun",
  description: "YTÜ'lülerin yeni nesil ders ve not yönetim portalı.",
  metadataBase: new URL("https://ytudostun.com"),
  openGraph: {
    title: "YTÜ Dostun",
    description: "YTÜ'lülerin yeni nesil ders ve not yönetim portalı.",
    url: "https://ytudostun.com",
    siteName: "YTÜ Dostun",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "YTÜ Dostun — Ders ve Not Yönetim Portalı",
      },
    ],
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "YTÜ Dostun",
    description: "YTÜ'lülerin yeni nesil ders ve not yönetim portalı.",
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
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInitScript = `(function(){try{var t=localStorage.getItem('ytudostun_theme_v1');var ok=t==='nordic-yellow'||t==='campuskit'||t==='classic';document.documentElement.setAttribute('data-theme',ok?t:'campuskit');}catch(e){document.documentElement.setAttribute('data-theme','campuskit');}})();`;

  return (
    <html
      lang="tr"
      data-theme="campuskit"
      suppressHydrationWarning
      className={`${inter.variable} ${notoSans.variable} ${dmSans.variable} ${vollkorn.variable} ${sourceCodePro.variable} ${lora.variable} ${outfit.variable} ${jetbrainsMono.variable} font-sans h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <Header />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
