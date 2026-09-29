"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";

// Loads the whole dataset from Supabase into the store once, on first mount.
// Renders nothing. Safe to mount app-wide: hydration is idempotent.
//
// It also re-reads the signed-in person's attendance for today whenever the
// tab / installed app comes back to the foreground, so a clock-in or clock-out
// made on another device shows up instead of a stale "not clocked in".
export function AppDataProvider() {
  useEffect(() => {
    void useApp.getState().hydrateData();
  }, []);

  useEffect(() => {
    let last = 0;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last < 15_000) return; // focus + visibilitychange often fire together
      last = now;
      void useApp.getState().refreshTodayAttendance();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return null;
}
