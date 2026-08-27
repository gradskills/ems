"use client";

import Link from "next/link";
import { useApp } from "@/lib/store";
import { Card, Badge, ProgressBar, SectionTitle, Stat } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ems/kit";
import { clientStatusColor } from "@/lib/ems";
import { inr, formatDate } from "@/lib/utils";
import { Megaphone, CalendarDays, BarChart3 } from "lucide-react";

const contentStatusColor: Record<string, "slate" | "info" | "warning" | "success" | "purple" | "primary"> = {
  idea: "slate", draft: "info", pending_approval: "warning", approved: "success", scheduled: "purple", published: "primary",
};

export default function MediaDashboardPage() {
  const clients = useApp((s) => s.clients);
  const campaigns = useApp((s) => s.campaigns);
  const content = useApp((s) => s.content);

  const active = clients.filter((c) => c.status === "active");
  const mrr = clients.filter((c) => c.status === "active" || c.status === "onboarding").reduce((s, c) => s + c.monthlyRetainer, 0);
  const running = campaigns.filter((c) => c.status === "running");
  const pendingContent = content.filter((c) => c.status === "pending_approval");
  const upcoming = content
    .filter((c) => c.status === "scheduled" || c.status === "approved")
    .sort((a, b) => (a.scheduledAt < b.scheduledAt ? -1 : 1))
    .slice(0, 6);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.company ?? "—";

  return (
    <div className="space-y-5">
      <PageHeader title="Media Dashboard" subtitle={`${clients.length} clients · ${campaigns.length} campaigns`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4"><Stat label="Active clients" value={active.length} sub={`${clients.length} total`} /></Card>
        <Card className="p-4"><Stat label="Monthly retainer" value={inr(mrr, { compact: true })} accent="var(--success)" /></Card>
        <Card className="p-4"><Stat label="Running campaigns" value={running.length} /></Card>
        <Card className="p-4"><Stat label="Content to approve" value={pendingContent.length} accent={pendingContent.length ? "var(--warning)" : undefined} /></Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionTitle action={<Link href="/clients" className="text-xs text-[var(--primary)] hover:underline">All clients</Link>}>
            <span className="flex items-center gap-1.5"><Megaphone size={15} /> Clients &amp; delivery</span>
          </SectionTitle>
          <div className="space-y-2">
            {clients.slice(0, 6).map((c) => {
              const sold = c.deliverables.reduce((s, d) => s + d.soldQty, 0);
              const done = c.deliverables.reduce((s, d) => s + d.deliveredQty, 0);
              const pct = sold ? Math.round((done / sold) * 100) : 0;
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.company}</div>
                    <div className="truncate text-xs text-[var(--muted)]">{c.platforms.join(" · ")}</div>
                  </div>
                  <Badge color={clientStatusColor[c.status]} dot>{c.status}</Badge>
                  <div className="w-24"><ProgressBar value={pct} /><div className="mt-0.5 text-right text-[10px] text-[var(--muted-2)]">{done}/{sold}</div></div>
                </div>
              );
            })}
            {clients.length === 0 && <p className="text-xs text-[var(--muted)]">No clients yet.</p>}
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle action={<Link href="/content" className="text-xs text-[var(--primary)] hover:underline">Calendar</Link>}>
            <span className="flex items-center gap-1.5"><CalendarDays size={15} /> Upcoming content</span>
          </SectionTitle>
          <div className="space-y-2">
            {upcoming.map((p) => (
              <div key={p.id} className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{p.title}</span>
                  <Badge color={contentStatusColor[p.status] ?? "slate"}>{p.status.replace("_", " ")}</Badge>
                </div>
                <div className="text-[11px] text-[var(--muted-2)]">{clientName(p.clientId)} · {p.channel} · {formatDate(p.scheduledAt)}</div>
              </div>
            ))}
            {upcoming.length === 0 && <p className="text-xs text-[var(--muted)]">Nothing scheduled.</p>}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <SectionTitle action={<Link href="/campaigns" className="text-xs text-[var(--primary)] hover:underline">All campaigns</Link>}>
          <span className="flex items-center gap-1.5"><BarChart3 size={15} /> Campaign performance</span>
        </SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                <th className="py-2">Campaign</th><th className="py-2">Client</th><th className="py-2">Channel</th><th className="py-2">Reach</th><th className="py-2">Engagement</th><th className="py-2">Leads</th><th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.slice(0, 8).map((c) => (
                <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2.5 font-medium">{c.name}</td>
                  <td className="py-2.5 text-[var(--muted)]">{clientName(c.clientId)}</td>
                  <td className="py-2.5 text-[var(--muted)]">{c.channel}</td>
                  <td className="py-2.5">{c.reach.toLocaleString("en-IN")}</td>
                  <td className="py-2.5">{c.engagement}%</td>
                  <td className="py-2.5">{c.leads}</td>
                  <td className="py-2.5"><Badge color={c.status === "running" ? "success" : c.status === "completed" ? "info" : "slate"} dot>{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
