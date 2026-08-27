"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Card, Button, Badge } from "@/components/ui/primitives";
import { Field, Input, Textarea } from "@/components/ui/modal";
import { DocPreview } from "@/components/qims/DocPreview";
import { auditReportColor, auditReportLabel } from "@/lib/ems";
import { auditReportHtml, auditMessage } from "@/lib/documents";
import { renderDesignHtml } from "@/lib/design";
import type { Design, AuditArea, RoadmapPhase, ImpactMetric } from "@/lib/types";
import { ChevronLeft, Plus, Trash2, Save, Check, X, Send, ShieldCheck } from "lucide-react";

const STATUS = ["Strong", "Good", "Average", "Needs Work"];
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export default function AuditReportDocPage() {
  const params = useParams<{ id: string }>();
  const auditReports = useApp((s) => s.auditReports);
  const leads = useApp((s) => s.leads);
  const company = useApp((s) => s.company);
  const docDesigns = useApp((s) => s.docDesigns);
  const actingUserId = useApp((s) => s.actingUserId);
  const setStatus = useApp((s) => s.setAuditReportStatus);
  const verify = useApp((s) => s.verifyAuditReport);
  const reject = useApp((s) => s.rejectAuditReport);
  const update = useApp((s) => s.updateAuditReport);

  const r = auditReports.find((x) => x.id === params.id);
  const viewer = userById(actingUserId)!;
  const [score, setScore] = useState(r?.overallScore ?? r?.score ?? 60);
  const [summary, setSummary] = useState(r?.summary ?? "");
  const [takeaway, setTakeaway] = useState(r?.takeaway ?? "");
  const [opportunity, setOpportunity] = useState(r?.overallOpportunity ?? "");
  const [areas, setAreas] = useState<AuditArea[]>(r?.areas ?? []);
  const [roadmap, setRoadmap] = useState<RoadmapPhase[]>(r?.roadmap ?? []);
  const [impact, setImpact] = useState<ImpactMetric[]>(r?.impact ?? []);
  const [saved, setSaved] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  if (!r) return notFound();
  const lead = leads.find((l) => l.id === r.leadId);
  const canReview = viewer.accessLevel !== "employee";
  const isOwner = r.ownerId === actingUserId;

  const previewReport = { ...r, score, overallScore: score, summary, takeaway, overallOpportunity: opportunity, areas, roadmap, impact };
  const savedDesign = docDesigns[`audit:${r.id}`];
  let baseHtml = "";
  try { baseHtml = savedDesign ? renderDesignHtml(JSON.parse(savedDesign) as Design, { embed: true }) : auditReportHtml(previewReport, lead, company, { embed: true }); } catch { baseHtml = auditReportHtml(previewReport, lead, company, { embed: true }); }

  const setArea = (i: number, patch: Partial<AuditArea>) => setAreas((a) => a.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const addArea = () => setAreas((a) => [...a, { key: `a${Date.now()}`, name: "New area", score: 60, status: "Good", priority: "Medium", summary: "", working: [], issues: [], recommendations: [] }]);
  const removeArea = (i: number) => setAreas((a) => a.filter((_, idx) => idx !== i));

  function save() {
    update(r!.id, { score, overallScore: score, summary, takeaway, overallOpportunity: opportunity, areas, roadmap, impact });
    setSaved(true); setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div className="space-y-4">
      <Link href="/audit-reports" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"><ChevronLeft size={16} /> Audit Reports</Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{r.company}</h1>
          <p className="text-sm text-[var(--muted)]">Digital-health audit</p>
        </div>
        <Badge color={auditReportColor[r.status]} dot>{auditReportLabel[r.status]}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        {/* LEFT — content editor */}
        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold">Overview</h3>
            <div className="space-y-3">
              <Field label={`Overall score: ${score}/100`}><input type="range" min={0} max={100} value={score} onChange={(e) => setScore(+e.target.value)} className="w-full" /></Field>
              <Field label="Summary"><Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} /></Field>
              <Field label="Key takeaway"><Textarea rows={2} value={takeaway} onChange={(e) => setTakeaway(e.target.value)} /></Field>
              <Field label="Overall opportunity"><Textarea rows={2} value={opportunity} onChange={(e) => setOpportunity(e.target.value)} /></Field>
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Areas assessed</h3>
              <Button size="sm" variant="outline" onClick={addArea}><Plus size={13} /> Add</Button>
            </div>
            <div className="space-y-3">
              {areas.map((a, i) => (
                <div key={i} className="rounded-lg border border-[var(--border)] p-2.5">
                  <div className="mb-1.5 flex items-center gap-2">
                    <Input value={a.name} onChange={(e) => setArea(i, { name: e.target.value })} className="h-8 flex-1 text-sm" placeholder="Area name" />
                    <button onClick={() => removeArea(i)} className="rounded p-1 text-[var(--muted-2)] hover:text-[var(--danger)]"><Trash2 size={14} /></button>
                  </div>
                  <div className="mb-1.5 grid grid-cols-3 gap-1.5">
                    <label className="text-[10px] text-[var(--muted)]">Score<Input type="number" value={a.score} onChange={(e) => setArea(i, { score: +e.target.value })} className="h-8 text-xs" /></label>
                    <label className="text-[10px] text-[var(--muted)]">Status<select value={a.status} onChange={(e) => setArea(i, { status: e.target.value })} className="h-8 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-1 text-xs">{STATUS.map((s) => <option key={s}>{s}</option>)}</select></label>
                    <label className="text-[10px] text-[var(--muted)]">Priority<select value={a.priority} onChange={(e) => setArea(i, { priority: e.target.value as AuditArea["priority"] })} className="h-8 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-1 text-xs">{["High", "Medium", "Low"].map((s) => <option key={s}>{s}</option>)}</select></label>
                  </div>
                  <Input value={a.summary ?? ""} onChange={(e) => setArea(i, { summary: e.target.value })} className="mb-1.5 h-8 text-xs" placeholder="One-line finding (overview grid)" />
                  <div className="grid grid-cols-1 gap-1.5">
                    <Textarea rows={2} value={(a.working ?? []).join("\n")} onChange={(e) => setArea(i, { working: lines(e.target.value) })} className="text-xs" placeholder="What's working (one per line)" />
                    <Textarea rows={2} value={(a.issues ?? []).join("\n")} onChange={(e) => setArea(i, { issues: lines(e.target.value) })} className="text-xs" placeholder="Issues found (one per line)" />
                    <Textarea rows={2} value={(a.recommendations ?? []).join("\n")} onChange={(e) => setArea(i, { recommendations: lines(e.target.value) })} className="text-xs" placeholder="Recommendations (one per line)" />
                  </div>
                </div>
              ))}
              {areas.length === 0 && <p className="text-xs text-[var(--muted)]">No areas yet. Add one — it appears in the scorecard & findings.</p>}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">90-day roadmap</h3>
              <Button size="sm" variant="outline" onClick={() => setRoadmap((p) => [...p, { title: "Phase", range: "", items: [] }])}><Plus size={13} /> Add</Button>
            </div>
            <div className="space-y-2">
              {roadmap.map((ph, i) => (
                <div key={i} className="rounded-lg border border-[var(--border)] p-2.5">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <Input value={ph.title} onChange={(e) => setRoadmap((p) => p.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} className="h-8 flex-1 text-xs" placeholder="Phase" />
                    <Input value={ph.range} onChange={(e) => setRoadmap((p) => p.map((x, idx) => idx === i ? { ...x, range: e.target.value } : x))} className="h-8 w-28 text-xs" placeholder="0–30 Days" />
                    <button onClick={() => setRoadmap((p) => p.filter((_, idx) => idx !== i))} className="rounded p-1 text-[var(--muted-2)] hover:text-[var(--danger)]"><Trash2 size={13} /></button>
                  </div>
                  <Textarea rows={2} value={ph.items.join("\n")} onChange={(e) => setRoadmap((p) => p.map((x, idx) => idx === i ? { ...x, items: lines(e.target.value) } : x))} className="text-xs" placeholder="Items (one per line)" />
                </div>
              ))}
              {roadmap.length === 0 && <p className="text-xs text-[var(--muted)]">No roadmap — add phases if you want the roadmap page.</p>}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Projected impact</h3>
              <Button size="sm" variant="outline" onClick={() => setImpact((m) => [...m, { value: "+0%", label: "" }])}><Plus size={13} /> Add</Button>
            </div>
            <div className="space-y-1.5">
              {impact.map((m, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Input value={m.value} onChange={(e) => setImpact((x) => x.map((y, idx) => idx === i ? { ...y, value: e.target.value } : y))} className="h-8 w-20 text-xs" placeholder="+150%" />
                  <Input value={m.label} onChange={(e) => setImpact((x) => x.map((y, idx) => idx === i ? { ...y, label: e.target.value } : y))} className="h-8 flex-1 text-xs" placeholder="Metric label" />
                  <button onClick={() => setImpact((x) => x.filter((_, idx) => idx !== i))} className="rounded p-1 text-[var(--muted-2)] hover:text-[var(--danger)]"><Trash2 size={13} /></button>
                </div>
              ))}
              {impact.length === 0 && <p className="text-xs text-[var(--muted)]">No impact metrics.</p>}
            </div>
          </Card>

          <Button className="w-full" onClick={save}>{saved ? <><Check size={15} /> Saved</> : <><Save size={15} /> Save changes</>}</Button>

          <Card className="p-4">
            {rejecting ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--muted)]">Send back to revise — what needs fixing?</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm" />
                <div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>Cancel</Button><Button variant="danger" size="sm" onClick={() => { reject(r.id, reason || "Please revise"); setRejecting(false); }}><X size={14} /> Send back</Button></div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {r.status === "draft" && isOwner && <Button size="sm" onClick={() => setStatus(r.id, "pending_verification")}><Send size={14} /> For verification</Button>}
                {r.status === "pending_verification" && canReview && (
                  <>
                    <Button size="sm" variant="success" onClick={() => { verify(r.id); setStatus(r.id, "sent"); }}><ShieldCheck size={14} /> Verify &amp; send</Button>
                    <Button size="sm" variant="danger" onClick={() => setRejecting(true)}><X size={14} /> Reject</Button>
                  </>
                )}
                {(r.status === "sent" || r.status === "opened") && (
                  <>
                    <Button size="sm" variant="success" onClick={() => setStatus(r.id, "accepted")}><Check size={14} /> Accepted</Button>
                    <Button size="sm" variant="danger" onClick={() => setStatus(r.id, "rejected")}><X size={14} /> Rejected</Button>
                  </>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT — actual document */}
        <div>
          <div className="mb-2 text-xs font-medium text-[var(--muted)]">Preview — this is exactly what the client receives</div>
          <DocPreview docKey={`audit:${r.id}`} baseHtml={baseHtml} filename={`audit-${r.company.replace(/\s+/g, "-")}`} label="Audit report" message={auditMessage(r, lead)} contact={{ email: lead?.email, phone: lead?.phone }} />
        </div>
      </div>
    </div>
  );
}
