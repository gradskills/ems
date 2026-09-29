import { NextResponse } from "next/server";
import { runProspectAudit } from "@/lib/audit/scan";
import { BlockedUrlError } from "@/lib/audit/safe-fetch";

// POST /api/prospect-audit — live scan of a prospect's public footprint.
// Body: { company: string (name or URL), website?, city?, instagram? }.
//
// NOTE (prototype tradeoff): like the other API routes there is no server-side
// session, so this is reachable by anyone. The scanner refuses private/internal
// addresses, and a small per-IP limit stops it being used as a free crawler.
export const maxDuration = 30;

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // keep the map bounded
  return recent.length > MAX_PER_WINDOW;
}

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "Too many audits in a minute — try again shortly." }, { status: 429 });
  }

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const company = str(b.company, 200);
  if (!company) return NextResponse.json({ ok: false, error: "Enter a company name or website." }, { status: 400 });

  try {
    const result = await runProspectAudit({
      company,
      website: str(b.website),
      city: str(b.city, 100),
      instagram: str(b.instagram, 100),
    });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    if (e instanceof BlockedUrlError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    console.error("[prospect-audit]", e);
    return NextResponse.json({ ok: false, error: "The audit failed — please try again." }, { status: 500 });
  }
}
