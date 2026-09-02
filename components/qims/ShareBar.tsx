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

  const withLink = (body: string) => (link ? `${body}\n\n${link}` : body);
  function send(channel: "email" | "whatsapp") {
    const href = channel === "email"
      ? mailto({ to: contact.email, subject: message.subject, body: withLink(message.body) })
      : whatsapp({ phone: contact.phone, text: withLink(`${message.subject}\n\n${message.body}`) });
    window.open(href, "_blank");
    if (leadId) logDocumentSend(leadId, label, channel);
  }
  function copy() {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <ShareBtn onClick={() => send("whatsapp")} icon={<MessageCircle size={15} />} label="WhatsApp" tone="success" />
      <ShareBtn onClick={() => send("email")} icon={<Mail size={15} />} label="Email" disabled={!contact.email} />
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
