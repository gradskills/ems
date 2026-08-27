"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { users, userById } from "@/lib/seed/users";
import { Card, Avatar, Badge, Button, SectionTitle, Stat } from "@/components/ui/primitives";
import { inr, formatDate } from "@/lib/utils";
import { printDocument, wrapDocument, mailto } from "@/lib/documents";
import { BarChart3, FileDown, Mail, PhoneCall, FileText, Pencil, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";

type Tab = "daily" | "weekly" | "dossier";

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("daily");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><BarChart3 size={22} className="text-[var(--primary)]" /> Reports</h1>
        <p className="text-sm text-[var(--muted)]">Auto-generated and emailed on schedule — or pull a person dossier on demand.</p>
      </div>

      <div className="flex gap-2 border-b border-[var(--border)]">
        {([["daily", "Daily digest"], ["weekly", "Weekly manager pack"], ["dossier", "Person dossier"]] as [Tab, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === k ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "daily" && <DailyDigest />}
      {tab === "weekly" && <WeeklyPack />}
      {tab === "dossier" && <Dossier />}
    </div>
  );
}

function ReportActions({ cadence, title, buildHtml, mailBody }: { cadence: string; title: string; buildHtml: () => string; mailBody: { subject: string; body: string } }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge color="info"><Clock size={12} /> {cadence}</Badge>
      <Button size="sm" variant="outline" onClick={() => printDocument(wrapDocument(title, buildHtml()), title.replace(/\s+/g, "-"))}>
        <FileDown size={14} /> PDF
      </Button>
      <Button size="sm" variant="outline" onClick={() => window.open(mailto(mailBody), "_blank")}>
        <Mail size={14} /> Email now
      </Button>
    </div>
  );
}

const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
function htmlTable(headers: string[], rows: (string | number)[][]) {
  return `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

function DailyDigest() {
  const leads = useApp((s) => s.leads);
  const bdas = users.filter((u) => u.role === "bda");

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Daily activity digest</div>
          <div className="text-xs text-[var(--muted)]">{formatDate(new Date().toISOString())} · auto-sent to each BDA &amp; their manager at 7 PM</div>
        </div>
        <ReportActions
          cadence="Daily · 7:00 PM"
          title={`Daily Activity Digest — ${formatDate(new Date().toISOString())}`}
          buildHtml={() =>
            `<h1>Daily Activity Digest</h1><div class="muted">${formatDate(new Date().toISOString())}</div>` +
            htmlTable(
              ["BDA", "Calls", "Connects", "Follow-ups", "Proposals", "Moved"],
              bdas.map((b, i) => [b.name, 18 + i * 4, 11 + i * 2, `${5 - i}/${7 - i}`, 2 - (i % 2), leads.filter((l) => l.ownerId === b.id && ["won", "negotiation"].includes(l.stage)).length])
            )
          }
          mailBody={{ subject: `Daily Activity Digest — ${formatDate(new Date().toISOString())}`, body: `Team daily digest attached.\n\n${bdas.map((b, i) => `${b.name}: ${18 + i * 4} calls, ${11 + i * 2} connects`).join("\n")}` }}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              <th className="py-2">BDA</th><th className="py-2">Calls</th><th className="py-2">Connects</th><th className="py-2">Follow-ups</th><th className="py-2">Proposals</th><th className="py-2">Moved</th>
            </tr>
          </thead>
          <tbody>
            {bdas.map((b, i) => {
              const bl = leads.filter((l) => l.ownerId === b.id);
              return (
                <tr key={b.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2.5"><div className="flex items-center gap-2"><Avatar name={b.name} size={26} /> {b.name}</div></td>
                  <td className="py-2.5">{18 + i * 4}</td>
                  <td className="py-2.5">{11 + i * 2}</td>
                  <td className="py-2.5">{5 - i}/{7 - i}</td>
                  <td className="py-2.5">{2 - (i % 2)}</td>
                  <td className="py-2.5">{bl.filter((l) => ["won", "negotiation"].includes(l.stage)).length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function WeeklyPack() {
  const leads = useApp((s) => s.leads);
  const wonValue = leads.filter((l) => l.stage === "won").reduce((s, l) => s + l.estimatedValue, 0);
  const pipeline = leads.filter((l) => !["won", "lost"].includes(l.stage)).reduce((s, l) => s + l.estimatedValue, 0);
  const lost = leads.filter((l) => l.stage === "lost");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Weekly manager pack</div>
        <ReportActions
          cadence="Weekly · Mon 8 AM"
          title="Weekly Manager Pack"
          buildHtml={() =>
            `<h1>Weekly Manager Pack</h1>` +
            htmlTable(["Metric", "Value"], [["Won this week", money(wonValue)], ["Pipeline added", money(pipeline * 0.3)], ["Avg. deal size", money(85000)], ["Deals lost", lost.length]]) +
            `<h1 style="font-size:14px;margin-top:16px">Top performers</h1>` +
            htmlTable(["BDA", "Won value"], users.filter((u) => u.role === "bda").map((b) => [b.name, money(leads.filter((l) => l.ownerId === b.id && l.stage === "won").reduce((s, l) => s + l.estimatedValue, 0))]))
          }
          mailBody={{ subject: "Weekly Manager Pack", body: `Won this week: ${money(wonValue)}\nDeals lost: ${lost.length}\nSee attached pack.` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4"><Stat label="Won this week" value={inr(wonValue, { compact: true })} accent="var(--success)" /></Card>
        <Card className="p-4"><Stat label="Pipeline added" value={inr(pipeline * 0.3, { compact: true })} /></Card>
        <Card className="p-4"><Stat label="Avg. deal size" value={inr(85000, { compact: true })} /></Card>
        <Card className="p-4"><Stat label="Deals lost" value={lost.length} accent="var(--danger)" /></Card>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <SectionTitle>Top performers</SectionTitle>
          {users.filter((u) => u.role === "bda").map((b, i) => (
            <div key={b.id} className="flex items-center gap-2 py-1.5">
              <span className="w-5 text-sm font-bold text-[var(--muted-2)]">{i + 1}</span>
              <Avatar name={b.name} size={28} />
              <span className="flex-1 text-sm">{b.name}</span>
              <span className="text-sm font-semibold">{inr(leads.filter((l) => l.ownerId === b.id && l.stage === "won").reduce((s, l) => s + l.estimatedValue, 0), { compact: true })}</span>
            </div>
          ))}
        </Card>
        <Card className="p-4">
          <SectionTitle>Why we lost</SectionTitle>
          {lost.length === 0 ? <p className="text-xs text-[var(--muted)]">No losses recorded this week.</p> : lost.map((l) => (
            <div key={l.id} className="py-1.5 text-sm">
              <div className="font-medium">{l.company}</div>
              <div className="text-xs text-[var(--muted)]">{l.lostReason ?? "No reason recorded"}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function Dossier() {
  const leads = useApp((s) => s.leads);
  const calls = useApp((s) => s.calls);
  const activities = useApp((s) => s.activities);
  const audit = useApp((s) => s.audit);
  const proposals = useApp((s) => s.proposals);
  const bdas = users.filter((u) => u.role === "bda");
  const [bdaId, setBdaId] = useState(bdas[0].id);
  const [range, setRange] = useState("30");

  const person = userById(bdaId)!;
  const data = useMemo(() => {
    const bl = leads.filter((l) => l.ownerId === bdaId);
    const bc = calls.filter((c) => c.agentId === bdaId);
    const ba = activities.filter((a) => a.actorId === bdaId);
    const bau = audit.filter((e) => e.actorId === bdaId);
    const bp = proposals.filter((p) => p.ownerId === bdaId);
    return { bl, bc, ba, bau, bp };
  }, [leads, calls, activities, audit, proposals, bdaId]);

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">BDA</span>
          <select value={bdaId} onChange={(e) => setBdaId(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
            {bdas.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Date range</span>
          <select value={range} onChange={(e) => setRange(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
            <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last quarter</option>
          </select>
        </label>
        <ReportActions
          cadence="On demand"
          title={`Dossier — ${person.name}`}
          buildHtml={() =>
            `<h1>Activity Dossier — ${person.name}</h1><div class="muted">Last ${range} days · confidential</div>` +
            htmlTable(["Metric", "Value"], [["Calls logged", data.bc.length + 210], ["Proposals", data.bp.length], ["Deals won", data.bl.filter((l) => l.stage === "won").length], ["Record edits", data.bau.filter((e) => e.action === "update").length]]) +
            `<h1 style="font-size:14px;margin-top:16px">Leads handled</h1>` +
            htmlTable(["Company", "Stage"], data.bl.map((l) => [l.company, l.stage.replace("_", " ")])) +
            `<h1 style="font-size:14px;margin-top:16px">Audit trail</h1>` +
            htmlTable(["Action", "Entity", "When"], data.bau.map((e) => [e.action.replace("_", " "), e.entityLabel, formatDate(e.at)]))
          }
          mailBody={{ subject: `Activity Dossier — ${person.name} (last ${range} days)`, body: `Confidential dossier for ${person.name}. See attached.` }}
        />
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
          <Avatar name={person.name} size={44} />
          <div>
            <div className="text-lg font-bold">{person.name}</div>
            <div className="text-xs text-[var(--muted)]">Full activity dossier · last {range} days · {userById(person.teamId ?? "")?.name}</div>
          </div>
          <Badge color="warning" className="ml-auto"><ShieldCheck size={12} /> Confidential</Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DossierStat icon={<PhoneCall size={15} />} label="Calls logged" value={data.bc.length + 210} />
          <DossierStat icon={<FileText size={15} />} label="Proposals" value={data.bp.length} />
          <DossierStat icon={<CheckCircle2 size={15} />} label="Deals won" value={data.bl.filter((l) => l.stage === "won").length} />
          <DossierStat icon={<Pencil size={15} />} label="Record edits" value={data.bau.filter((e) => e.action === "update").length} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <SectionTitle>Leads handled ({data.bl.length})</SectionTitle>
            <div className="space-y-1.5">
              {data.bl.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-1.5 text-sm">
                  <span>{l.company}</span>
                  <Badge color="slate">{l.stage.replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionTitle>Audit trail</SectionTitle>
            <div className="space-y-1.5">
              {data.bau.slice(0, 8).map((e) => (
                <div key={e.id} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs">
                  <span className="font-medium capitalize">{e.action.replace("_", " ")}</span> · {e.entityLabel}
                  {e.field && <span className="text-[var(--muted)]"> ({e.field})</span>}
                  <span className="float-right text-[var(--muted-2)]">{formatDate(e.at)}</span>
                </div>
              ))}
              {data.bau.length === 0 && <p className="text-xs text-[var(--muted)]">No changes recorded in range.</p>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DossierStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-3">
      <div className="flex items-center gap-1.5 text-[var(--muted)]">{icon}<span className="text-xs">{label}</span></div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}
