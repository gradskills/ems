"use client";

// Browser Supabase client (singleton). Uses the publishable anon key, which is
// safe to ship to the browser. NOTE: the app's tables currently have RLS
// disabled, so the anon key can read/write every row — acceptable for this
// internal prototype, but see docs/SUPABASE.md for the follow-up to lock it down.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _client: SupabaseClient | null = null;

/** Returns the shared browser client, or null if env vars are missing. */
export function getSupabase(): SupabaseClient | null {
  if (!url || !anon) return null;
  if (!_client) {
    _client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

/** True when Supabase env vars are configured. */
export const supabaseConfigured = Boolean(url && anon);
