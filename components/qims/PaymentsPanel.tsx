"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { Badge, Button } from "@/components/ui/primitives";
import { Input } from "@/components/ui/modal";
import { LogPaymentModal } from "@/components/qims/LogPaymentModal";
import { printDocument, receiptHtml, whatsapp, mailto, receiptMessage } from "@/lib/documents";
import type { Lead, Milestone } from "@/lib/types";
import { inr, formatDate } from "@/lib/utils";
import { Plus, Wallet, Download, Send, Trash2, Check } from "lucide-react";

const MODE_LABEL: Record<string, string> = { cash: "Cash", upi: "UPI", cheque: "Cheque", netbanking: "Netbanking", card: "Card", bank_transfer: "Bank transfer" };

export function PaymentsPanel({ lead, invoiceId }: { lead: Lead; invoiceId?: string }) {
  const milestones = useApp((s) => s.milestones).filter((m) => m.leadId === lead.id);
  const payments = useApp((s) => s.payments).filter((p) => p.leadId === lead.id);
  const company = useApp((s) => s.company);
  const addMilestones = useApp((s) => s.addMilestones);
  const deleteMilestone = useApp((s) => s.deleteMilestone);

  const [payFor, setPayFor] = useState<{ open: boolean; milestone?: Milestone }>({ open: false });
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState(0);

  const totalPlanned = milestones.reduce((s, m) => s + m.amount, 0);
  const collected = payments.reduce((s, p) => s + p.amount, 0);

  function addOne() {
    if (!label.trim() || amount <= 0) return;
    addMilestones(lead.id, [{ label: label.trim(), amount }]);
    setLabel(""); setAmount(0); setAdding(false);
  }
  function quickSplit() {
    const base = lead.estimatedValue || 0;
    addMilestones(lead.id, [
      { label: "Project kickoff (50%)", amount: Math.round(base * 0.5) },
      { label: "Delivery (50%)", amount: Math.round(base * 0.5) },
    ]);
  }
  function downloadReceipt(receiptNumber: string) {
    const p = payments.find((x) => x.receiptNumber === receiptNumber);
    if (p) printDocument(receiptHtml(p, company), p.receiptNumber.replace(/\//g, "-"));
  }
  function sendReceipt(receiptNumber: string) {
    const p = payments.find((x) => x.receiptNumber === receiptNumber);
    if (!p) return;
    const msg = receiptMessage(p);
    window.open(lead.email ? mailto({ to: lead.email, subject: msg.subject, body: msg.body }) : whatsapp({ phone: lead.phone, text: `${msg.subject}\n\n${msg.body}` }), "_blank");
  }

  return (
    <div className="space-y-4">
      {/* Milestones */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold"><Wallet size={15} /> Payment milestones</h4>
          <div className="flex gap-1.5">
            {milestones.length === 0 && <Button size="sm" variant="ghost" onClick={quickSplit}>50 / 50</Button>}
            <Button size="sm" variant="outline" onClick={() => setAdding((a) => !a)}><Plus size={13} /> Milestone</Button>
          </div>
        </div>

        {adding && (
          <div className="mb-2 flex flex-wrap items-end gap-2 rounded-lg bg-[var(--surface-2)] p-2">
            <div className="flex-1"><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Milestone label (e.g. Advance)" /></div>
            <div className="w-32"><Input type="number" value={amount} onChange={(e) => setAmount(+e.target.value)} placeholder="Amount" /></div>
            <Button size="sm" onClick={addOne} disabled={!label.trim() || amount <= 0}><Check size={14} /></Button>
          </div>
        )}

        {milestones.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">No milestones yet. Split the deal value into stages, then log a payment per milestone.</p>
        ) : (
          <div className="space-y-1.5">
            {milestones.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.label}</div>
                  <div className="text-[11px] text-[var(--muted-2)]">{inr(m.amount)}{m.paidAt ? ` · paid ${formatDate(m.paidAt)}` : ""}</div>
                </div>
                {m.status === "paid" ? (
                  <Badge color="success" dot>Paid</Badge>
                ) : (
                  <>
                    <Button size="sm" onClick={() => setPayFor({ open: true, milestone: m })}><Wallet size={13} /> Log</Button>
                    <button onClick={() => deleteMilestone(m.id)} className="rounded-md p-1.5 text-[var(--muted-2)] hover:text-[var(--danger)]"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            ))}
            <div className="flex justify-between px-1 pt-1 text-xs text-[var(--muted)]">
              <span>Planned: <strong className="text-[var(--foreground)]">{inr(totalPlanned)}</strong></span>
              <span>Collected: <strong className="text-[var(--success)]">{inr(collected)}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Log ad-hoc payment */}
      <Button variant="outline" className="w-full" onClick={() => setPayFor({ open: true })}><Wallet size={15} /> Log a payment received</Button>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <h4 className="mb-2 text-sm font-semibold">Receipts</h4>
          <div className="space-y-1.5">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{p.receiptNumber}</div>
                  <div className="text-[11px] text-[var(--muted-2)]">{inr(p.amount)} · {MODE_LABEL[p.mode]}{p.reference ? ` (${p.reference})` : ""} · {formatDate(p.at)}</div>
                </div>
                <button onClick={() => downloadReceipt(p.receiptNumber)} title="Download receipt" className="rounded-md p-1.5 text-[var(--muted-2)] hover:text-[var(--primary)]"><Download size={15} /></button>
                <button onClick={() => sendReceipt(p.receiptNumber)} title="Send receipt" className="rounded-md p-1.5 text-[var(--muted-2)] hover:text-[var(--primary)]"><Send size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {payFor.open && <LogPaymentModal open={payFor.open} onClose={() => setPayFor({ open: false })} lead={lead} invoiceId={invoiceId} milestone={payFor.milestone} />}
    </div>
  );
}
