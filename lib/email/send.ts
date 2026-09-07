import "server-only";

// ─────────────────────────────────────────────────────────────
// Server-side email sender (Resend REST API, no SDK dependency).
//
// Configure with two env vars in .env.local:
//   RESEND_API_KEY=re_xxx           ← from https://resend.com/api-keys
//   EMAIL_FROM=Gradskills EMS <hello@yourdomain.com>
//
// Until a domain is verified in Resend, EMAIL_FROM must stay the sandbox
// sender "onboarding@resend.dev", which can ONLY deliver to the Resend
// account owner's own email. Verify a domain (e.g. gradskills.in) to send to
// real employees/clients.
//
// If RESEND_API_KEY is missing, every send is a graceful no-op ({skipped:true})
// so the app keeps working without email configured.
// ─────────────────────────────────────────────────────────────

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "Gradskills EMS <onboarding@resend.dev>";

export interface EmailAttachment {
  filename: string;
  /** base64-encoded file content */
  content: string;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
  /** true when email isn't configured — the call was a no-op, not a failure */
  skipped?: boolean;
}

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;

  if (!key) {
    console.warn(`[email] RESEND_API_KEY not set — skipped: "${input.subject}"`);
    return { ok: false, skipped: true, error: "Email not configured (RESEND_API_KEY missing)." };
  }

  const recipients = (Array.isArray(input.to) ? input.to : [input.to])
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  if (!recipients.length) return { ok: false, error: "No recipient address." };
  if (!input.html && !input.text) return { ok: false, error: "Email has no body." };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo,
        attachments: input.attachments,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) {
      const msg = data?.message || data?.name || `Resend error ${res.status}`;
      console.warn("[email] send failed:", msg);
      return { ok: false, error: String(msg) };
    }
    return { ok: true, id: data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Email send failed.";
    console.warn("[email] send threw:", msg);
    return { ok: false, error: msg };
  }
}

// ── tiny branded HTML wrapper for plain-text messages ──
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Wraps a plain-text body (newlines preserved) in a simple, email-safe layout. */
export function renderEmailHtml(opts: { heading?: string; body: string; footer?: string }): string {
  const bodyHtml = esc(opts.body).replace(/\n/g, "<br>");
  return `<!doctype html><html><body style="margin:0;background:#f4f5f7;padding:24px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1b2330">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,.08)">
    <div style="background:#111;padding:18px 24px"><span style="font-size:18px;font-weight:800;color:#fff">Gradskills</span><span style="color:#F5B301;font-weight:800"> EMS</span></div>
    <div style="padding:24px">
      ${opts.heading ? `<h1 style="font-size:19px;margin:0 0 14px">${esc(opts.heading)}</h1>` : ""}
      <div style="font-size:14px;line-height:1.7;color:#333">${bodyHtml}</div>
    </div>
    <div style="padding:14px 24px;border-top:1px solid #eee;font-size:12px;color:#98a2b3">${opts.footer ? esc(opts.footer) : "This is an automated message from Gradskills EMS."}</div>
  </div>
</body></html>`;
}
