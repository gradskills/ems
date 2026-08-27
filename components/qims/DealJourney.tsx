"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { userName } from "@/lib/seed/users";
import { Card, Badge, Button, Avatar, ScoreRing } from "@/components/ui/primitives";
import { PaymentsPanel } from "@/components/qims/PaymentsPanel";
import { StagePicker } from "@/components/bda/StagePicker";
import { AssignedPeople } from "@/components/qims/AssignedPeople";
import { proposalTotals, proposalStatusColor, invoiceStatusColor } from "@/lib/qims";
import { auditReportColor, auditReportLabel } from "@/lib/ems";
import { inr, formatDate, relativeTime } from "@/lib/utils";
import {
  Phone, FileSearch, FileText, Receipt, Trophy, Sparkles, Mail, MessageCircle, Globe, AtSign,
  MapPin, User as UserIcon, Plus, Clock, X,
} from "lucide-react";
import type { Lead } from "@/lib/types";

type StageKey = "contacted" | "audit" | "quotation" | "invoice" | "outcome";

export function DealJourney({ lead }: { lead: Lead }) {
  const router = useRouter();
  const calls = useApp((s) => s.calls);
  const auditReports = useApp((s) => s.auditReports);
  const proposals = useApp((s) => s.proposals);
  const invoices = useApp((s) => s.invoices);
  const briefs = useApp((s) => s.briefs);
  const addBrief = useApp((s) => s.addBrief);
  const upsertAuditReport = useApp((s) => s.upsertAuditReport);

  const report = auditReports.find((r) => r.leadId === lead.id);
  const leadProposals = proposals.filter((p) => p.leadId === lead.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const leadInvoices = invoices.filter((i) => i.leadId === lead.id).sort((a, b) => (a.issuedAt < b.issuedAt ? 1 : -1));
  const leadBriefs = briefs.filter((b) => b.leadId === lead.id).sort((a, b) => (a.at < b.at ? 1 : -1));
  const connected = calls.some((c) => c.leadId === lead.id && c.disposition === "connected");

  const [brief, setBrief] = useState("");
  const [showNext, setShowNext] = useState(true);

  // create a starter audit for this lead, then jump straight to the editor page
  function generateAudit() {
    const id = upsertAuditReport(lead.id, {
      overallScore: 62,
      summary: `Our audit shows ${lead.company} has a solid foundation, but several areas need attention to unlock growth.`,
      takeaway: "With the right strategy and execution, we can significantly improve online visibility and generate more leads.",
      overallOpportunity: "By addressing these gaps, the business can dominate local search and convert more visitors into customers.",
      areas: [
        { key: "website", name: "Website", score: 72, status: "Good", priority: "Medium", summary: "Well-structured but needs conversion optimization.", working: ["Mobile responsive"], issues: ["Weak calls-to-action"], recommendations: ["Add enquiry forms"] },
        { key: "seo", name: "SEO", score: 45, status: "Needs Work", priority: "High", summary: "Low keyword visibility and limited local SEO.", working: ["GBP claimed"], issues: ["Low rankings", "No backlinks"], recommendations: ["Local SEO strategy", "Build citations"] },
        { key: "social", name: "Social Media", score: 64, status: "Average", priority: "Medium", summary: "Low engagement and inconsistent posting.", working: ["Active on Instagram"], issues: ["Irregular posting"], recommendations: ["Content calendar"] },
        { key: "marketing", name: "Marketing", score: 38, status: "Needs Work", priority: "High", summary: "No lead-gen funnels or tracking.", working: [], issues: ["No paid campaigns"], recommendations: ["Set up ads", "Install analytics"] },
      ],
      roadmap: [
        { title: "Foundation", range: "0–30 Days", items: ["Website audit & fixes", "GBP optimization", "Analytics setup"] },
        { title: "Growth", range: "31–60 Days", items: ["On-page SEO", "Content creation", "Local citations"] },
        { title: "Scale", range: "61–90 Days", items: ["Link building", "Paid ads", "Review generation"] },
      ],
      impact: [
        { value: "+150%", label: "Increase in Local Search Visibility" },
        { value: "+200%", label: "Increase in Website Traffic" },
        { value: "+300%", label: "Increase in Lead Generation" },
        { value: "+80%", label: "Increase in Appointments" },
      ],
    });
    router.push(`/audit-reports/${id}`);
  }

  const done = (k: StageKey): "done" | "active" | "todo" => {
    switch (k) {
      case "contacted": return connected || lead.stage !== "new" ? "done" : "active";
      case "audit": return report ? (["sent", "opened", "accepted"].includes(report.status) ? "done" : "active") : "todo";
      case "quotation": return leadProposals.some((p) => p.status === "accepted") ? "done" : leadProposals.length ? "active" : "todo";
      case "invoice": return leadInvoices.some((i) => i.status === "paid") ? "done" : leadInvoices.length ? "active" : "todo";
      case "outcome": return lead.stage === "won" || lead.stage === "lost" ? "done" : "todo";
    }
  };

  const stages: { key: StageKey; label: string; icon: typeof Phone }[] = [
    { key: "contacted", label: "Contacted", icon: Phone },
    { key: "audit", label: "Audit Report", icon: FileSearch },
    { key: "quotation", label: "Quotation", icon: FileText },
    { key: "invoice", label: "Invoice & Payments", icon: Receipt },
    { key: "outcome", label: lead.stage === "lost" ? "Lost" : "Won", icon: Trophy },
  ];

  const initial: StageKey = lead.stage === "won" || lead.stage === "lost" ? "outcome" : leadProposals.length ? "quotation" : report ? "audit" : "contacted";
  const [sel, setSel] = useState<StageKey>(initial);

  const dotCls = (state: string, active: boolean) =>
    `flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
      active ? "ring-2 ring-[var(--ring)] ring-offset-2 ring-offset-[var(--surface)]" : ""
    } ${
      state === "done" ? "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]"
        : state === "active" ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
          : "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--muted-2)]"
    }`;

  return (
    <Card className="overflow-hidden">
      {/* Stage + assigned people strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--muted)]">Stage</span>
          <StagePicker lead={lead} />
        </div>
        <AssignedPeople lead={lead} />
      </div>

      {/* Next-action popup (deal journey only) */}
      {showNext && lead.nextActionAt && (
        <div className="flex items-start gap-2 border-b border-[var(--border)] bg-[var(--primary-soft)]/50 px-4 py-2.5">
          <Clock size={15} className="mt-0.5 shrink-0 text-[var(--primary)]" />
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-[var(--primary)]">Next action</span>
            <span className="ml-2 text-sm">{lead.nextActionNote}</span>
            <span className="ml-2 text-xs text-[var(--muted)]">· {formatDate(lead.nextActionAt, true)}</span>
          </div>
          <button onClick={() => setShowNext(false)} className="rounded p-0.5 text-[var(--muted-2)] hover:text-[var(--foreground)]"><X size={14} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[190px_1fr]">
        {/* Left vertical rail */}
        <div className="min-w-0 border-b border-[var(--border)] p-3 md:border-b-0 md:border-r">
          <div className="flex gap-2 overflow-x-auto md:flex-col md:gap-1">
            {stages.map((st) => {
              const state = done(st.key);
              const Icon = st.icon;
              const active = sel === st.key;
              return (
                <button key={st.key} onClick={() => setSel(st.key)} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${active ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]"}`}>
                  <div className={dotCls(state, active)}><Icon size={15} /></div>
                  <span className={`whitespace-nowrap text-[13px] font-medium ${active ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right details */}
        <div className="min-w-0 p-4">
          {sel === "contacted" && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Left — contact info */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <h3 className="mb-3 text-sm font-semibold">Contact information</h3>
                <div className="space-y-2">
                  <Info icon={UserIcon} label="Contact">{lead.contactName} · {lead.role}</Info>
                  <Info icon={Phone} label="Phone">{lead.phone}</Info>
                  {lead.email && <Info icon={Mail} label="Email">{lead.email}</Info>}
                  <Info icon={MapPin} label="City">{lead.city}</Info>
                  {lead.website ? <Info icon={Globe} label="Website">{lead.website}</Info> : <Info icon={Globe} label="Website"><Badge color="danger">None</Badge></Info>}
                  {lead.instagram && <Info icon={AtSign} label="Instagram">{lead.instagram}</Info>}
                </div>
                <div className="mt-3 flex gap-2">
                  <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><MessageCircle size={14} /> WhatsApp</Button></a>
                  {lead.email && <a href={`mailto:${lead.email}`}><Button size="sm" variant="outline"><Mail size={14} /> Email</Button></a>}
                </div>
              </div>

              {/* Right — conversation briefs (scrollable) */}
              <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <h3 className="mb-3 text-sm font-semibold">Conversation briefs</h3>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {leadBriefs.map((b) => (
                    <div key={b.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-[var(--muted-2)]"><Avatar name={userName(b.authorId)} size={18} /> <span className="font-medium text-[var(--foreground)]">{userName(b.authorId)}</span> · {relativeTime(b.at)}</div>
                      <div className="text-sm">{b.text}</div>
                    </div>
                  ))}
                  {leadBriefs.length === 0 && <p className="text-xs text-[var(--muted)]">No briefs yet — add the first one below.</p>}
                </div>
                <div className="mt-3 flex gap-2">
                  <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={2} placeholder="Add a brief…" className="flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" />
                  <Button size="sm" disabled={!brief.trim()} onClick={() => { addBrief(lead.id, brief.trim()); setBrief(""); }}><Plus size={14} /> Add</Button>
                </div>
              </div>
            </div>
          )}

          {sel === "audit" && (
            report ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <ScoreRing score={report.overallScore ?? report.score} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><span className="font-semibold">Digital-health audit</span><Badge color={auditReportColor[report.status]} dot>{auditReportLabel[report.status]}</Badge></div>
                    {report.summary && <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">{report.summary}</p>}
                  </div>
                </div>
                <Link href={`/audit-reports/${report.id}`}><Button size="sm" className="w-full"><FileSearch size={14} /> Open &amp; edit document</Button></Link>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <FileSearch size={26} className="text-[var(--muted-2)]" />
                <p className="text-sm text-[var(--muted)]">No audit report yet for this lead.</p>
                <Button size="sm" onClick={generateAudit}><Sparkles size={14} /> Generate audit report</Button>
              </div>
            )
          )}

          {sel === "quotation" && (
            leadProposals.length ? (
              <div className="space-y-2">
                {leadProposals.map((p) => (
                  <Link key={p.id} href={`/proposals/${p.id}`} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 hover:bg-[var(--surface-2)]">
                    <FileText size={16} className="text-[var(--warning)]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="font-medium">{p.number}</span><Badge color={proposalStatusColor[p.status]} dot>{p.status.replace("_", " ")}</Badge></div>
                      <div className="text-xs text-[var(--muted)]">{inr(proposalTotals(p.items).total)} · {p.items.length} items</div>
                    </div>
                    <span className="text-xs font-medium text-[var(--primary)]">Open &amp; edit →</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <FileText size={26} className="text-[var(--muted-2)]" />
                <p className="text-sm text-[var(--muted)]">No quotation yet.</p>
                <Link href={`/proposals/new?lead=${lead.id}`}><Button size="sm"><Plus size={14} /> Build quotation</Button></Link>
              </div>
            )
          )}

          {sel === "invoice" && (
            <div className="space-y-4">
              {leadInvoices.length ? (
                <div className="space-y-2">
                  {leadInvoices.map((iv) => (
                    <Link key={iv.id} href={`/invoices/${iv.id}`} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 hover:bg-[var(--surface-2)]">
                      <Receipt size={16} className="text-[var(--primary)]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><span className="font-medium">{iv.number}</span><Badge color={invoiceStatusColor[iv.status]} dot>{iv.status.replace("_", " ")}</Badge></div>
                        <div className="text-xs text-[var(--muted)]">{inr(iv.total)} · {iv.milestone}</div>
                      </div>
                      <span className="text-xs font-medium text-[var(--primary)]">Open &amp; edit →</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[var(--border-strong)] py-4 text-center text-xs text-[var(--muted)]">No invoice yet — convert an accepted quotation, or track milestone payments below.</div>
              )}
              <PaymentsPanel lead={lead} invoiceId={leadInvoices[0]?.id} />
            </div>
          )}

          {sel === "outcome" && (
            <div>
              {lead.stage === "won" ? (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--success-soft)] p-3 text-sm font-medium text-[var(--success)]"><Trophy size={16} /> Deal won — assign the delivery team from the strip above.</div>
              ) : lead.stage === "lost" ? (
                <div className="rounded-lg bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"><strong>Lead lost.</strong> {lead.lostReason ?? "No reason recorded."}</div>
              ) : (
                <div className="py-6 text-center text-sm text-[var(--muted)]">Deal still in progress. Outcome shows here once it&apos;s won or lost.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function Info({ icon: Icon, label, children }: { icon: typeof Phone; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-2 text-sm">
      <Icon size={14} className="shrink-0 text-[var(--muted-2)]" />
      <span className="text-[var(--muted)]">{label}:</span>
      <span className="ml-auto truncate font-medium">{children}</span>
    </div>
  );
}
