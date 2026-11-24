import type { Metadata, Viewport } from "next";
import {
  DM_Sans,
  Inter,
  JetBrains_Mono,
  Lora,
  Noto_Sans,
  Outfit,
  Source_Code_Pro,
  Vollkorn,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Header from "../components/Header";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const vollkorn = Vollkorn({
  variable: "--font-vollkorn",
  weight: ["500", "600", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  weight: ["400", "500", "600"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
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
