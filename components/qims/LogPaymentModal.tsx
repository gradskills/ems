"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { Modal, Field, Input, Textarea } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import { printDocument, receiptHtml, whatsapp, mailto, receiptMessage } from "@/lib/documents";
import type { PaymentMode, Lead, Milestone } from "@/lib/types";
import { inr } from "@/lib/utils";
import { Check, Download, Mail, MessageCircle, Wallet } from "lucide-react";

const MODES: { v: PaymentMode; label: string }[] = [
  { v: "cash", label: "Cash" }, { v: "upi", label: "UPI" }, { v: "cheque", label: "Cheque" },
  { v: "netbanking", label: "Netbanking" }, { v: "card", label: "Card" }, { v: "bank_transfer", label: "Bank transfer" },
];

export function LogPaymentModal({
  open, onClose, lead, invoiceId, milestone,
}: { open: boolean; onClose: () => void; lead: Lead; invoiceId?: string; milestone?: Milestone }) {
  const logPayment = useApp((s) => s.logPayment);
  const company = useApp((s) => s.company);
  const payments = useApp((s) => s.payments);

  const [amount, setAmount] = useState(milestone?.amount ?? 0);
  const [mode, setMode] = useState<PaymentMode>("upi");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState(milestone ? `Milestone: ${milestone.label}` : "Project payment");
  const [receiptNo, setReceiptNo] = useState<string | null>(null);

  const receipt = receiptNo ? payments.find((p) => p.receiptNumber === receiptNo) : undefined;

  function submit() {
    if (amount <= 0) return;
    const rn = logPayment({
      leadId: lead.id, invoiceId, milestoneId: milestone?.id,
      company: lead.company, contactName: lead.contactName, amount, mode, reference: reference || undefined, note: note || undefined,
    });
    setReceiptNo(rn);
  }

  function downloadReceipt() { if (receipt) printDocument(receiptHtml(receipt, company), receipt.receiptNumber.replace(/\//g, "-")); }
  function sendReceipt(channel: "email" | "whatsapp") {
    if (!receipt) return;
    const msg = receiptMessage(receipt);
    const href = channel === "email" ? mailto({ to: lead.email, subject: msg.subject, body: msg.body }) : whatsapp({ phone: lead.phone, text: `${msg.subject}\n\n${msg.body}` });
    window.open(href, "_blank");
  }

  function close() { setReceiptNo(null); setReference(""); onClose(); }

  return (
    <Modal
      open={open}
      onClose={close}
      title={receiptNo ? "Payment logged" : "Log payment received"}
      footer={
        receiptNo ? <Button onClick={close}>Done</Button>
          : <><Button variant="ghost" onClick={close}>Cancel</Button><Button onClick={submit} disabled={amount <= 0}><Wallet size={15} /> Log payment</Button></>
      }
    >
      {receiptNo ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]"><Check size={26} /></div>
            <div className="text-lg font-semibold">{inr(amount)} received</div>
            <p className="text-sm text-[var(--muted)]">Receipt <strong>{receiptNo}</strong> generated for {lead.company}.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={downloadReceipt}><Download size={15} /> Download receipt</Button>
            <Button variant="outline" onClick={() => sendReceipt("email")} disabled={!lead.email}><Mail size={15} /> Email</Button>
            <Button variant="outline" onClick={() => sendReceipt("whatsapp")}><MessageCircle size={15} /> WhatsApp</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {milestone && <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">For milestone: <strong className="text-[var(--foreground)]">{milestone.label}</strong></div>}
          <Field label="Amount received (₹)"><Input type="number" value={amount} onChange={(e) => setAmount(+e.target.value)} autoFocus /></Field>
          <Field label="Mode of payment">
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <button key={m.v} type="button" onClick={() => setMode(m.v)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${mode === m.v ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border-strong)] text-[var(--muted)] hover:bg-[var(--surface-2)]"}`}>{m.label}</button>
              ))}
            </div>
          </Field>
          {(mode === "cheque" || mode === "upi" || mode === "netbanking" || mode === "bank_transfer") && (
            <Field label={mode === "cheque" ? "Cheque number" : "Reference / txn ID"}><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={mode === "cheque" ? "e.g. 004512" : "e.g. UPI txn ref"} /></Field>
          )}
          <Field label="Note (appears on receipt)"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
      )}
    </Modal>
  );
}
