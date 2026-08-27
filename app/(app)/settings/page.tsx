"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { Card, Button, Badge } from "@/components/ui/primitives";
import { PageHeader, Tabs } from "@/components/ems/kit";
import { Field, Input, Textarea } from "@/components/ui/modal";
import { leadById } from "@/lib/seed/leads";
import {
  printDocument, quotationHtml, invoiceHtml, receiptHtml, auditReportHtml,
} from "@/lib/documents";
import type { CompanySettings, AuditReport } from "@/lib/types";
import { Check, Upload, Eye, ImageIcon, FileText, Receipt, FileSearch, X, Pencil } from "lucide-react";

type Tab = "identity" | "bank" | "templates" | "rules";

export default function SettingsPage() {
  const company = useApp((s) => s.company);
  const approvalRules = useApp((s) => s.approvalRules);
  const auditReports = useApp((s) => s.auditReports);
  const proposals = useApp((s) => s.proposals);
  const invoices = useApp((s) => s.invoices);
  const saveCompany = useApp((s) => s.saveCompany);
  const setApprovalRules = useApp((s) => s.setApprovalRules);

  const [form, setForm] = useState<CompanySettings>(company);
  const [rules, setRules] = useState(approvalRules);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>("identity");
  const logoRef = useRef<HTMLInputElement>(null);
  const sigRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof CompanySettings>(k: K, v: CompanySettings[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function save() {
    saveCompany(form);
    setApprovalRules(rules);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  function upload(file: File | undefined, key: "logoDataUrl" | "signatureDataUrl") {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set(key, String(reader.result));
    reader.readAsDataURL(file);
  }

  // sample data for template previews (uses current unsaved form)
  const sampleLead = leadById("L-101");
  function previewQuotation() {
    const p = proposals[0];
    if (p) printDocument(quotationHtml(p, leadById(p.leadId), form), "quotation-preview");
  }
  function previewInvoice() {
    const iv = invoices[0];
    if (iv) printDocument(invoiceHtml(iv, leadById(iv.leadId), form), "invoice-preview");
  }
  function previewReceipt() {
    printDocument(
      receiptHtml(
        { id: "prev", receiptNumber: `${form.receiptPrefix}0001`, company: sampleLead?.company ?? "Sample Client", contactName: sampleLead?.contactName, amount: 10000, mode: "upi", at: new Date().toISOString(), note: "Advance project payment", recordedById: "" },
        form
      ),
      "receipt-preview"
    );
  }
  function previewAudit() {
    const r = auditReports[0];
    if (r) printDocument(auditReportHtml(withSampleAudit(r), leadById(r.leadId), form), "audit-preview");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Company Settings"
        subtitle="Branding, bank details & document templates — these feed every audit, quotation, invoice and receipt"
        action={<Button onClick={save}>{saved ? <><Check size={16} /> Saved</> : "Save changes"}</Button>}
      />

      <Tabs
        tabs={[
          { key: "identity", label: "Identity & Logo" },
          { key: "bank", label: "Bank & Signatory" },
          { key: "templates", label: "Document Templates" },
          { key: "rules", label: "Approval Rules" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "identity" && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Logo</h3>
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex h-24 w-48 items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)]">
                {form.logoDataUrl ? (
                  <img src={form.logoDataUrl} alt="logo" className="max-h-20 max-w-44 object-contain" />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-xs text-[var(--muted-2)]"><ImageIcon size={22} /> No logo</span>
                )}
              </div>
              <div className="space-y-2">
                <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()}><Upload size={14} /> Upload logo</Button>
                {form.logoDataUrl && <Button variant="ghost" size="sm" onClick={() => set("logoDataUrl", undefined)}><X size={14} /> Remove</Button>}
                <p className="max-w-xs text-xs text-[var(--muted-2)]">PNG/SVG with transparent background works best. Shown on every document; falls back to the brand name text if empty.</p>
              </div>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0], "logoDataUrl")} />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Business identity</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Brand name"><Input value={form.brandName} onChange={(e) => set("brandName", e.target.value)} /></Field>
              <Field label="Tagline"><Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
              <Field label="Legal name"><Input value={form.legalName} onChange={(e) => set("legalName", e.target.value)} /></Field>
              <Field label="Registration ID" hint="UDYAM / CIN shown on documents"><Input value={form.regId} onChange={(e) => set("regId", e.target.value)} /></Field>
              <Field label="GSTIN"><Input value={form.gstin} onChange={(e) => set("gstin", e.target.value)} /></Field>
              <Field label="PAN"><Input value={form.pan} onChange={(e) => set("pan", e.target.value)} /></Field>
              <Field label="Email"><Input value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
              <Field label="Website"><Input value={form.website} onChange={(e) => set("website", e.target.value)} /></Field>
              <Field label="Address"><Input value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
              <Field label="City"><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
              <Field label="State"><Input value={form.state} onChange={(e) => set("state", e.target.value)} /></Field>
              <Field label="Pincode"><Input value={form.pincode} onChange={(e) => set("pincode", e.target.value)} /></Field>
            </div>
          </Card>
        </div>
      )}

      {tab === "bank" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Bank details</h3>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Bank name"><Input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} /></Field>
              <Field label="Account holder name"><Input value={form.accountHolder} onChange={(e) => set("accountHolder", e.target.value)} /></Field>
              <Field label="Account no."><Input value={form.accountNo} onChange={(e) => set("accountNo", e.target.value)} /></Field>
              <Field label="Account type"><Input value={form.accountType} onChange={(e) => set("accountType", e.target.value)} placeholder="Savings / Current" /></Field>
              <Field label="IFSC"><Input value={form.ifsc} onChange={(e) => set("ifsc", e.target.value)} /></Field>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Signatory</h3>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Signatory name"><Input value={form.signatureName} onChange={(e) => set("signatureName", e.target.value)} /></Field>
              <Field label="Role"><Input value={form.signatureRole} onChange={(e) => set("signatureRole", e.target.value)} /></Field>
              <div>
                <div className="mb-1 text-xs font-medium text-[var(--muted)]">Signature image</div>
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-40 items-center justify-center rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)]">
                    {form.signatureDataUrl ? <img src={form.signatureDataUrl} alt="sign" className="max-h-14 object-contain" /> : <span className="text-xs text-[var(--muted-2)]">None</span>}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => sigRef.current?.click()}><Upload size={14} /> Upload</Button>
                  {form.signatureDataUrl && <Button variant="ghost" size="sm" onClick={() => set("signatureDataUrl", undefined)}><X size={14} /></Button>}
                </div>
                <input ref={sigRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0], "signatureDataUrl")} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === "templates" && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-1 text-sm font-semibold">Document numbering & terms</h3>
            <p className="mb-3 text-xs text-[var(--muted)]">These values are printed on the respective documents.</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Quotation prefix"><Input value={form.quotePrefix} onChange={(e) => set("quotePrefix", e.target.value)} /></Field>
              <Field label="Invoice prefix"><Input value={form.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value)} /></Field>
              <Field label="Receipt prefix"><Input value={form.receiptPrefix} onChange={(e) => set("receiptPrefix", e.target.value)} /></Field>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4">
              <Field label="Quotation terms"><Textarea rows={2} value={form.quotationTerms} onChange={(e) => set("quotationTerms", e.target.value)} /></Field>
              <Field label="Invoice terms"><Textarea rows={2} value={form.invoiceTerms} onChange={(e) => set("invoiceTerms", e.target.value)} /></Field>
              <Field label="Audit report cover tagline"><Input value={form.auditTagline} onChange={(e) => set("auditTagline", e.target.value)} /></Field>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-1 text-sm font-semibold">Browse, preview &amp; edit templates</h3>
            <p className="mb-4 text-xs text-[var(--muted)]">Preview with sample data, or open the design editor to redesign the master template (drag text, change fonts &amp; colours, upload images, add pages).</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <TemplateCard icon={<FileSearch size={20} />} title="Audit Report" desc="Multi-page digital audit" onPreview={previewAudit} disabled={!auditReports.length} editHref="/studio/tpl~audit" />
              <TemplateCard icon={<FileText size={20} />} title="Quotation" desc="Branded quote / proposal" onPreview={previewQuotation} disabled={!proposals.length} editHref="/studio/tpl~quotation" />
              <TemplateCard icon={<Receipt size={20} />} title="Invoice" desc="GST tax invoice" onPreview={previewInvoice} disabled={!invoices.length} editHref="/studio/tpl~invoice" />
              <TemplateCard icon={<Receipt size={20} />} title="Receipt" desc="Payment receipt" onPreview={previewReceipt} editHref="/studio/tpl~receipt" />
            </div>
          </Card>
        </div>
      )}

      {tab === "rules" && (
        <Card className="p-5 lg:max-w-lg">
          <h3 className="mb-1 text-sm font-semibold">Discount approval rules</h3>
          <p className="mb-3 text-xs text-[var(--muted)]">Controls when a quotation needs manager or admin sign-off.</p>
          <div className="space-y-4">
            <Field label={`BDA can self-approve up to ${rules.discountBdaMaxPct}%`}>
              <input type="range" min={0} max={50} value={rules.discountBdaMaxPct} onChange={(e) => setRules((r) => ({ ...r, discountBdaMaxPct: Number(e.target.value) }))} className="w-full" />
            </Field>
            <Field label={`Manager can approve up to ${rules.discountManagerMaxPct}%`}>
              <input type="range" min={0} max={60} value={rules.discountManagerMaxPct} onChange={(e) => setRules((r) => ({ ...r, discountManagerMaxPct: Number(e.target.value) }))} className="w-full" />
            </Field>
            <div className="rounded-lg bg-[var(--surface-2)] p-3 text-xs text-[var(--muted)]">
              <div>≤ {rules.discountBdaMaxPct}% → <Badge color="success">auto</Badge></div>
              <div className="mt-1">≤ {rules.discountManagerMaxPct}% → <Badge color="warning">manager</Badge></div>
              <div className="mt-1">&gt; {rules.discountManagerMaxPct}% → <Badge color="danger">admin</Badge></div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function TemplateCard({ icon, title, desc, onPreview, disabled, editHref }: { icon: React.ReactNode; title: string; desc: string; onPreview: () => void; disabled?: boolean; editHref: string }) {
  return (
    <div className="flex flex-col rounded-xl border border-[var(--border)] p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">{icon}</div>
      <div className="mt-2 text-sm font-semibold">{title}</div>
      <div className="text-xs text-[var(--muted)]">{desc}</div>
      <div className="mt-auto space-y-1.5 pt-3">
        <Button variant="outline" size="sm" className="w-full" onClick={onPreview} disabled={disabled}><Eye size={14} /> Preview</Button>
        <Link href={editHref} className="block"><Button size="sm" className="w-full"><Pencil size={14} /> Edit template</Button></Link>
      </div>
    </div>
  );
}

// enrich a plain audit report with sample rich content so the preview shows all sections
function withSampleAudit(r: AuditReport): AuditReport {
  if (r.areas?.length) return r;
  return {
    ...r,
    overallScore: 68,
    takeaway: "With the right strategy and execution, this business can significantly improve online visibility and increase bookings.",
    areas: [
      { key: "website", name: "Website", score: 72, status: "Good", priority: "Medium", summary: "Well-structured but needs conversion optimization.", working: ["Mobile responsive", "Fast load times"], issues: ["Weak calls-to-action", "No lead capture"], recommendations: ["Add enquiry forms", "Improve CTAs"] },
      { key: "seo", name: "SEO", score: 45, status: "Needs Work", priority: "High", summary: "Low keyword visibility and limited local SEO focus.", working: ["Google Business Profile claimed", "Basic on-page SEO in place"], issues: ["Low keyword rankings", "Lack of quality backlinks", "Missing meta descriptions"], recommendations: ["Implement local SEO strategy", "Build local citations & backlinks"] },
      { key: "social", name: "Social Media", score: 64, status: "Average", priority: "Medium", summary: "Low engagement and inconsistent posting.", working: ["Active on Instagram"], issues: ["Irregular posting", "Low engagement"], recommendations: ["Content calendar", "Reels strategy"] },
      { key: "marketing", name: "Marketing", score: 38, status: "Needs Work", priority: "High", summary: "Lack of lead generation funnels and tracking mechanisms.", working: [], issues: ["No paid campaigns", "No analytics tracking"], recommendations: ["Set up ad campaigns", "Install analytics & tracking"] },
    ],
    overallOpportunity: "By addressing these gaps, the business can dominate local search and convert more visitors into customers.",
    roadmap: [
      { title: "Foundation", range: "0–30 Days", items: ["Website audit & fixes", "Google Business Profile optimization", "Tracking & analytics setup"] },
      { title: "Growth", range: "31–60 Days", items: ["On-page SEO optimization", "Content creation", "Local SEO & citation building"] },
      { title: "Scale", range: "61–90 Days", items: ["Link building", "Paid ads & retargeting", "Review generation"] },
    ],
    impact: [
      { value: "+150%", label: "Increase in Local Search Visibility" },
      { value: "+200%", label: "Increase in Website Traffic" },
      { value: "+300%", label: "Increase in Lead Generation" },
      { value: "+80%", label: "Increase in Appointments" },
    ],
  };
}
