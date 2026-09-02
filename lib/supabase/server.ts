import "server-only";

// Server-side Supabase client. Prefers the service-role key when present;
// otherwise falls back to the anon key (the app's tables have RLS disabled, so
// the anon role can still read them server-side). Used by API routes only —
// never import this from a client component.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _server: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient | null {
  if (!url || !key) return null;
  if (!_server) _server = createClient(url, key, { auth: { persistSession: false } });
  return _server;
}
