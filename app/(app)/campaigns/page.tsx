"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { Card, Badge, Stat } from "@/components/ui/primitives";
import { PageHeader, TableShell } from "@/components/ems/kit";
import { inr } from "@/lib/utils";
import { userById } from "@/lib/seed/users";
import { Plus, Pencil, ExternalLink, GitBranch } from "lucide-react";
import type { Campaign } from "@/lib/types";
import { CampaignModal } from "@/components/media/CampaignModal";

const campaignColor = { running: "success", scheduled: "info", completed: "slate", draft: "warning", paused: "warning" } as const;

export default function CampaignsPage() {
  const campaigns = useApp((s) => s.campaigns);
  const clients = useApp((s) => s.clients);
  const actingUserId = useApp((s) => s.actingUserId);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const clientName = (id: string) => clients.find((c) => c.id === id)?.company ?? "—";

  const me = userById(actingUserId);
  const canManage = me?.accessLevel === "admin" || me?.accessLevel === "manager";

  const running = campaigns.filter((c) => c.status === "running").length;
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalReach = campaigns.reduce((s, c) => s + c.reach, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Campaigns" subtitle={`${running} running`} />
        {canManage && (
          <button onClick={() => setCreateOpen(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3.5 py-2 text-sm font-medium text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]">
            <Plus size={16} /> New campaign
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4"><Stat label="Total reach" value={`${(totalReach / 1000).toFixed(0)}k`} /></Card>
        <Card className="p-4"><Stat label="Leads generated" value={totalLeads} accent="var(--success)" /></Card>
        <Card className="p-4"><Stat label="Ad spend" value={inr(totalSpend, { compact: true })} /></Card>
        <Card className="p-4"><Stat label="Cost / lead" value={totalLeads ? inr(Math.round(totalSpend / totalLeads)) : "—"} /></Card>
      </div>

      <Card className="overflow-hidden">
        <TableShell head={<><th className="px-4 py-3">Campaign</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Reach</th><th className="px-4 py-3">Eng.</th><th className="px-4 py-3">Leads</th><th className="px-4 py-3">Spend</th><th className="px-4 py-3">Links</th>{canManage && <th className="px-4 py-3"></th>}</>}>
          {campaigns.map((c) => (
            <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
              <td className="px-4 py-3 font-medium">{c.name}</td>
              <td className="px-4 py-3"><Link href={`/clients/${c.clientId}`} className="text-[var(--muted)] hover:text-[var(--primary)]">{clientName(c.clientId)}</Link></td>
              <td className="px-4 py-3 text-xs">{c.channel}</td>
              <td className="px-4 py-3"><Badge color={campaignColor[c.status]} dot>{c.status}</Badge></td>
              <td className="px-4 py-3">{c.reach ? `${(c.reach / 1000).toFixed(0)}k` : "—"}</td>
              <td className="px-4 py-3">{c.engagement ? `${c.engagement}%` : "—"}</td>
              <td className="px-4 py-3 font-semibold">{c.leads || "—"}</td>
              <td className="px-4 py-3">{c.spend ? inr(c.spend, { compact: true }) : "—"}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  {c.checkUrl && <a href={c.checkUrl} target="_blank" rel="noreferrer" title="Check status" className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-2)] px-2 py-1 text-[11px] font-medium hover:bg-[var(--border)]"><GitBranch size={12} /> Status</a>}
                  {c.liveUrl && <a href={c.liveUrl} target="_blank" rel="noreferrer" title="Live preview" className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-2)] px-2 py-1 text-[11px] font-medium hover:bg-[var(--border)]"><ExternalLink size={12} /> Live</a>}
                  {!c.checkUrl && !c.liveUrl && <span className="text-[11px] text-[var(--muted-2)]">—</span>}
                </div>
              </td>
              {canManage && (
                <td className="px-4 py-3">
                  <button onClick={() => setEditing(c)} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--foreground)]" title="Edit campaign">
                    <Pencil size={15} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </TableShell>
      </Card>

      <CampaignModal campaign={null} open={createOpen} onClose={() => setCreateOpen(false)} />
      <CampaignModal key={editing?.id ?? "none"} campaign={editing} open={!!editing} onClose={() => setEditing(null)} />
    </div>
  );
}
