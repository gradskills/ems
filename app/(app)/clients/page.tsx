"use client";

import Link from "next/link";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Card, Badge, Avatar, ProgressBar, Stat } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ems/kit";
import { clientStatusColor } from "@/lib/ems";
import { inr } from "@/lib/utils";

export default function ClientsPage() {
  const clients = useApp((s) => s.clients);
  const active = clients.filter((c) => c.status === "active").length;
  const mrr = clients.filter((c) => c.status === "active" || c.status === "onboarding").reduce((s, c) => s + c.monthlyRetainer, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Clients" subtitle={`${active} active · media & marketing`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4"><Stat label="Active clients" value={active} /></Card>
        <Card className="p-4"><Stat label="Monthly retainer" value={inr(mrr, { compact: true })} /></Card>
        <Card className="p-4"><Stat label="Total clients" value={clients.length} /></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {clients.map((c) => {
          const owner = userById(c.ownerId);
          const totalSold = c.deliverables.reduce((s, d) => s + d.soldQty, 0);
          const totalDelivered = c.deliverables.reduce((s, d) => s + d.deliveredQty, 0);
          const pct = totalSold ? Math.round((totalDelivered / totalSold) * 100) : 0;
          return (
            <Link key={c.id} href={`/clients/${c.id}`}>
              <Card className="lift h-full p-5">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{c.company}</div>
                    <div className="text-xs text-[var(--muted)]">{c.contact}</div>
                  </div>
                  <Badge color={clientStatusColor[c.status]} dot>{c.status}</Badge>
                </div>
                <div className="mb-3 flex flex-wrap gap-1.5">{c.platforms.map((p) => <Badge key={p} color="purple">{p}</Badge>)}</div>
                <div className="mb-1 flex items-center justify-between text-xs"><span className="text-[var(--muted)]">Deliverables this month</span><span className="font-medium">{totalDelivered}/{totalSold}</span></div>
                <ProgressBar value={pct} color={pct >= 80 ? "var(--success)" : "var(--warning)"} />
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5"><Avatar name={owner?.name ?? "?"} size={22} /><span className="text-[11px] text-[var(--muted)]">{owner?.name}</span></div>
                  <span className="text-sm font-semibold">{inr(c.monthlyRetainer, { compact: true })}/mo</span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
