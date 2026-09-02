import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { userToApp } from "@/lib/supabase/map";

// POST /api/login  { loginId, password }
// Verifies the password inside a SECURITY DEFINER db function (app_login) so the
// bcrypt hash is never read out of the database. Returns the safe app user.
export async function POST(req: Request) {
  let body: { loginId?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  const loginId = (body.loginId ?? "").trim();
  const password = body.password ?? "";
  if (!loginId || !password) {
    return NextResponse.json({ ok: false, error: "Enter your login ID and password." }, { status: 400 });
  }

  const sb = getServerSupabase();
  if (!sb) {
    return NextResponse.json({ ok: false, error: "Server is not configured for sign-in." }, { status: 500 });
  }

  const { data, error } = await sb.rpc("app_login", { p_login: loginId, p_password: password });
  if (error) {
    return NextResponse.json({ ok: false, error: "Sign-in is temporarily unavailable." }, { status: 500 });
  }
  const row = data as Record<string, unknown> | null;
  if (!row) {
    // one message for both cases — don't reveal whether the account exists
    return NextResponse.json({ ok: false, error: "Incorrect login ID or password." }, { status: 401 });
  }
  if (String(row.status ?? "active") === "inactive") {
    return NextResponse.json({ ok: false, error: "This account is inactive. Contact your admin." }, { status: 403 });
  }

  const user = userToApp(row);
  return NextResponse.json({ ok: true, user, mustChangePassword: Boolean(row.must_change_password) });
}
