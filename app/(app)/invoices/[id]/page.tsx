"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { useApp } from "@/lib/store";
import { Card, Button, Badge } from "@/components/ui/primitives";
import { Field, Input } from "@/components/ui/modal";
import { DocPreview } from "@/components/qims/DocPreview";
import { invoiceStatusColor } from "@/lib/qims";
import { invoiceHtml, invoiceMessage } from "@/lib/documents";
import { renderDesignHtml } from "@/lib/design";
import type { Design, InvoiceStatus } from "@/lib/types";
import { inr, formatDate } from "@/lib/utils";
import { ChevronLeft, Save, Check, IndianRupee } from "lucide-react";

const STATUSES: InvoiceStatus[] = ["draft", "issued", "sent", "partially_paid", "paid", "overdue"];

export default function InvoiceDocPage() {
  const params = useParams<{ id: string }>();
  const invoices = useApp((s) => s.invoices);
  const leads = useApp((s) => s.leads);
  const company = useApp((s) => s.company);
  const docDesigns = useApp((s) => s.docDesigns);
  const updateInvoice = useApp((s) => s.updateInvoice);

  const iv = invoices.find((x) => x.id === params.id);
  const [milestone, setMilestone] = useState(iv?.milestone ?? "");
  const [subtotal, setSubtotal] = useState(iv?.subtotal ?? 0);
  const [gst, setGst] = useState(iv?.gst ?? 0);
  const [due, setDue] = useState(iv?.dueAt.slice(0, 10) ?? "");
  const [status, setStatus] = useState<InvoiceStatus>(iv?.status ?? "issued");
  const [pay, setPay] = useState("");
  const [saved, setSaved] = useState(false);

  if (!iv) return notFound();
  const lead = leads.find((l) => l.id === iv.leadId);
  const balance = iv.total - iv.received - iv.tdsAmount;

  // preview reflects UNSAVED edits so the user sees what will be sent
  const previewInvoice = { ...iv, milestone, subtotal, gst, total: subtotal + gst, dueAt: due ? new Date(due).toISOString() : iv.dueAt, status };
  const savedDesign = docDesigns[`invoice:${iv.id}`];
  let baseHtml = "";
  try { baseHtml = savedDesign ? renderDesignHtml(JSON.parse(savedDesign) as Design, { embed: true }) : invoiceHtml(previewInvoice, lead, company, { embed: true }); } catch { baseHtml = invoiceHtml(previewInvoice, lead, company, { embed: true }); }

  function save() { updateInvoice(iv!.id, { milestone, subtotal, gst, total: subtotal + gst, dueAt: due ? new Date(due).toISOString() : iv!.dueAt, status }); setSaved(true); setTimeout(() => setSaved(false), 1600); }
  function recordPayment() {
    const amt = Number(pay); if (!amt) return;
    const received = iv!.received + amt;
    const fullyPaid = received + iv!.tdsAmount >= iv!.total;
    updateInvoice(iv!.id, { received, status: fullyPaid ? "paid" : "partially_paid" });
    setStatus(fullyPaid ? "paid" : "partially_paid");
    setPay("");
  }

  return (
    <div className="space-y-4">
      <Link href="/invoices" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"><ChevronLeft size={16} /> Invoices</Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{iv.company} <span className="text-[var(--muted-2)]">· {iv.number}</span></h1>
          <p className="text-sm text-[var(--muted)]">Tax Invoice · issued {formatDate(iv.issuedAt)}</p>
        </div>
        <Badge color={invoiceStatusColor[iv.status]} dot>{iv.status.replace("_", " ")}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        {/* LEFT — editor */}
        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold">Invoice content</h3>
            <div className="space-y-3">
              <Field label="Description / milestone"><Input value={milestone} onChange={(e) => setMilestone(e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Subtotal (₹)"><Input type="number" value={subtotal} onChange={(e) => setSubtotal(+e.target.value)} /></Field>
                <Field label="GST (₹)"><Input type="number" value={gst} onChange={(e) => setGst(+e.target.value)} /></Field>
              </div>
              <Field label="Due date"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
              <Field label="Status">
                <select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm capitalize">
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </Field>
              <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm">
                <div className="flex justify-between"><span className="text-[var(--muted)]">Total</span><span className="font-bold">{inr(subtotal + gst)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">Received</span><span className="text-[var(--success)]">{inr(iv.received)}</span></div>
                <div className="flex justify-between font-semibold"><span>Balance due</span><span>{inr(balance)}</span></div>
              </div>
            </div>
            <Button className="mt-3 w-full" onClick={save}>{saved ? <><Check size={15} /> Saved</> : <><Save size={15} /> Save changes</>}</Button>
          </Card>

          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold">Record a payment</h3>
            <div className="flex items-center gap-2">
              <div className="relative flex-1"><IndianRupee size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" /><Input value={pay} onChange={(e) => setPay(e.target.value)} placeholder="Amount received" className="h-9 pl-7" type="number" /></div>
              <Button size="sm" variant="secondary" onClick={recordPayment} disabled={!pay}>Add</Button>
            </div>
          </Card>
        </div>

        {/* RIGHT — actual document */}
        <div>
          <div className="mb-2 text-xs font-medium text-[var(--muted)]">Preview — this is exactly what the client receives</div>
          <DocPreview
            docKey={`invoice:${iv.id}`}
            baseHtml={baseHtml}
            filename={iv.number.replace(/\//g, "-")}
            label="Invoice"
            message={invoiceMessage(iv, lead)}
            contact={{ email: lead?.email, phone: lead?.phone }}
          />
        </div>
      </div>
    </div>
  );
}
