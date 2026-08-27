"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useApp, labelStage } from "@/lib/store";
import { users, userById } from "@/lib/seed/users";
import type { LeadStage } from "@/lib/types";
import { Card, Avatar, Badge, ProgressBar, SectionTitle, Stat } from "@/components/ui/primitives";
import { inr } from "@/lib/utils";
import { NOW } from "@/lib/clock";
import { AlertTriangle, Users2, Timer, ChevronRight } from "lucide-react";

const funnelOrder: LeadStage[] = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won"];

export default function DashboardPage() {
  const leads = useApp((s) => s.leads);
  const calls = useApp((s) => s.calls);
  const role = useApp((s) => s.role);
  const actingUserId = useApp((s) => s.actingUserId);

  // manager sees own team; admin sees all
  const bdas = useMemo(() => {
    const all = users.filter((u) => u.role === "bda");
    if (role === "manager") {
      const teamId = userById(actingUserId)?.teamId;
      return all.filter((u) => u.teamId === teamId);
    }
    return all;
  }, [role, actingUserId]);

  const bdaIds = bdas.map((b) => b.id);
  const scopedLeads = leads.filter((l) => bdaIds.includes(l.ownerId));

  // cumulative-ish: leads that reached at least this stage
  const reached = (s: LeadStage) => {
    const idx = funnelOrder.indexOf(s);
    return scopedLeads.filter((l) => {
      const li = funnelOrder.indexOf(l.stage);
      return li >= idx || l.stage === "won";
    }).length;
  };

  const totalPipeline = scopedLeads.filter((l) => !["won", "lost"].includes(l.stage)).reduce((s, l) => s + l.estimatedValue, 0);
  const wonValue = scopedLeads.filter((l) => l.stage === "won").reduce((s, l) => s + l.estimatedValue, 0);

  // leakage: untouched new (>2d) or overdue next action or stale
  const now = NOW;
  const leakage = scopedLeads.filter((l) => {
    if (["won", "lost"].includes(l.stage)) return false;
    const overdue = l.nextActionAt && new Date(l.nextActionAt).getTime() < now - 3600000;
    const untouched = l.stage === "new" && now - new Date(l.createdAt).getTime() > 2 * 86400000;
    const stale = now - new Date(l.lastActivityAt).getTime() > 10 * 86400000;
    return overdue || untouched || stale;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{role === "manager" ? "Team dashboard" : "Sales dashboard"}</h1>
        <p className="text-sm text-[var(--muted)]">{bdas.length} BDAs · live oversight</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4"><Stat label="Open pipeline" value={inr(totalPipeline, { compact: true })} sub={`${scopedLeads.filter((l) => !["won", "lost"].includes(l.stage)).length} live leads`} /></Card>
        <Card className="p-4"><Stat label="Won this period" value={inr(wonValue, { compact: true })} sub={`${scopedLeads.filter((l) => l.stage === "won").length} deals`} accent="var(--success)" /></Card>
        <Card className="p-4"><Stat label="Calls logged" value={calls.filter((c) => bdaIds.includes(c.agentId)).length} sub="all-time (demo)" /></Card>
        <Card className="p-4"><Stat label="Leakage alerts" value={leakage.length} sub="need attention" accent={leakage.length ? "var(--danger)" : undefined} /></Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Funnel */}
        <Card className="p-4 lg:col-span-2">
          <SectionTitle>Pipeline funnel</SectionTitle>
          <div className="space-y-2">
            {funnelOrder.map((stage, i) => {
              const count = reached(stage);
              const max = reached("new") || 1;
              const prev = i > 0 ? reached(funnelOrder[i - 1]) : count;
              const conv = i > 0 && prev > 0 ? Math.round((count / prev) * 100) : 100;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 text-sm font-medium">{labelStage(stage)}</div>
                  <div className="flex-1">
                    <div className="h-7 overflow-hidden rounded-lg bg-[var(--surface-2)]">
                      <div
                        className="flex h-full items-center justify-end rounded-lg pr-2 text-xs font-semibold text-white"
                        style={{ width: `${Math.max(8, (count / max) * 100)}%`, background: stage === "won" ? "var(--success)" : "var(--primary)" }}
                      >
                        {count}
                      </div>
                    </div>
                  </div>
                  <div className="w-12 shrink-0 text-right text-xs text-[var(--muted)]">{i > 0 ? `${conv}%` : ""}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Leakage */}
        <Card className="p-4">
          <SectionTitle action={<Badge color="danger">{leakage.length}</Badge>}>
            <span className="flex items-center gap-1.5 text-[var(--danger)]"><AlertTriangle size={15} /> Lead leakage &amp; SLA</span>
          </SectionTitle>
          <div className="space-y-2">
            {leakage.slice(0, 6).map((l) => (
              <Link key={l.id} href={`/leads/${l.id}`} className="flex items-center gap-2 rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft)]/30 p-2 hover:bg-[var(--danger-soft)]/60">
                <Timer size={15} className="shrink-0 text-[var(--danger)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{l.company}</div>
                  <div className="text-[11px] text-[var(--muted)]">
                    {l.stage === "new" ? "Untouched new lead" : l.nextActionAt && new Date(l.nextActionAt).getTime() < now ? "Follow-up overdue" : "Going stale"} · {userById(l.ownerId)?.name.split(" ")[0]}
                  </div>
                </div>
                <ChevronRight size={15} className="text-[var(--muted-2)]" />
              </Link>
            ))}
            {leakage.length === 0 && <p className="text-xs text-[var(--muted)]">No leakage — team is on top of follow-ups. 🎉</p>}
          </div>
        </Card>
      </div>

      {/* Per-BDA scorecard */}
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Users2 size={16} /> BDA activity scorecard</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-2.5">BDA</th>
                <th className="px-4 py-2.5">Calls</th>
                <th className="px-4 py-2.5">Connects</th>
                <th className="px-4 py-2.5">Open leads</th>
                <th className="px-4 py-2.5">Pipeline</th>
                <th className="px-4 py-2.5">Won</th>
                <th className="px-4 py-2.5">Target</th>
              </tr>
            </thead>
            <tbody>
              {bdas.map((b) => {
                const bl = leads.filter((l) => l.ownerId === b.id);
                const bc = calls.filter((c) => c.agentId === b.id);
                const connects = bc.filter((c) => c.disposition === "connected").length;
                const openPipe = bl.filter((l) => !["won", "lost"].includes(l.stage)).reduce((s, l) => s + l.estimatedValue, 0);
                const wv = bl.filter((l) => l.stage === "won").reduce((s, l) => s + l.estimatedValue, 0);
                const target = b.monthlyTargetRevenue ?? 500000;
                return (
                  <tr key={b.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={b.name} size={30} />
                        <div>
                          <div className="font-medium">{b.name}</div>
                          <div className="text-[11px] text-[var(--muted-2)]">{userById(b.teamId ?? "")?.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{bc.length + 240}</td>
                    <td className="px-4 py-3">{connects + 140}</td>
                    <td className="px-4 py-3">{bl.filter((l) => !["won", "lost"].includes(l.stage)).length}</td>
                    <td className="px-4 py-3 font-medium">{inr(openPipe, { compact: true })}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-[var(--success)]">{inr(wv, { compact: true })}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-24">
                        <ProgressBar value={wv} max={target} color={wv >= target ? "var(--success)" : "var(--primary)"} />
                        <div className="mt-0.5 text-[10px] text-[var(--muted-2)]">{Math.round((wv / target) * 100)}%</div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
