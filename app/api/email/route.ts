import { NextResponse } from "next/server";
import { sendEmail, type EmailAttachment } from "@/lib/email/send";

// POST /api/email — send an email through Resend (server-side).
// Body: { to, subject, html?, text?, replyTo?, attachments? }.
//
// NOTE (prototype tradeoff): like the rest of this app there is no server-side
// session, so this endpoint is callable by anyone who can reach it. Fine for the
// prototype; before production, gate it behind an authenticated session so it
// can't be used as an open relay.
export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  const to = b.to as string | string[] | undefined;
  const subject = String(b.subject ?? "").trim();
  if (!to || (Array.isArray(to) && !to.length) || !subject) {
    return NextResponse.json({ ok: false, error: "Missing recipient or subject." }, { status: 400 });
  }

  const attachments = Array.isArray(b.attachments) ? (b.attachments as EmailAttachment[]) : undefined;

  const result = await sendEmail({
    to,
    subject,
    html: typeof b.html === "string" ? b.html : undefined,
    text: typeof b.text === "string" ? b.text : undefined,
    replyTo: typeof b.replyTo === "string" ? b.replyTo : undefined,
    attachments,
  });

  // 503 when email simply isn't configured, so callers can fall back gracefully.
  const status = result.ok ? 200 : result.skipped ? 503 : 500;
  return NextResponse.json(result, { status });
}
