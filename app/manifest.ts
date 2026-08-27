import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PixelForge Sales OS · HR",
    short_name: "PixelForge",
    description: "Employee management, attendance, quotations & invoices for PixelForge.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Clock in / out", short_name: "Clock", url: "/clock" },
      { name: "My dashboard", short_name: "My", url: "/my" },
    ],
  };
}
