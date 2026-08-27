"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";

/**
 * Theme switcher — a single button that flips between Light and Dark. The icon
 * shows the theme you'll switch TO (moon while light, sun while dark). Used in
 * the app top bar and on the login screen.
 */
export function ThemeToggle() {
  const resolved = useTheme((s) => s.resolved);
  const toggle = useTheme((s) => s.toggle);
  const isDark = resolved === "dark";

  return (
    <button
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
