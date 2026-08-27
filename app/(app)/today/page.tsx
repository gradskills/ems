"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import type { Lead, QueueReason } from "@/lib/types";
import { userById } from "@/lib/seed/users";
import { Card, StageBadge, ScoreRing, Button, Badge, ProgressBar, SectionTitle } from "@/components/ui/primitives";
import { CallFlow } from "@/components/bda/CallFlow";
import { CreateLeadModal } from "@/components/bda/CreateLeadModal";
import { inr, formatDate } from "@/lib/utils";
import { PhoneCall, PhoneOutgoing, Clock, Flame, Snowflake, MailOpen, ChevronRight, Target, Sun, Plus } from "lucide-react";

const reasonMeta: Record<QueueReason["kind"], { icon: typeof Flame; color: "danger" | "warning" | "info" | "success" | "primary" }> = {
  callback_due: { icon: Clock, color: "info" },
  followup_due: { icon: PhoneOutgoing, color: "primary" },
  hot_new: { icon: Flame, color: "danger" },
  going_cold: { icon: Snowflake, color: "warning" },
  proposal_opened: { icon: MailOpen, color: "success" },
};

export default function TodayPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const leads = useApp((s) => s.leads);
  const calls = useApp((s) => s.calls);
  const [callLead, setCallLead] = useState<Lead | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const me = userById(actingUserId)!;

  const queue = useMemo(
    () =>
      leads
        .filter((l) => l.ownerId === actingUserId && l.queueReason && !["won", "lost"].includes(l.stage))
        .sort((a, b) => b.score - a.score),
    [leads, actingUserId]
  );

  // today's activity metrics
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todaysCalls = calls.filter((c) => c.agentId === actingUserId && new Date(c.at) >= startOfDay);
  const connects = todaysCalls.filter((c) => c.disposition === "connected").length;
  const callTarget = 20;
  const meetings = queue.filter((l) => l.stage === "negotiation").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
            <Sun size={14} /> {formatDate(new Date().toISOString())}
          </div>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight">Good morning, {me.name.split(" ")[0]}</h1>
          <p className="text-sm text-[var(--muted)]">
            {queue.length} leads need you today. Work the list top to bottom — highest priority first.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} /> New lead</Button>
      </div>

      {/* Target tracker */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard icon={<PhoneOutgoing size={16} />} label="Calls today" value={todaysCalls.length} target={callTarget} />
        <MetricCard icon={<PhoneCall size={16} />} label="Connects" value={connects} target={12} color="var(--success)" />
        <MetricCard icon={<Target size={16} />} label="In negotiation" value={meetings} sub="live deals" />
        <MetricCard
          icon={<Flame size={16} />}
          label="Pipeline (mine)"
          value={inr(queue.reduce((s, l) => s + l.estimatedValue, 0), { compact: true })}
          sub={`${queue.length} open`}
          raw
        />
      </div>

      {/* Queue */}
      <div>
        <SectionTitle action={<Link href="/leads" className="text-xs font-medium text-[var(--primary)]">All leads →</Link>}>
          Today&apos;s call list
        </SectionTitle>
        <div className="space-y-2.5">
          {queue.map((lead) => {
            const meta = lead.queueReason ? reasonMeta[lead.queueReason.kind] : reasonMeta.followup_due;
            const RIcon = meta.icon;
            return (
              <Card key={lead.id} className="lift overflow-hidden">
                <div className="flex items-stretch">
                  <div className="w-1" style={{ background: `var(--${meta.color})` }} />
                  <div className="flex flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <ScoreRing score={lead.score} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/leads/${lead.id}`} className="truncate font-semibold hover:text-[var(--primary)]">
                          {lead.company}
                        </Link>
                        <StageBadge stage={lead.stage} />
                        {lead.tags.includes("no-website") && <Badge color="danger">no website</Badge>}
                      </div>
                      <div className="mt-0.5 text-sm text-[var(--muted)]">
                        {lead.contactName} · {lead.role} · {lead.city}
                      </div>
                      <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: `var(--${meta.color})` }}>
                        <RIcon size={13} /> {lead.queueReason?.label}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <div className="text-right">
                        <div className="text-sm font-bold">{inr(lead.estimatedValue, { compact: true })}</div>
                        <div className="text-[11px] text-[var(--muted-2)]">est. value</div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="success" onClick={() => setCallLead(lead)}>
                          <PhoneCall size={14} /> Call
                        </Button>
                        <Link href={`/leads/${lead.id}`}>
                          <Button size="sm" variant="outline">
                            <ChevronRight size={14} />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {callLead && <CallFlow lead={callLead} open={!!callLead} onClose={() => setCallLead(null)} />}
      <CreateLeadModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  target,
  sub,
  color,
  raw,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  target?: number;
  sub?: string;
  color?: string;
  raw?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[var(--muted)]">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="mt-1.5 text-2xl font-bold tracking-tight" style={color ? { color } : undefined}>
        {value}
        {target && !raw && <span className="text-sm font-medium text-[var(--muted-2)]"> / {target}</span>}
      </div>
      {target && !raw ? (
        <ProgressBar className="mt-2" value={typeof value === "number" ? value : 0} max={target} color={color ?? "var(--primary)"} />
      ) : (
        sub && <div className="mt-0.5 text-xs text-[var(--muted-2)]">{sub}</div>
      )}
    </Card>
  );
}
