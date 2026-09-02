"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";

// Loads the whole dataset from Supabase into the store once, on first mount.
// Renders nothing. Safe to mount app-wide: hydration is idempotent and only
// seeds tables that are still empty.
export function AppDataProvider() {
  useEffect(() => {
    void useApp.getState().hydrateData();
  }, []);
  return null;
}
