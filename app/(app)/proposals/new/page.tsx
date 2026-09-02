"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { servicePackages, packageById } from "@/lib/seed/users";
import { latestInsightForLead } from "@/lib/seed/calls";
import type { Lead, ProposalItem, ServicePackage } from "@/lib/types";
import { Card, Button, Badge, SectionTitle } from "@/components/ui/primitives";
import { DocumentActions } from "@/components/ui/DocumentActions";
import { printDocument, quotationHtml } from "@/lib/documents";
import { inr, formatDate } from "@/lib/utils";
import { NOW } from "@/lib/clock";
import {
  Sparkles, Plus, Trash2, ShieldAlert, CheckCircle2, Building2,
  Repeat, Coins, PencilRuler, Download, Save,
} from "lucide-react";

const PORTFOLIO: Record<string, { name: string; result: string }[]> = {
  social_media: [
    { name: "Coastal Seafood", result: "+180% Instagram reach in 60 days" },
    { name: "Bay View Resorts", result: "3.2k → 11k followers, 8 reels/mo" },
  ],
  website: [
    { name: "Lakshmi Textiles", result: "5-page site live in 18 days, 40+ enquiries/mo" },
    { name: "Nair Dental Care", result: "Bookings up 2.5× after launch" },
  ],
  outreach: [{ name: "TechEdge Coaching", result: "40 qualified demos/month via cold email" }],
  combo: [{ name: "Urban Fitness", result: "Store + social combo, ROI in 4 months" }],
};

export default function ProposalBuilderPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-[var(--muted)]">Loading builder…</div>}>
      <Builder />
    </Suspense>
  );
}

function Builder() {
  const sp = useSearchParams();
  const leads = useApp((s) => s.leads);
  const proposals = useApp((s) => s.proposals);
  const approve = useApp((s) => s.approveProposal);
  const createProposal = useApp((s) => s.createProposal);
  const role = useApp((s) => s.role);
  const company = useApp((s) => s.company);
  const approvalRules = useApp((s) => s.approvalRules);
  const bdaMax = approvalRules.discountBdaMaxPct;

  const existing = sp.get("proposal") ? proposals.find((p) => p.id === sp.get("proposal")) : undefined;
  const initialLeadId = existing?.leadId ?? sp.get("lead") ?? leads[0]?.id;

  const [leadId, setLeadId] = useState<string>(initialLeadId);
  const [items, setItems] = useState<ProposalItem[]>(existing?.items ?? []);
  const [savedId, setSavedId] = useState<string | null>(null);

  // the live proposal record once it exists in the store (existing or just-saved)
  const currentProposal = existing ?? proposals.find((p) => p.id === savedId);

  const lead = leads.find((l) => l.id === leadId)!;
  const insight = lead ? latestInsightForLead(lead.id) : undefined;

  // AI suggestion: recommend packages based on interest
  const suggestions = suggestPackages(lead);

  function addPackage(pkg: ServicePackage) {
    if (items.some((i) => i.packageId === pkg.id)) return;
    setItems((prev) => [
      ...prev,
      { packageId: pkg.id, name: pkg.name, billingType: pkg.billingType, sacCode: pkg.sacCode, qty: 1, unitPrice: pkg.price, discountPct: 0, gstRate: pkg.gstRate },
    ]);
  }
  function updateItem(idx: number, patch: Partial<ProposalItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const totals = useMemo(() => computeTotals(items), [items]);
  const maxDiscount = Math.max(0, ...items.map((i) => i.discountPct));
  const needsApproval = maxDiscount > bdaMax;
  const number = existing?.number ?? "QT/2025-26/0043 (draft)";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/proposals" className="text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]">← Proposals</Link>
          <h1 className="text-2xl font-bold tracking-tight">{existing ? existing.number : "New proposal"}</h1>
        </div>
        {existing && <Badge color="info" dot>{existing.status}{existing.openCount > 0 ? ` · opened ${existing.openCount}×` : ""}</Badge>}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* ── Builder controls ── */}
        <div className="space-y-4 lg:col-span-2">
          {/* Lead */}
          <Card className="p-4">
            <SectionTitle>Client</SectionTitle>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)]"
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.company} — {l.contactName}</option>
              ))}
            </select>
            {lead && (
              <div className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)]">
                <Building2 size={13} /> {lead.city} · {lead.industry} · {lead.interest.replace("_", " ")}
              </div>
            )}
          </Card>

          {/* AI suggestion */}
          {insight && suggestions.length > 0 && (
            <Card className="border border-[var(--primary-soft)] bg-[var(--primary-soft)]/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
                <Sparkles size={16} /> AI suggests from the call
              </div>
              <p className="mb-3 text-xs text-[var(--muted)]">
                Based on {lead.contactName}&apos;s requirement: <em>&ldquo;{insight.fields.find((f) => f.key === "requirement")?.value}&rdquo;</em>
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => addPackage(pkg)}
                    disabled={items.some((i) => i.packageId === pkg.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--primary)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white disabled:opacity-40"
                  >
                    <Plus size={12} /> {pkg.name}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Catalogue */}
          <Card className="p-4">
            <SectionTitle>Add service packages</SectionTitle>
            <div className="space-y-3">
              {(["social_media", "website", "outreach"] as const).map((cat) => (
                <div key={cat}>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-2)]">{cat.replace("_", " ")}</div>
                  <div className="space-y-1.5">
                    {servicePackages.filter((p) => p.category === cat).map((pkg) => (
                      <button
                        key={pkg.id}
                        onClick={() => addPackage(pkg)}
                        disabled={items.some((i) => i.packageId === pkg.id)}
                        className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] p-2 text-left hover:bg-[var(--surface-2)] disabled:opacity-40"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            {pkg.name}
                            {pkg.billingType === "retainer" ? <Repeat size={11} className="text-[var(--purple)]" /> : <Coins size={11} className="text-[var(--warning)]" />}
                          </div>
                          <div className="text-[11px] text-[var(--muted)]">{pkg.tagline}</div>
                        </div>
                        <div className="text-right text-xs">
                          <div className="font-semibold">{inr(pkg.price)}</div>
                          <div className="text-[10px] text-[var(--muted-2)]">{pkg.billingType === "retainer" ? "/mo" : "one-time"}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Proposal document preview ── */}
        <div className="space-y-4 lg:col-span-3">
          {/* Line items editor */}
          {items.length > 0 && (
            <Card className="p-4">
              <SectionTitle>Line items</SectionTitle>
              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={it.packageId} className="rounded-lg border border-[var(--border)] p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-sm font-medium">{it.name}</span>
                      <Badge color={it.billingType === "retainer" ? "purple" : "warning"}>{it.billingType === "retainer" ? "retainer" : "one-time"}</Badge>
                      <button onClick={() => removeItem(idx)} className="text-[var(--muted-2)] hover:text-[var(--danger)]"><Trash2 size={14} /></button>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <label className="block">
                        <span className="text-[10px] text-[var(--muted-2)]">Qty</span>
                        <input type="number" min={1} value={it.qty} onChange={(e) => updateItem(idx, { qty: Math.max(1, +e.target.value) })}
                          className="h-8 w-full rounded border border-[var(--border-strong)] px-2" />
                      </label>
                      <label className="block">
                        <span className="text-[10px] text-[var(--muted-2)]">Unit ₹</span>
                        <input type="number" value={it.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: +e.target.value })}
                          className="h-8 w-full rounded border border-[var(--border-strong)] px-2" />
                      </label>
                      <label className="block">
                        <span className="text-[10px] text-[var(--muted-2)]">Disc %</span>
                        <input type="number" min={0} max={100} value={it.discountPct} onChange={(e) => updateItem(idx, { discountPct: Math.min(100, Math.max(0, +e.target.value)) })}
                          className={`h-8 w-full rounded border px-2 ${it.discountPct > bdaMax ? "border-[var(--warning)] text-[var(--warning)]" : "border-[var(--border-strong)]"}`} />
                      </label>
                    </div>
                    <div className="mt-1 text-right text-[11px] text-[var(--muted)]">SAC {it.sacCode} · GST {it.gstRate}%</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Document */}
          <Card className="overflow-hidden">
            <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--primary)] to-[var(--purple)] px-6 py-5 text-white">
              <div className="text-[11px] uppercase tracking-widest opacity-80">Proposal · {number}</div>
              <div className="mt-1 text-lg font-bold">Digital Growth Proposal</div>
              <div className="text-sm opacity-90">Prepared for {lead?.company}</div>
            </div>
            <div className="space-y-5 p-6">
              {/* Understanding */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Our understanding</h3>
                <p className="mt-1 text-sm leading-relaxed">
                  {insight?.fields.find((f) => f.key === "requirement")?.value
                    ? `${lead.company} is looking for ${insight.fields.find((f) => f.key === "requirement")?.value.toLowerCase()}. `
                    : `${lead?.company} wants to strengthen its digital presence. `}
                  We&apos;ve tailored the scope below to match your goals and timeline.
                </p>
              </section>

              {/* Scope */}
              {items.length > 0 ? (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Scope &amp; deliverables</h3>
                  <div className="mt-2 space-y-2">
                    {items.map((it) => {
                      const pkg = packageById(it.packageId)!;
                      return (
                        <div key={it.packageId} className="rounded-lg bg-[var(--surface-2)] p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">{it.name}</span>
                            <span className="text-xs text-[var(--muted)]">{pkg.timelineDays} days · {pkg.revisions} revisions</span>
                          </div>
                          <ul className="mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
                            {pkg.deliverables.map((d) => (
                              <li key={d} className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                                <CheckCircle2 size={12} className="shrink-0 text-[var(--success)]" /> {d}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-[var(--border-strong)] py-10 text-center">
                  <PencilRuler size={24} className="text-[var(--muted-2)]" />
                  <p className="text-sm text-[var(--muted)]">Add packages from the left to build the proposal.</p>
                </div>
              )}

              {/* Portfolio */}
              {lead && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Relevant work</h3>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {(PORTFOLIO[lead.interest] ?? PORTFOLIO.combo).map((c) => (
                      <div key={c.name} className="rounded-lg border border-[var(--border)] p-3">
                        <div className="text-sm font-semibold">{c.name}</div>
                        <div className="text-xs text-[var(--success)]">{c.result}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Pricing */}
              {items.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Investment</h3>
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {totals.oneTime.base > 0 && (
                      <div className="rounded-lg border border-[var(--warning-soft)] bg-[var(--warning-soft)]/40 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--warning)]"><Coins size={13} /> One-time (setup)</div>
                        <PriceLines base={totals.oneTime.base} gst={totals.oneTime.gst} />
                      </div>
                    )}
                    {totals.retainer.base > 0 && (
                      <div className="rounded-lg border border-[var(--purple-soft)] bg-[var(--purple-soft)]/40 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--purple)]"><Repeat size={13} /> Monthly retainer</div>
                        <PriceLines base={totals.retainer.base} gst={totals.retainer.gst} suffix="/mo" />
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-[var(--foreground)] px-4 py-3 text-white">
                    <span className="text-sm font-medium">Total payable now (incl. 18% GST)</span>
                    <span className="text-lg font-bold">{inr(totals.oneTime.base + totals.oneTime.gst + totals.retainer.base + totals.retainer.gst)}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[var(--muted-2)]">
                    Note: B2B clients may deduct TDS (2% u/s 194C or 10% u/s 194J) on service payments — the net received will be lower and is tracked on the invoice.
                  </p>
                </section>
              )}

              {/* Terms */}
              <section className="text-xs text-[var(--muted)]">
                <h3 className="mb-1 font-semibold uppercase tracking-wide">Terms</h3>
                <p>Valid till {formatDate(existing?.validTill ?? new Date(NOW + 14 * 86400000).toISOString())} · 50% advance on one-time work · Retainer billed monthly in advance · Content approval within 3 working days · IP transfers on final payment.</p>
              </section>
            </div>
          </Card>

          {/* Approval + Send */}
          {needsApproval && (
            <Card className="flex items-center gap-3 border-l-4 border-l-[var(--warning)] p-4">
              <ShieldAlert size={20} className="shrink-0 text-[var(--warning)]" />
              <div className="flex-1 text-sm">
                <div className="font-semibold text-[var(--warning)]">Manager approval required</div>
                <div className="text-xs text-[var(--muted)]">Discount of {maxDiscount}% exceeds the {bdaMax}% self-approve limit. {role === "bda" ? "Sent to your manager." : "You can approve as manager."}</div>
              </div>
              {role !== "bda" && existing?.approval?.required && (
                <Button variant="success" size="sm" onClick={() => approve(existing.id)}><CheckCircle2 size={14} /> Approve</Button>
              )}
              {role !== "bda" && existing && !existing.approval?.required && <Badge color="success" dot>Approved</Badge>}
            </Card>
          )}

          {/* AI email draft */}
          <AiEmailDraft lead={lead} existingDraft={existing?.emailDraft} />

          {/* Save / Download / Send */}
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="text-xs text-[var(--muted)]">
              {currentProposal
                ? currentProposal.approval?.required
                  ? "Approval pending — you can download, but sending is locked until a manager approves."
                  : "Ready to download or send to the client."
                : "Save the quotation to enable download & send."}
            </div>
            <div className="flex items-center gap-2">
              {!currentProposal ? (
                <>
                  <Button
                    variant="outline"
                    disabled={items.length === 0}
                    onClick={() =>
                      printDocument(
                        quotationHtml(
                          { id: "preview", number: number.replace(" (draft)", ""), leadId, ownerId: "", version: 1, status: "draft", createdAt: new Date().toISOString(), validTill: new Date(NOW + 14 * 86400000).toISOString(), items, openCount: 0 },
                          lead,
                          company
                        ),
                        "quotation-preview"
                      )
                    }
                  >
                    <Download size={16} /> Preview PDF
                  </Button>
                  <Button
                    disabled={items.length === 0}
                    onClick={() => setSavedId(createProposal(leadId, items, new Date(NOW + 14 * 86400000).toISOString()))}
                  >
                    <Save size={16} /> Save quotation
                  </Button>
                </>
              ) : currentProposal.approval?.required ? (
                <>
                  <Button variant="outline" onClick={() => printDocument(quotationHtml(currentProposal, lead, company), currentProposal.number.replace(/\//g, "-"))}>
                    <Download size={16} /> Download PDF
                  </Button>
                  {role !== "bda" ? (
                    <Button variant="success" onClick={() => approve(currentProposal.id)}><CheckCircle2 size={16} /> Approve</Button>
                  ) : (
                    <Badge color="warning" dot>Sent for approval</Badge>
                  )}
                </>
              ) : (
                <DocumentActions doc={{ kind: "quotation", proposal: currentProposal }} />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PriceLines({ base, gst, suffix }: { base: number; gst: number; suffix?: string }) {
  return (
    <div className="mt-1.5 space-y-0.5 text-xs">
      <div className="flex justify-between"><span className="text-[var(--muted)]">Subtotal</span><span>{inr(base)}{suffix}</span></div>
      <div className="flex justify-between"><span className="text-[var(--muted)]">GST 18%</span><span>{inr(gst)}{suffix}</span></div>
      <div className="flex justify-between border-t border-[var(--border)] pt-0.5 font-semibold"><span>Total</span><span>{inr(base + gst)}{suffix}</span></div>
    </div>
  );
}

function AiEmailDraft({ lead, existingDraft }: { lead: Lead; existingDraft?: string }) {
  const insight = lead ? latestInsightForLead(lead.id) : undefined;
  const [open, setOpen] = useState(false);
  const draft =
    existingDraft ??
    `Dear ${lead?.contactName?.split(" ")[0] ?? "there"},\n\nThank you for your time. Please find our proposal for ${lead?.company} attached.${
      insight ? ` As discussed, it covers ${insight.fields.find((f) => f.key === "requirement")?.value.toLowerCase()}.` : ""
    }\n\nHappy to walk you through it on a quick call. Looking forward to working together.\n\nWarm regards,\nPriya Sharma\nPixelForge Digital`;

  return (
    <Card className="p-4">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-left">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary)] text-white"><Sparkles size={14} /></div>
        <div className="flex-1">
          <div className="text-sm font-semibold">AI-drafted covering email</div>
          <div className="text-[11px] text-[var(--muted)]">Written from the call · review before sending</div>
        </div>
        <span className="text-xs text-[var(--primary)]">{open ? "Hide" : "Review"}</span>
      </button>
      {open && (
        <div className="mt-3">
          <textarea defaultValue={draft} rows={9} className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] p-3 text-xs leading-relaxed outline-none focus:border-[var(--primary)]" />
          <div className="mt-1 text-[11px] text-[var(--muted-2)]">✎ You can edit before it goes out — nothing sends automatically.</div>
        </div>
      )}
    </Card>
  );
}

// ── helpers ──
function computeTotals(items: ProposalItem[]) {
  const acc = { oneTime: { base: 0, gst: 0 }, retainer: { base: 0, gst: 0 } };
  for (const it of items) {
    const base = it.qty * it.unitPrice * (1 - it.discountPct / 100);
    const gst = base * (it.gstRate / 100);
    const bucket = it.billingType === "retainer" ? acc.retainer : acc.oneTime;
    bucket.base += base;
    bucket.gst += gst;
  }
  return acc;
}

function suggestPackages(lead?: Lead): ServicePackage[] {
  if (!lead) return [];
  const byCat = (c: string) => servicePackages.filter((p) => p.category === c);
  switch (lead.interest) {
    case "social_media":
      return [packageById("pkg-smm-growth")!];
    case "website":
      return [packageById("pkg-web-5page")!];
    case "outreach":
      return byCat("outreach");
    case "combo":
      return [packageById("pkg-web-5page")!, packageById("pkg-smm-growth")!];
    default:
      return [];
  }
}
