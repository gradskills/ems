"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Modal, Field, Input } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import { inr } from "@/lib/utils";
import type { Invoice } from "@/lib/types";

export function CreateInvoiceModal({ open, onClose, presetLeadId }: { open: boolean; onClose: () => void; presetLeadId?: string }) {
  const leads = useApp((s) => s.leads);
  const invoices = useApp((s) => s.invoices);
  const createInvoice = useApp((s) => s.createInvoice);

  const [leadId, setLeadId] = useState(presetLeadId ?? leads[0]?.id ?? "");
  const [subtotal, setSubtotal] = useState(50000);
  const [milestone, setMilestone] = useState("50% advance");
  const [tds, setTds] = useState<"none" | "194C" | "194J">("194J");
  const [recurring, setRecurring] = useState(false);
  const [dueDays, setDueDays] = useState(15);

  const lead = leads.find((l) => l.id === leadId);
  const calc = useMemo(() => {
    const gst = Math.round(subtotal * 0.18);
    const total = subtotal + gst;
    const tdsAmount = tds === "none" ? 0 : Math.round(subtotal * (tds === "194C" ? 0.02 : 0.1));
    return { gst, total, tdsAmount, net: total - tdsAmount };
  }, [subtotal, tds]);

  function save() {
    if (!lead || subtotal <= 0) return;
    const num = `INV/2025-26/${String(9 + invoices.length).padStart(4, "0")}`;
    const now = new Date();
    const due = new Date(now.getTime() + dueDays * 86400000);
    const inv: Omit<Invoice, "id"> = {
      number: num,
      leadId: lead.id,
      company: lead.company,
      issuedAt: now.toISOString(),
      dueAt: due.toISOString(),
      status: "draft",
      subtotal,
      gst: calc.gst,
      tdsSection: tds === "none" ? undefined : tds,
      tdsAmount: calc.tdsAmount,
      total: calc.total,
      received: 0,
      milestone,
      recurring,
    };
    createInvoice(inv);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create invoice"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!lead || subtotal <= 0} onClick={save}>Create invoice</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Client">
          <select value={leadId} onChange={(e) => setLeadId(e.target.value)}
            className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
            {leads.map((l) => <option key={l.id} value={l.id}>{l.company}</option>)}
          </select>
        </Field>
        <Field label="Milestone / description"><Input value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder="50% advance (website)" /></Field>
        <Field label="Amount (subtotal, ₹)"><Input type="number" value={subtotal} onChange={(e) => setSubtotal(+e.target.value)} /></Field>
        <Field label="Due in (days)"><Input type="number" value={dueDays} onChange={(e) => setDueDays(+e.target.value)} /></Field>
        <Field label="TDS deduction">
          <select value={tds} onChange={(e) => setTds(e.target.value as typeof tds)}
            className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
            <option value="194J">194J — Professional (10%)</option>
            <option value="194C">194C — Contract (2%)</option>
            <option value="none">No TDS</option>
          </select>
        </Field>
        <Field label="Recurring (retainer)">
          <label className="flex h-10 items-center gap-2 text-sm">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="h-4 w-4" />
            Bill this every month
          </label>
        </Field>
      </div>

      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
        <Row label="Subtotal" value={inr(subtotal)} />
        <Row label="GST @ 18%" value={inr(calc.gst)} />
        <Row label="Invoice total" value={inr(calc.total)} strong />
        {calc.tdsAmount > 0 && <Row label={`Less TDS (${tds})`} value={`− ${inr(calc.tdsAmount)}`} />}
        {calc.tdsAmount > 0 && <Row label="Net receivable" value={inr(calc.net)} strong accent />}
      </div>
    </Modal>
  );
}

function Row({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-0.5 ${strong ? "border-t border-[var(--border)] pt-1 font-semibold" : ""}`}>
      <span className="text-[var(--muted)]">{label}</span>
      <span style={accent ? { color: "var(--success)" } : undefined}>{value}</span>
    </div>
  );
}
