"use client";

import { useState } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { callsForLead, latestInsightForLead, transcriptById } from "@/lib/seed/calls";
import { Card, StageBadge, ScoreRing, Button, Badge, DispositionBadge, SectionTitle } from "@/components/ui/primitives";
import { Tabs } from "@/components/ems/kit";
import { CallFlow } from "@/components/bda/CallFlow";
import { AiReviewPanel } from "@/components/bda/AiReviewPanel";
import { EditFieldModal } from "@/components/bda/EditFieldModal";
import { CreateInvoiceModal } from "@/components/bda/CreateInvoiceModal";
import { Timeline } from "@/components/bda/Timeline";
import { DealJourney } from "@/components/qims/DealJourney";
import { inr, formatDate, formatDuration } from "@/lib/utils";
import {
  PhoneCall, Mail, MessageCircle, Pencil, Globe, AtSign, MapPin, Building2, AlertTriangle,
  Sparkles, FileText, ChevronLeft, PlayCircle, Clock,
} from "lucide-react";

type Tab = "deal" | "brief" | "activity" | "transcript" | "company" | "calls";

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const leads = useApp((s) => s.leads);
  const insights = useApp((s) => s.insights);
  const activitiesStore = useApp((s) => s.activities);
  const proposalsStore = useApp((s) => s.proposals);
  const invoicesStore = useApp((s) => s.invoices);
  const role = useApp((s) => s.role);
  const lead = leads.find((l) => l.id === params.id);

  const [callOpen, setCallOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("deal");

  if (!lead) return notFound();

  const owner = userById(lead.ownerId);
  const insight = insights.find((i) => i.leadId === lead.id && i.fields.some((f) => f.status === "pending"))
    ?? latestInsightForLead(lead.id);
  const pendingInsight = insight && insight.fields.some((f) => f.status === "pending");
  const activities = activitiesStore.filter((a) => a.leadId === lead.id).sort((a, b) => (a.at < b.at ? 1 : -1));
  const calls = callsForLead(lead.id);
  const proposals = proposalsStore.filter((p) => p.leadId === lead.id);
  const invoices = invoicesStore.filter((i) => i.leadId === lead.id);
  const transcript = transcriptById(calls.find((c) => c.transcriptId)?.transcriptId);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "deal", label: "Deal Journey" },
    ...(insight ? [{ key: "brief" as Tab, label: "Brief & Insights" }] : []),
    { key: "activity", label: "Activity", count: activities.length },
    ...(transcript ? [{ key: "transcript" as Tab, label: "Transcript" }] : []),
    { key: "company", label: "Company" },
    { key: "calls", label: "Call History", count: calls.length },
  ];

  return (
    <div className="space-y-4">
      <Link href="/leads" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
        <ChevronLeft size={14} /> Leads
      </Link>

      {lead.duplicateOf && (
        <div className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--warning-soft)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]">
          <AlertTriangle size={18} className="shrink-0" />
          <span><strong>Already contacted.</strong> {lead.duplicateOf.ownerName} touched this number on {formatDate(lead.duplicateOf.lastTouchedAt)}. Coordinate before calling.</span>
        </div>
      )}

      {/* Header card */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <ScoreRing score={lead.score} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{lead.company}</h1>
              <StageBadge stage={lead.stage} />
              {lead.tags.map((t) => (
                <Badge key={t} color={t === "hot" ? "danger" : t === "no-website" ? "warning" : "slate"}>{t}</Badge>
              ))}
            </div>
            <div className="mt-1 text-sm text-[var(--muted)]">{lead.contactName} · {lead.role} · {lead.phone}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted-2)]">
              <span className="inline-flex items-center gap-1"><MapPin size={12} /> {lead.city}</span>
              <span className="inline-flex items-center gap-1"><Building2 size={12} /> {lead.industry}</span>
              <span>Value {inr(lead.estimatedValue, { compact: true })}</span>
              {role !== "bda" && owner && <span>Owner: {owner.name}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="success" onClick={() => setCallOpen(true)}><PhoneCall size={16} /> Call</Button>
            <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer"><Button variant="outline"><MessageCircle size={16} /></Button></a>
            {lead.email && <a href={`mailto:${lead.email}`}><Button variant="outline"><Mail size={16} /></Button></a>}
            <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil size={16} /> Edit</Button>
          </div>
        </div>
      </Card>

      {/* Horizontal tab nav */}
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "deal" && <DealJourney lead={lead} />}

      {tab === "brief" && insight && (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 bg-[var(--foreground)] px-4 py-2.5 text-white">
              <Clock size={15} /> <span className="text-sm font-semibold">60-second brief</span>
              <span className="ml-auto text-[11px] text-white/60">from last call · {formatDate(calls[0]?.at ?? lead.lastActivityAt)}</span>
            </div>
            <div className="p-4 text-sm leading-relaxed">{insight.summary}</div>
          </Card>
          {pendingInsight && <AiReviewPanel insight={insight} />}
        </div>
      )}

      {tab === "activity" && (
        <Card className="p-4"><Timeline items={activities} /></Card>
      )}

      {tab === "transcript" && transcript && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-xs text-[var(--muted)]">
            <PlayCircle size={16} className="text-[var(--primary)]" /> Recording · {transcript.language}
            <span className="ml-auto rounded bg-[var(--surface-2)] px-2 py-0.5">Talk ratio · agent {Math.round((insight?.talkRatioAgent ?? 0.5) * 100)}%</span>
          </div>
          <div className="space-y-2.5">
            {transcript.turns.map((t, i) => (
              <div key={i} className={`flex gap-2 ${t.speaker === "agent" ? "" : "flex-row-reverse"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${t.speaker === "agent" ? "bg-[var(--primary-soft)] text-[var(--foreground)]" : "bg-[var(--surface-2)]"}`}>
                  <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-2)]">{t.speaker === "agent" ? "BDA" : lead.contactName} · {formatDuration(t.at)}</div>
                  {t.text}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "company" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <SectionTitle>Company details</SectionTitle>
            <dl className="space-y-2 text-sm">
              <Row label="Website">
                {lead.website ? <a className="inline-flex items-center gap-1 text-[var(--primary)]" href={`https://${lead.website}`} target="_blank" rel="noreferrer"><Globe size={13} /> {lead.website}</a> : <Badge color="danger">No website</Badge>}
              </Row>
              {lead.instagram && <Row label="Instagram"><span className="inline-flex items-center gap-1"><AtSign size={13} /> {lead.instagram}</span></Row>}
              <Row label="Industry">{lead.industry}</Row>
              <Row label="City">{lead.city}</Row>
              <Row label="Source"><span className="capitalize">{lead.source.replace("_", " ")}</span></Row>
              <Row label="Interest">
                <span className="flex flex-wrap justify-end gap-1">
                  {(lead.interests ?? [lead.interest]).map((it) => <Badge key={it} color="primary">{it.replace("_", " ")}</Badge>)}
                </span>
              </Row>
              <Row label="Value">{inr(lead.estimatedValue)}</Row>
              <Row label="Billing"><span className="capitalize">{lead.billingType.replace("_", " ")}</span></Row>
              <Row label="Created">{formatDate(lead.createdAt)}</Row>
            </dl>
            <Link href={`/prospect-audit?company=${encodeURIComponent(lead.company)}`}>
              <Button variant="secondary" size="sm" className="mt-3 w-full"><Sparkles size={14} /> Run prospect audit</Button>
            </Link>
          </Card>

          <div className="space-y-4">
            <Card className="p-4">
              <SectionTitle action={<Link href={`/proposals/new?lead=${lead.id}`} className="text-xs font-medium text-[var(--primary)]">+ New</Link>}>Proposals</SectionTitle>
              {proposals.length === 0 ? <p className="text-xs text-[var(--muted)]">No proposals yet.</p> : (
                <div className="space-y-2">
                  {proposals.map((p) => (
                    <Link key={p.id} href={`/proposals/${p.id}`} className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-2 hover:bg-[var(--surface-2)]">
                      <FileText size={15} className="text-[var(--warning)]" />
                      <div className="min-w-0 flex-1"><div className="truncate text-xs font-medium">{p.number}</div><div className="text-[11px] text-[var(--muted-2)]">v{p.version} · {p.status}</div></div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
            {role !== "bda" && (
              <Card className="p-4">
                <SectionTitle action={<button onClick={() => setInvoiceOpen(true)} className="text-xs font-medium text-[var(--primary)]">+ New</button>}>Invoices</SectionTitle>
                {invoices.length === 0 ? <p className="text-xs text-[var(--muted)]">No invoices yet.</p> : (
                  <div className="space-y-2">
                    {invoices.map((iv) => (
                      <Link key={iv.id} href={`/invoices/${iv.id}`} className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-2 text-xs hover:bg-[var(--surface-2)]">
                        <span className="font-medium">{iv.number}</span>
                        <Badge color={iv.status === "paid" ? "success" : iv.status === "overdue" ? "danger" : "warning"}>{iv.status.replace("_", " ")}</Badge>
                        <span className="ml-auto font-semibold">{inr(iv.total)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === "calls" && (
        <Card className="p-4">
          <SectionTitle>Call history</SectionTitle>
          <div className="space-y-2">
            {calls.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm">
                <PhoneCall size={14} className="text-[var(--muted-2)]" />
                <DispositionBadge d={c.disposition} />
                {c.durationSec > 0 && <span className="text-[var(--muted)]">{formatDuration(c.durationSec)}</span>}
                <span className="ml-auto text-[var(--muted-2)]">{formatDate(c.at)}</span>
              </div>
            ))}
            {calls.length === 0 && <p className="text-xs text-[var(--muted)]">No calls logged.</p>}
          </div>
        </Card>
      )}

      {callOpen && <CallFlow lead={lead} open={callOpen} onClose={() => setCallOpen(false)} />}
      {editOpen && <EditFieldModal lead={lead} open={editOpen} onClose={() => setEditOpen(false)} />}
      <CreateInvoiceModal open={invoiceOpen} onClose={() => setInvoiceOpen(false)} presetLeadId={lead.id} />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
