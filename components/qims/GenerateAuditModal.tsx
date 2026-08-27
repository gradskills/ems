"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { Modal, Field, Input, Textarea } from "@/components/ui/modal";
import { Button, Badge } from "@/components/ui/primitives";
import { printDocument, auditReportHtml } from "@/lib/documents";
import type { Lead, AuditArea, RoadmapPhase, ImpactMetric } from "@/lib/types";
import { Sparkles, Download } from "lucide-react";

const AREA_DEFS = [
  { key: "website", name: "Website" },
  { key: "seo", name: "SEO" },
  { key: "branding", name: "Branding" },
  { key: "content", name: "Content" },
  { key: "social", name: "Social Media" },
  { key: "marketing", name: "Marketing" },
];
const STATUSES = ["Strong", "Good", "Average", "Needs Work"];

type AreaDraft = { include: boolean; score: number; status: string; priority: "High" | "Medium" | "Low"; summary: string; working: string; issues: string; recommendations: string };
const emptyArea = (): AreaDraft => ({ include: true, score: 60, status: "Good", priority: "Medium", summary: "", working: "", issues: "", recommendations: "" });
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export function GenerateAuditModal({ open, onClose, lead }: { open: boolean; onClose: () => void; lead: Lead }) {
  const upsertAuditReport = useApp((s) => s.upsertAuditReport);
  const company = useApp((s) => s.company);

  const [overall, setOverall] = useState(68);
  const [summary, setSummary] = useState(`Our audit shows ${lead.company} has a solid foundation, but several key areas need attention to unlock growth.`);
  const [takeaway, setTakeaway] = useState("With the right strategy and execution, we can significantly improve online visibility and generate more leads.");
  const [opportunity, setOpportunity] = useState("By addressing these gaps, the business can dominate local search and convert more visitors into customers.");
  const [areas, setAreas] = useState<Record<string, AreaDraft>>(() => Object.fromEntries(AREA_DEFS.map((a) => [a.key, emptyArea()])));
  const [roadmapOn, setRoadmapOn] = useState(true);
  const [phases, setPhases] = useState<{ title: string; range: string; items: string }[]>([
    { title: "Foundation", range: "0–30 Days", items: "Website audit & fixes\nGoogle Business Profile optimization\nTracking & analytics setup" },
    { title: "Growth", range: "31–60 Days", items: "On-page SEO optimization\nContent creation & optimization\nLocal SEO & citation building" },
    { title: "Scale", range: "61–90 Days", items: "Link building & authority growth\nPaid ads & retargeting\nReview generation" },
  ]);
  const [impactOn, setImpactOn] = useState(true);
  const [impact, setImpact] = useState<ImpactMetric[]>([
    { value: "+150%", label: "Increase in Local Search Visibility" },
    { value: "+200%", label: "Increase in Website Traffic" },
    { value: "+300%", label: "Increase in Lead Generation" },
    { value: "+80%", label: "Increase in Patient Appointments" },
  ]);

  function setArea(key: string, p: Partial<AreaDraft>) { setAreas((a) => ({ ...a, [key]: { ...a[key], ...p } })); }

  function build(): { overallScore: number; summary: string; takeaway: string; overallOpportunity: string; areas: AuditArea[]; roadmap: RoadmapPhase[]; impact: ImpactMetric[] } {
    const builtAreas: AuditArea[] = AREA_DEFS.filter((d) => areas[d.key].include).map((d) => {
      const a = areas[d.key];
      return {
        key: d.key, name: d.name, score: a.score, status: a.status, priority: a.priority,
        summary: a.summary.trim() || undefined,
        working: lines(a.working), issues: lines(a.issues), recommendations: lines(a.recommendations),
      };
    });
    return {
      overallScore: overall, summary, takeaway, overallOpportunity: opportunity,
      areas: builtAreas,
      roadmap: roadmapOn ? phases.map((p) => ({ title: p.title, range: p.range, items: lines(p.items) })).filter((p) => p.items.length) : [],
      impact: impactOn ? impact.filter((m) => m.value.trim() && m.label.trim()) : [],
    };
  }

  function generate(download: boolean) {
    const data = build();
    upsertAuditReport(lead.id, data);
    if (download) {
      printDocument(
        auditReportHtml(
          { id: "gen", leadId: lead.id, company: lead.company, ownerId: "", status: "draft", createdAt: new Date().toISOString(), score: overall, items: [], ...data },
          lead,
          company
        ),
        `audit-${lead.company.replace(/\s+/g, "-")}`
      );
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Generate audit report — ${lead.company}`}
      size="xl"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="outline" onClick={() => generate(false)}><Sparkles size={15} /> Save</Button><Button onClick={() => generate(true)}><Download size={15} /> Save &amp; download</Button></>}
    >
      <div className="space-y-5">
        <p className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">Fill what you know — untick an area or leave a section blank and it won&apos;t appear in the document.</p>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold">Executive summary</h4>
          <Field label={`Overall digital-health score: ${overall}/100`}>
            <input type="range" min={0} max={100} value={overall} onChange={(e) => setOverall(+e.target.value)} className="w-full" />
          </Field>
          <Field label="Summary"><Textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} /></Field>
          <Field label="Key takeaway"><Textarea rows={2} value={takeaway} onChange={(e) => setTakeaway(e.target.value)} /></Field>
          <Field label="Overall opportunity"><Textarea rows={2} value={opportunity} onChange={(e) => setOpportunity(e.target.value)} /></Field>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold">Areas assessed</h4>
          {AREA_DEFS.map((d) => {
            const a = areas[d.key];
            return (
              <div key={d.key} className={`rounded-lg border p-3 ${a.include ? "border-[var(--border)]" : "border-dashed border-[var(--border)] opacity-60"}`}>
                <div className="mb-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={a.include} onChange={(e) => setArea(d.key, { include: e.target.checked })} /> {d.name}
                  </label>
                  {a.include && <Badge color="slate">{a.score}/100</Badge>}
                </div>
                {a.include && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Field label="Score"><Input type="number" value={a.score} onChange={(e) => setArea(d.key, { score: +e.target.value })} /></Field>
                      <Field label="Status">
                        <select value={a.status} onChange={(e) => setArea(d.key, { status: e.target.value })} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
                          {STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </Field>
                      <Field label="Priority">
                        <select value={a.priority} onChange={(e) => setArea(d.key, { priority: e.target.value as AreaDraft["priority"] })} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
                          {["High", "Medium", "Low"].map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </Field>
                    </div>
                    <Field label="One-line finding (shown in overview)"><Input value={a.summary} onChange={(e) => setArea(d.key, { summary: e.target.value })} /></Field>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Field label="What's working (one per line)"><Textarea rows={3} value={a.working} onChange={(e) => setArea(d.key, { working: e.target.value })} /></Field>
                      <Field label="Issues found (one per line)"><Textarea rows={3} value={a.issues} onChange={(e) => setArea(d.key, { issues: e.target.value })} /></Field>
                      <Field label="Recommendations (one per line)"><Textarea rows={3} value={a.recommendations} onChange={(e) => setArea(d.key, { recommendations: e.target.value })} /></Field>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <section className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={roadmapOn} onChange={(e) => setRoadmapOn(e.target.checked)} /> 90-day roadmap</label>
          {roadmapOn && phases.map((p, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-[var(--border)] p-2 sm:grid-cols-[1fr_1fr_2fr]">
              <Input value={p.title} onChange={(e) => setPhases((ph) => ph.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} placeholder="Phase" />
              <Input value={p.range} onChange={(e) => setPhases((ph) => ph.map((x, idx) => idx === i ? { ...x, range: e.target.value } : x))} placeholder="Range" />
              <Textarea rows={2} value={p.items} onChange={(e) => setPhases((ph) => ph.map((x, idx) => idx === i ? { ...x, items: e.target.value } : x))} placeholder="Items (one per line)" />
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={impactOn} onChange={(e) => setImpactOn(e.target.checked)} /> Projected impact</label>
          {impactOn && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {impact.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <div className="w-24"><Input value={m.value} onChange={(e) => setImpact((im) => im.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))} placeholder="+150%" /></div>
                  <div className="flex-1"><Input value={m.label} onChange={(e) => setImpact((im) => im.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} placeholder="Metric label" /></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
