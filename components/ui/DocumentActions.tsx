"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import { Download, Send, Mail, MessageCircle, Check } from "lucide-react";
import { useApp } from "@/lib/store";
import { leadById } from "@/lib/seed/leads";
import type { Proposal, Invoice } from "@/lib/types";
import {
  printDocument, quotationHtml, invoiceHtml, mailto, whatsapp, proposalMessage, invoiceMessage,
} from "@/lib/documents";

type Doc =
  | { kind: "quotation"; proposal: Proposal }
  | { kind: "invoice"; invoice: Invoice };

export function DocumentActions({ doc, size = "md", leadId }: { doc: Doc; size?: "sm" | "md"; leadId?: string }) {
  const recordSend = useApp((s) => s.recordSend);
  const storeLeads = useApp((s) => s.leads);
  const company = useApp((s) => s.company);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<null | "email" | "whatsapp">(null);

  const lid = leadId ?? (doc.kind === "quotation" ? doc.proposal.leadId : doc.invoice.leadId);
  const lead = storeLeads.find((l) => l.id === lid) ?? leadById(lid);

  function download() {
    if (doc.kind === "quotation") printDocument(quotationHtml(doc.proposal, lead, company), doc.proposal.number.replace(/\//g, "-"));
    else printDocument(invoiceHtml(doc.invoice, lead, company), doc.invoice.number.replace(/\//g, "-"));
  }

  function send(channel: "email" | "whatsapp") {
    const isQ = doc.kind === "quotation";
    const label = isQ ? doc.proposal.number : doc.invoice.number;
    const entityId = isQ ? doc.proposal.id : doc.invoice.id;
    const msg = isQ ? proposalMessage(doc.proposal, lead) : invoiceMessage(doc.invoice, lead);
    const href =
      channel === "email"
        ? mailto({ to: lead?.email, subject: msg.subject, body: msg.body })
        : whatsapp({ phone: lead?.phone, text: `${msg.subject}\n\n${msg.body}` });
    window.open(href, "_blank");
    recordSend(isQ ? "proposal" : "invoice", entityId, label, channel, lid);
    setSent(channel);
    setOpen(false);
    setTimeout(() => setSent(null), 2500);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size={size} onClick={download}>
        <Download size={size === "sm" ? 14 : 16} /> Download PDF
      </Button>
      <div className="relative">
        <Button size={size} onClick={() => setOpen((o) => !o)}>
          {sent ? <Check size={size === "sm" ? 14 : 16} /> : <Send size={size === "sm" ? 14 : 16} />}
          {sent ? `Sent via ${sent === "email" ? "Email" : "WhatsApp"}` : "Send"}
        </Button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] animate-in">
              <div className="border-b border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Send to {lead?.contactName?.split(" ")[0] ?? "client"}
              </div>
              <button onClick={() => send("email")} disabled={!lead?.email}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-[var(--surface-2)] disabled:opacity-40">
                <Mail size={16} className="text-[var(--info)]" /> Email
                {!lead?.email && <span className="ml-auto text-[10px] text-[var(--muted-2)]">no email</span>}
              </button>
              <button onClick={() => send("whatsapp")}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-[var(--surface-2)]">
                <MessageCircle size={16} className="text-[var(--success)]" /> WhatsApp
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
