"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams, notFound } from "next/navigation";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Card, Button, Badge } from "@/components/ui/primitives";
import { Field, Input } from "@/components/ui/modal";
import { DocPreview } from "@/components/qims/DocPreview";
import { proposalTotals, proposalReviewLabel } from "@/lib/qims";
import { quotationHtml, proposalMessage } from "@/lib/documents";
import { renderDesignHtml } from "@/lib/design";
import type { Design, ProposalItem } from "@/lib/types";
import { inr } from "@/lib/utils";
import { ChevronLeft, Plus, Trash2, Save, Check, Send, ShieldCheck, X, Share2, Copy, ArrowRightLeft } from "lucide-react";

export default function ProposalDocPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const proposals = useApp((s) => s.proposals);
  const leads = useApp((s) => s.leads);
  const company = useApp((s) => s.company);
  const docDesigns = useApp((s) => s.docDesigns);
  const actingUserId = useApp((s) => s.actingUserId);
  const updateProposal = useApp((s) => s.updateProposal);
  const submitForReview = useApp((s) => s.submitProposalForReview);
  const verifyProposal = useApp((s) => s.verifyProposal);
  const rejectProposal = useApp((s) => s.rejectProposal);
  const shareProposal = useApp((s) => s.shareProposal);
  const convert = useApp((s) => s.convertProposalToInvoice);

  const p = proposals.find((x) => x.id === params.id);
  const viewer = userById(actingUserId)!;
  const [items, setItems] = useState<ProposalItem[]>(p?.items ?? []);
  const [validTill, setValidTill] = useState(p?.validTill.slice(0, 10) ?? "");
  const [saved, setSaved] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [token, setToken] = useState<string | undefined>(p?.shareToken);
  const [copied, setCopied] = useState(false);

  if (!p) return notFound();

  const lead = leads.find((l) => l.id === p.leadId);
  const review = proposalReviewLabel(p);
  const canReview = viewer.accessLevel !== "employee";
  const isOwner = p.ownerId === actingUserId;
  const t = proposalTotals(items);
  const link = token ? `${typeof window !== "undefined" ? window.location.origin : ""}/q/${token}` : "";

  // right-side live preview reflects UNSAVED edits (or a Studio design if one exists)
  const previewP = { ...p, items, validTill: validTill ? new Date(validTill).toISOString() : p.validTill };
  const savedDesign = docDesigns[`quotation:${p.id}`];
  let baseHtml = "";
  try { baseHtml = savedDesign ? renderDesignHtml(JSON.parse(savedDesign) as Design, { embed: true }) : quotationHtml(previewP, lead, company, { embed: true }); } catch { baseHtml = quotationHtml(previewP, lead, company, { embed: true }); }

  function setItem(i: number, patch: Partial<ProposalItem>) { setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it))); }
  function addItem() { setItems((arr) => [...arr, { packageId: "", name: "New service", billingType: "one_time", sacCode: "998314", qty: 1, unitPrice: 0, discountPct: 0, gstRate: 18 }]); }
  function removeItem(i: number) { setItems((arr) => arr.filter((_, idx) => idx !== i)); }
  function save() { updateProposal(p!.id, { items, validTill: new Date(validTill).toISOString() }); setSaved(true); setTimeout(() => setSaved(false), 1600); }

  return (
    <div className="space-y-4">
      <Link href="/proposals" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"><ChevronLeft size={16} /> Quotations</Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{lead?.company} <span className="text-[var(--muted-2)]">· {p.number}</span></h1>
          <p className="text-sm text-[var(--muted)]">Quotation · v{p.version}</p>
        </div>
        <Badge color={review.color} dot>{review.label}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        {/* LEFT — content editor */}
        <div className="space-y-3">
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Line items</h3>
              <Button size="sm" variant="outline" onClick={addItem}><Plus size={13} /> Add</Button>
            </div>
            <div className="space-y-3">
              {items.map((it, i) => (
                <div key={i} className="rounded-lg border border-[var(--border)] p-2.5">
                  <div className="mb-1.5 flex items-center gap-2">
                    <Input value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} className="h-8 flex-1 text-sm" placeholder="Service name" />
                    <button onClick={() => removeItem(i)} className="rounded p-1 text-[var(--muted-2)] hover:text-[var(--danger)]"><Trash2 size={14} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <label className="text-[10px] text-[var(--muted)]">Qty<Input type="number" value={it.qty} onChange={(e) => setItem(i, { qty: +e.target.value })} className="h-8 text-xs" /></label>
                    <label className="text-[10px] text-[var(--muted)]">Rate ₹<Input type="number" value={it.unitPrice} onChange={(e) => setItem(i, { unitPrice: +e.target.value })} className="h-8 text-xs" /></label>
                    <label className="text-[10px] text-[var(--muted)]">Disc %<Input type="number" value={it.discountPct} onChange={(e) => setItem(i, { discountPct: +e.target.value })} className="h-8 text-xs" /></label>
                  </div>
                  <div className="mt-1 text-right text-[11px] text-[var(--muted-2)]">{inr(it.qty * it.unitPrice * (1 - it.discountPct / 100))}</div>
                </div>
              ))}
              {items.length === 0 && <p className="text-xs text-[var(--muted)]">No items. Add one above.</p>}
            </div>
            <div className="mt-3 space-y-1 border-t border-[var(--border)] pt-3 text-sm">
              <div className="flex justify-between"><span className="text-[var(--muted)]">Subtotal</span><span>{inr(t.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">GST</span><span>{inr(t.gst)}</span></div>
              <div className="flex justify-between font-bold"><span>Total</span><span>{inr(t.total)}</span></div>
            </div>
            <div className="mt-3"><Field label="Valid till"><Input type="date" value={validTill} onChange={(e) => setValidTill(e.target.value)} /></Field></div>
            <Button className="mt-3 w-full" onClick={save}>{saved ? <><Check size={15} /> Saved</> : <><Save size={15} /> Save changes</>}</Button>
          </Card>

          {/* review & send actions */}
          <Card className="p-4">
            {p.approval?.required && !p.approval.approvedBy && <div className="mb-3 rounded-lg bg-[var(--warning-soft)] px-3 py-2 text-xs font-medium text-[var(--warning)]">Needs approval: {p.approval.reason}</div>}
            {rejecting ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--muted)]">Send back to revise — why?</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm" />
                <div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>Cancel</Button><Button variant="danger" size="sm" onClick={() => { rejectProposal(p.id, reason || "Please revise"); setRejecting(false); }}><X size={14} /> Send back</Button></div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {!p.reviewStatus && isOwner && <Button size="sm" onClick={() => submitForReview(p.id)}><Send size={14} /> Send for review</Button>}
                {p.reviewStatus === "internal_review" && canReview && (
                  <>
                    <Button size="sm" variant="success" onClick={() => verifyProposal(p.id)}><ShieldCheck size={14} /> Verify</Button>
                    <Button size="sm" variant="danger" onClick={() => setRejecting(true)}><X size={14} /> Reject</Button>
                  </>
                )}
                {p.reviewStatus === "verified" && !token && <Button size="sm" onClick={() => setToken(shareProposal(p.id))}><Share2 size={14} /> Client link</Button>}
                <Button size="sm" variant="secondary" onClick={() => { const id = convert(p.id); router.push(`/invoices/${id}`); }}><ArrowRightLeft size={14} /> To invoice</Button>
              </div>
            )}
            {token && (
              <div className="mt-2 flex items-center gap-2">
                <input readOnly value={link} className="h-8 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs text-[var(--muted)]" />
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check size={14} /> : <Copy size={14} />}</Button>
                <Link href={`/q/${token}`}><Button size="sm" variant="outline">Client view</Button></Link>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT — actual document that will be sent */}
        <div>
          <div className="mb-2 text-xs font-medium text-[var(--muted)]">Preview — this is exactly what the client receives</div>
          <DocPreview
            docKey={`quotation:${p.id}`}
            baseHtml={baseHtml}
            filename={p.number.replace(/\//g, "-")}
            label="Quotation"
            message={proposalMessage(p, lead)}
            contact={{ email: lead?.email, phone: lead?.phone }}
          />
        </div>
      </div>
    </div>
  );
}
