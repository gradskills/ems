"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { leadById } from "@/lib/seed/leads";
import { servicePackages } from "@/lib/seed/users";
import { CanvasEditor } from "@/components/design/CanvasEditor";
import { starterDesign, renderDesignHtml } from "@/lib/design";
import { printDocument } from "@/lib/documents";
import { proposalTotals } from "@/lib/qims";
import { inr, formatDate } from "@/lib/utils";
import type { Design, DocType } from "@/lib/types";
import { Button } from "@/components/ui/primitives";

const TYPE_LABEL: Record<DocType, string> = { quotation: "Quotation", invoice: "Invoice", receipt: "Receipt", audit: "Audit Report" };
const isType = (s: string): s is DocType => ["quotation", "invoice", "receipt", "audit"].includes(s);

export default function StudioPage() {
  const params = useParams<{ key: string }>();
  const raw = decodeURIComponent(params.key);
  const parts = raw.split("~");
  const isTemplate = parts[0] === "tpl";
  const type = (isTemplate ? parts[1] : parts[0]) as string;
  const id = isTemplate ? "" : parts.slice(1).join("~");
  const docKey = `${type}:${id}`;

  const company = useApp((s) => s.company);
  const proposals = useApp((s) => s.proposals);
  const invoices = useApp((s) => s.invoices);
  const payments = useApp((s) => s.payments);
  const auditReports = useApp((s) => s.auditReports);
  const leadsStore = useApp((s) => s.leads);
  const templateDesigns = useApp((s) => s.templateDesigns);
  const docDesigns = useApp((s) => s.docDesigns);
  const saveTemplateDesign = useApp((s) => s.saveTemplateDesign);
  const resetTemplateDesign = useApp((s) => s.resetTemplateDesign);
  const saveDocDesign = useApp((s) => s.saveDocDesign);
  const resetDocDesign = useApp((s) => s.resetDocDesign);
  const [resetKey, setResetKey] = useState(0);

  const fields = useMemo(() => {
    if (!isType(type)) return {};
    if (isTemplate) return placeholderFields(type);
    if (type === "quotation") {
      const p = proposals.find((x) => x.id === id); if (!p) return placeholderFields(type);
      const lead = leadsStore.find((l) => l.id === p.leadId) ?? leadById(p.leadId);
      const t = proposalTotals(p.items);
      return {
        number: p.number, date: formatDate(p.createdAt), projectCost: inr(t.total),
        customerName: lead?.contactName ?? "", customerCompany: lead?.company ?? "",
        itemsText: p.items.map((it) => `${it.name}    ${inr(it.qty * it.unitPrice * (1 - it.discountPct / 100))}`).join("\n"),
        grandTotal: inr(t.total),
      };
    }
    if (type === "invoice") {
      const iv = invoices.find((x) => x.id === id); if (!iv) return placeholderFields(type);
      const lead = leadsStore.find((l) => l.id === iv.leadId) ?? leadById(iv.leadId);
      return {
        number: iv.number, date: formatDate(iv.issuedAt), dueDate: formatDate(iv.dueAt), totalDue: inr(iv.total - iv.received),
        customerName: lead?.contactName ?? iv.company, customerCompany: iv.company, customerEmail: lead?.email ?? "", customerPhone: lead?.phone ?? "",
        status: iv.status.replace("_", " ").toUpperCase(), itemsText: iv.milestone ?? "Professional services",
        subtotal: inr(iv.subtotal), tax: inr(iv.gst), grandTotal: inr(iv.total),
      };
    }
    if (type === "receipt") {
      const pay = payments.find((x) => x.id === id || x.receiptNumber === id); if (!pay) return placeholderFields(type);
      return {
        number: pay.receiptNumber, date: formatDate(pay.at), customerName: pay.contactName ?? "", customerCompany: pay.company,
        paymentMethod: pay.mode.toUpperCase() + (pay.reference ? ` (${pay.reference})` : ""), itemName: pay.note ?? "Payment received", amount: inr(pay.amount),
      };
    }
    // audit
    const r = auditReports.find((x) => x.id === id); if (!r) return placeholderFields(type as DocType);
    return { company: r.company, date: formatDate(r.createdAt), overallScore: String(r.overallScore ?? r.score), summary: r.summary, takeaway: r.takeaway ?? "" };
  }, [type, id, isTemplate, proposals, invoices, payments, auditReports, leadsStore]);

  if (!isType(type)) return <div className="p-10 text-center text-sm text-[var(--muted)]">Unknown document type.</div>;

  const stored = isTemplate ? templateDesigns[type] : (docDesigns[docKey] ? (JSON.parse(docDesigns[docKey]) as Design) : undefined);
  const initial: Design = stored ?? starterDesign(type, company, fields);

  const title = isTemplate ? `${TYPE_LABEL[type]} — master template` : `Edit ${TYPE_LABEL[type]} ${id}`;
  const back = isTemplate ? "/settings" : "/leads";

  function save(d: Design) { if (isTemplate) saveTemplateDesign(type as DocType, d); else saveDocDesign(docKey, d); }
  function download(d: Design) { printDocument(renderDesignHtml(d, { title }), `${type}-${id || "template"}`); }
  function reset() {
    if (isTemplate) resetTemplateDesign(type as DocType); else resetDocDesign(docKey);
    setResetKey((k) => k + 1);
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <CanvasEditor
        key={resetKey}
        initial={initial}
        title={title}
        backHref={back}
        onSave={save}
        onDownload={download}
        onReset={stored ? reset : undefined}
        renderExtras={type === "quotation" ? (api) => (
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-2)]">Services &amp; packages</div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {servicePackages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => api.addText(`${pkg.name}    ${inr(pkg.price)}${pkg.billingType === "retainer" ? "/mo" : ""}`, { w: 460, fontSize: 14, fontWeight: 600 })}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-2 py-1.5 text-left text-xs hover:border-[var(--primary)] hover:bg-[var(--surface-2)]"
                >
                  <span className="min-w-0 flex-1 truncate">{pkg.name}</span>
                  <span className="shrink-0 font-semibold">{inr(pkg.price, { compact: true })}</span>
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => api.addText("Custom service    ₹0", { w: 460, fontSize: 14, fontWeight: 600 })}>+ Custom item</Button>
          </div>
        ) : undefined}
      />
    </div>
  );
}

function placeholderFields(type: DocType): Record<string, string> {
  if (type === "quotation") return { number: "QT/2025-26/0001", date: "01 Jan 2026", projectCost: "₹35,000", customerName: "{Customer name}", customerCompany: "{Company}", itemsText: "Website development    ₹30,000\nBrand assets    ₹5,000", grandTotal: "₹35,000" };
  if (type === "invoice") return { number: "INV/2025-26/0001", date: "01 Jan 2026", dueDate: "15 Jan 2026", totalDue: "₹35,000", customerName: "{Customer name}", customerCompany: "{Company}", customerEmail: "{email}", customerPhone: "{phone}", status: "UNPAID", itemsText: "Professional services", subtotal: "₹35,000", tax: "₹0", grandTotal: "₹35,000" };
  if (type === "receipt") return { number: "REC/2025-26/0001", date: "01 Jan 2026", customerName: "{Customer name}", customerCompany: "{Company}", paymentMethod: "UPI", itemName: "Advance project payment", amount: "₹10,000" };
  return { company: "{Client company}", date: "01 Jan 2026", overallScore: "68", summary: "Overview of the client's digital presence and key opportunities.", takeaway: "With the right strategy we can significantly improve visibility and leads." };
}
