import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

// POST /api/change-password { userId, current, next }
// Verifies + updates the password inside a SECURITY DEFINER db function
// (app_change_password); the bcrypt hash never leaves the database.
export async function POST(req: Request) {
  let b: { userId?: string; current?: string; next?: string };
  try { b = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 }); }

  const userId = String(b.userId ?? "");
  const current = b.current ?? "";
  const next = b.next ?? "";
  if (!/^\d+$/.test(userId)) return NextResponse.json({ ok: false, error: "Unknown account." }, { status: 400 });
  if (next.length < 6) return NextResponse.json({ ok: false, error: "New password must be at least 6 characters." }, { status: 400 });
  if (next === current) return NextResponse.json({ ok: false, error: "New password must be different." }, { status: 400 });

  const sb = getServerSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: "Server not configured." }, { status: 500 });

  const { data, error } = await sb.rpc("app_change_password", {
    p_user_id: Number(userId), p_current: current, p_new: next,
  });
  if (error) return NextResponse.json({ ok: false, error: "Temporarily unavailable." }, { status: 500 });
  if (data !== true) return NextResponse.json({ ok: false, error: "Current password is incorrect." }, { status: 401 });

  return NextResponse.json({ ok: true });
}
