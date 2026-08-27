"use client";

import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Card, Badge, Avatar, ProgressBar } from "@/components/ui/primitives";
import { clientStatusColor } from "@/lib/ems";
import { inr, formatDate } from "@/lib/utils";
import { ChevronLeft, CheckCircle2, Circle } from "lucide-react";

const campaignColor = { running: "success", scheduled: "info", completed: "slate", draft: "warning", paused: "warning" } as const;

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const clients = useApp((s) => s.clients);
  const campaigns = useApp((s) => s.campaigns);
  const content = useApp((s) => s.content);

  const c = clients.find((x) => x.id === params.id);
  if (!c) return notFound();

  const owner = userById(c.ownerId);
  const clientCampaigns = campaigns.filter((x) => x.clientId === c.id);
  const clientContent = content.filter((x) => x.clientId === c.id);

  return (
    <div className="space-y-5">
      <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"><ChevronLeft size={16} /> All clients</Link>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2"><h1 className="text-2xl font-bold tracking-tight">{c.company}</h1><Badge color={clientStatusColor[c.status]} dot>{c.status}</Badge></div>
            <p className="text-sm text-[var(--muted)]">{c.contact} · since {formatDate(c.since)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{c.platforms.map((p) => <Badge key={p} color="purple">{p}</Badge>)}</div>
          </div>
          <div className="text-right"><div className="text-lg font-bold">{inr(c.monthlyRetainer)}</div><div className="text-[11px] text-[var(--muted)]">monthly retainer</div></div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Deliverables — sold vs delivered</h3>
          <div className="space-y-3">
            {c.deliverables.map((d) => {
              const pct = d.soldQty ? Math.round((d.deliveredQty / d.soldQty) * 100) : 0;
              const creep = d.deliveredQty > d.soldQty;
              return (
                <div key={d.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{d.label}</span>
                    <span className={creep ? "text-[var(--danger)]" : ""}>{d.deliveredQty}/{d.soldQty} {d.approvedByClient ? "✓" : ""}</span>
                  </div>
                  <ProgressBar value={Math.min(pct, 100)} color={pct >= 80 ? "var(--success)" : "var(--warning)"} />
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--muted)]"><Avatar name={owner?.name ?? "?"} size={18} /> Managed by {owner?.name}</div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Campaigns</h3>
          <div className="space-y-2">
            {clientCampaigns.map((cm) => (
              <div key={cm.id} className="rounded-lg border border-[var(--border)] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{cm.name}</span>
                  <Badge color={campaignColor[cm.status]}>{cm.status}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-[var(--muted)]">
                  <span>{cm.channel}</span>
                  {cm.reach > 0 && <span>Reach {(cm.reach / 1000).toFixed(0)}k</span>}
                  {cm.engagement > 0 && <span>Eng {cm.engagement}%</span>}
                  {cm.leads > 0 && <span>{cm.leads} leads</span>}
                  {cm.spend > 0 && <span>{inr(cm.spend, { compact: true })}</span>}
                </div>
              </div>
            ))}
            {clientCampaigns.length === 0 && <div className="py-4 text-center text-xs text-[var(--muted)]">No campaigns</div>}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold">Content pipeline</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {clientContent.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-2.5">
              {p.status === "published" || p.status === "approved" ? <CheckCircle2 size={15} className="text-[var(--success)]" /> : <Circle size={15} className="text-[var(--muted-2)]" />}
              <div className="min-w-0 flex-1"><div className="truncate text-sm">{p.title}</div><div className="text-[11px] text-[var(--muted-2)]">{p.channel} · {formatDate(p.scheduledAt)}</div></div>
              <Badge color={p.status === "pending_approval" ? "warning" : p.status === "published" ? "success" : "slate"}>{p.status.replace("_", " ")}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
