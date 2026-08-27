"use client";

import { useLayoutEffect } from "react";
import { useTheme } from "@/lib/theme";

// Mounted once from the root layout. The inline <head> script sets data-theme
// before paint on a hard load; this syncs the Zustand store to the saved value
// and re-applies it after React's Strict-Mode remount in dev clears the
// attribute the script set (a no-op in production). Renders nothing.
export function ThemeController() {
  const hydrate = useTheme((s) => s.hydrate);
  useLayoutEffect(() => {
    hydrate();
  }, [hydrate]);
  return null;
}
