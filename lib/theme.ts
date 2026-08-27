"use client";

import { create } from "zustand";

// Only two modes are supported: light and dark.
export type Theme = "light" | "dark";

const KEY = "theme";
// Keeps the browser chrome (mobile address bar, PWA title bar) in step with the UI.
const META_COLOR: Record<Theme, string> = { light: "#4f46e5", dark: "#0b0f17" };

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    /* localStorage may be unavailable (private mode / blocked) */
  }
  return "light";
}

// Paint a theme: set it on <html> and sync the browser theme-color meta.
// Mirrors the inline <head> script in app/layout.tsx.
function apply(theme: Theme) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", META_COLOR[theme]);
  }
}

interface ThemeState {
  resolved: Theme;
  hydrated: boolean;
  /** Read the saved theme and paint it. Safe to call repeatedly. */
  hydrate: () => void;
  setTheme: (theme: Theme) => void;
  /** Flip between light and dark. */
  toggle: () => void;
}

export const useTheme = create<ThemeState>((set, get) => ({
  resolved: "light",
  hydrated: false,
  hydrate: () => {
    const theme = readTheme();
    apply(theme);
    set({ resolved: theme, hydrated: true });
  },
  setTheme: (theme) => {
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
    apply(theme);
    set({ resolved: theme });
  },
  toggle: () => get().setTheme(get().resolved === "dark" ? "light" : "dark"),
}));
