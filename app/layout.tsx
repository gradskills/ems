import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import { ThemeController } from "@/components/theme/ThemeController";

// Runs synchronously in <head> before first paint: reads the saved theme
// (light or dark; defaults to light) and stamps it on <html> so there's no
// wrong-theme flash. Kept in sync with lib/theme.ts.
const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("theme");if(p!=="dark")p="light";var d=document.documentElement;d.dataset.theme=p;var m=d.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",p==="dark"?"#0b0f17":"#4f46e5")}catch(e){}})()`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PixelForge Sales OS",
  description: "BDA sales platform — leads, calls, proposals, oversight",
  manifest: "/manifest.webmanifest",
  applicationName: "PixelForge",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PixelForge",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <ThemeController />
        {children}
        <PwaProvider />
      </body>
    </html>
  );
}
