"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { printDocument, mailto, whatsapp } from "@/lib/documents";
import { MessageCircle, Mail, Link2, Download, Check } from "lucide-react";

// The four ways a BDA hands a document to a client: WhatsApp, Email, a shareable
// link, and a PDF download. Shown right where "Send to client" is pressed.
export function ShareBar({
  link, message, contact, baseHtml, filename, label, leadId,
}: {
  link: string;
  message: { subject: string; body: string };
  contact: { email?: string; phone?: string };
  baseHtml: string;
  filename: string;
  label: string;
  leadId: string;
}) {
  const logDocumentSend = useApp((s) => s.logDocumentSend);
  const [copied, setCopied] = useState(false);
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const withLink = (body: string) => (link ? `${body}\n\n${link}` : body);

  // UTF-8-safe base64 for the attached HTML document.
  function toBase64(s: string) {
    return btoa(unescape(encodeURIComponent(s)));
  }

  function openMailto() {
    window.open(mailto({ to: contact.email, subject: message.subject, body: withLink(message.body) }), "_blank");
  }

  async function sendEmail() {
    if (!contact.email) return;
    setEmailState("sending");
    const bodyText = withLink(message.body);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: contact.email,
          subject: message.subject,
          text: bodyText,
          html: `<div style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#1b2330">${bodyText
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</div>`,
          attachments: baseHtml ? [{ filename: `${filename}.html`, content: toBase64(baseHtml) }] : undefined,
        }),
      });
      if (res.ok) {
        setEmailState("sent");
        if (leadId) logDocumentSend(leadId, label, "email");
        setTimeout(() => setEmailState("idle"), 2500);
        return;
      }
      // 503 = email not configured on the server → fall back to the mail client.
      if (res.status === 503) {
        openMailto();
        if (leadId) logDocumentSend(leadId, label, "email");
        setEmailState("idle");
        return;
      }
      setEmailState("error");
      setTimeout(() => setEmailState("idle"), 3000);
    } catch {
      // network error → fall back to the mail client so the user isn't stuck.
      openMailto();
      setEmailState("idle");
    }
  }

  function sendWhatsapp() {
    window.open(whatsapp({ phone: contact.phone, text: withLink(`${message.subject}\n\n${message.body}`) }), "_blank");
    if (leadId) logDocumentSend(leadId, label, "whatsapp");
  }

  const emailLabel = emailState === "sending" ? "Sending…" : emailState === "sent" ? "Sent" : emailState === "error" ? "Failed" : "Email";
  function copy() {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <ShareBtn onClick={sendWhatsapp} icon={<MessageCircle size={15} />} label="WhatsApp" tone="success" />
      <ShareBtn onClick={sendEmail} icon={emailState === "sent" ? <Check size={15} /> : <Mail size={15} />} label={emailLabel} disabled={!contact.email || emailState === "sending"} />
      <ShareBtn onClick={copy} icon={copied ? <Check size={15} /> : <Link2 size={15} />} label={copied ? "Copied" : "Copy link"} disabled={!link} />
      <ShareBtn onClick={() => printDocument(baseHtml, filename)} icon={<Download size={15} />} label="Download" />
    </div>
  );
}

function ShareBtn({ onClick, icon, label, disabled, tone }: { onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean; tone?: "success" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors disabled:opacity-40 ${
        tone === "success"
          ? "border-[var(--success)] text-[var(--success)] hover:bg-[var(--success-soft)]"
          : "border-[var(--border-strong)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
      }`}
    >
      {icon}{label}
    </button>
  );
}
