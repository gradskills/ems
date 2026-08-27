"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import type { DeliveryStage } from "@/lib/types";
import { Card, Badge, Button, ProgressBar, SectionTitle } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";
import { NOW } from "@/lib/clock";
import {
  Boxes, CheckCircle2, Circle, AlertTriangle, Repeat, CalendarClock, Heart,
  Rocket, PenTool, Code2, FileText, Eye, PartyPopper, Monitor, ThumbsUp,
} from "lucide-react";

const stageSteps: { key: DeliveryStage; label: string; icon: typeof Rocket }[] = [
  { key: "onboarding", label: "Onboarding", icon: Rocket },
  { key: "design", label: "Design", icon: PenTool },
  { key: "development", label: "Development", icon: Code2 },
  { key: "content", label: "Content", icon: FileText },
  { key: "review", label: "Review", icon: Eye },
  { key: "launched", label: "Launched", icon: PartyPopper },
];

export default function DeliveryPage() {
  const delivery = useApp((s) => s.delivery);
  const [selId, setSelId] = useState(delivery[0]?.id);
  const project = delivery.find((d) => d.id === selId)!;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Boxes size={22} className="text-[var(--primary)]" /> Delivery</h1>
        <p className="text-sm text-[var(--muted)]">Won deals in production — onboarding, deliverables tracked against what was sold, and client sign-off.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {delivery.map((d) => {
          const active = d.id === selId;
          const sold = d.deliverables.reduce((s, x) => s + x.soldQty, 0);
          const done = d.deliverables.reduce((s, x) => s + Math.min(x.deliveredQty, x.soldQty), 0);
          return (
            <button key={d.id} onClick={() => setSelId(d.id)} className="text-left">
              <Card className={`lift p-4 ${active ? "ring-2 ring-[var(--primary)]" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{d.company}</div>
                  {d.retainer && <Badge color="purple"><Repeat size={11} /> retainer</Badge>}
                </div>
                <div className="mt-1 text-xs capitalize text-[var(--muted)]">{d.type.replace("_", " ")} · {d.stage}</div>
                <ProgressBar className="mt-2" value={done} max={sold} color="var(--success)" />
                <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--muted-2)]">
                  <span>{done}/{sold} delivered</span>
                  <span className="flex items-center gap-1"><Heart size={11} className={d.healthScore >= 75 ? "text-[var(--success)]" : "text-[var(--warning)]"} /> {d.healthScore}% health</span>
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      {project && <ProjectDetail projectId={project.id} />}
    </div>
  );
}

function ProjectDetail({ projectId }: { projectId: string }) {
  const project = useApp((s) => s.delivery.find((d) => d.id === projectId))!;
  const toggle = useApp((s) => s.toggleOnboarding);
  const approve = useApp((s) => s.approveDeliverable);
  const owner = userById(project.ownerId);
  const currentStageIdx = stageSteps.findIndex((s) => s.key === project.stage);
  const onboardDone = project.onboarding.filter((t) => t.done).length;

  return (
    <div className="space-y-5">
      {/* Stage stepper */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{project.company}</h2>
            <div className="text-xs text-[var(--muted)]">Owner {owner?.name} · started {formatDate(project.startedAt)}</div>
          </div>
          {project.retainer && project.retainerEndsAt && <RenewalBadge endsAt={project.retainerEndsAt} />}
        </div>
        <div className="flex items-center overflow-x-auto pb-2">
          {stageSteps.map((step, i) => {
            const done = i < currentStageIdx;
            const current = i === currentStageIdx;
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${done ? "bg-[var(--success)] text-white" : current ? "bg-[var(--primary)] text-white pulse-ring" : "bg-[var(--surface-2)] text-[var(--muted-2)]"}`}>
                    <Icon size={18} />
                  </div>
                  <span className={`whitespace-nowrap text-[11px] font-medium ${current ? "text-[var(--primary)]" : "text-[var(--muted)]"}`}>{step.label}</span>
                </div>
                {i < stageSteps.length - 1 && <div className={`mx-1 h-0.5 w-8 sm:w-14 ${done ? "bg-[var(--success)]" : "bg-[var(--border)]"}`} />}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Onboarding checklist */}
        <Card className="p-4">
          <SectionTitle action={<Badge color={onboardDone === project.onboarding.length ? "success" : "warning"}>{onboardDone}/{project.onboarding.length}</Badge>}>
            Client onboarding
          </SectionTitle>
          <div className="space-y-1.5">
            {project.onboarding.map((t) => (
              <button key={t.id} onClick={() => toggle(project.id, t.id)} className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-[var(--surface-2)]">
                {t.done ? <CheckCircle2 size={18} className="shrink-0 text-[var(--success)]" /> : <Circle size={18} className="shrink-0 text-[var(--muted-2)]" />}
                <span className={`text-sm ${t.done ? "text-[var(--muted)] line-through" : ""}`}>{t.label}</span>
              </button>
            ))}
          </div>
          {onboardDone < project.onboarding.length && (
            <div className="mt-2 rounded-lg bg-[var(--warning-soft)]/50 px-3 py-2 text-xs text-[var(--warning)]">
              Auto-reminder sent to client for {project.onboarding.length - onboardDone} pending item(s).
            </div>
          )}
        </Card>

        {/* Deliverable tracker + scope creep */}
        <Card className="p-4">
          <SectionTitle>Deliverables — sold vs delivered</SectionTitle>
          <div className="space-y-3">
            {project.deliverables.map((d) => {
              const overScope = d.deliveredQty > d.soldQty;
              return (
                <div key={d.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{d.label}{d.period && <span className="text-[var(--muted-2)]"> · {d.period}</span>}</span>
                    <span className={overScope ? "font-semibold text-[var(--danger)]" : "text-[var(--muted)]"}>{d.deliveredQty}/{d.soldQty}</span>
                  </div>
                  <ProgressBar className="mt-1" value={Math.min(d.deliveredQty, d.soldQty)} max={d.soldQty} color={overScope ? "var(--danger)" : "var(--success)"} />
                  {overScope && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[var(--danger)]">
                      <AlertTriangle size={12} /> Scope creep — {d.deliveredQty - d.soldQty} over contract. Flag for upsell or stop.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Client portal preview */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
          <Monitor size={16} className="text-[var(--primary)]" />
          <span className="text-sm font-semibold">Client portal preview</span>
          <Badge color="info" className="ml-auto">what {project.company} sees</Badge>
        </div>
        <div className="p-5">
          <div className="mb-3 text-sm text-[var(--muted)]">Your team&apos;s work is ready for your approval:</div>
          <div className="space-y-2">
            {project.deliverables.filter((d) => d.deliveredQty > 0).map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]"><FileText size={17} /></div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{d.label}</div>
                  <div className="text-xs text-[var(--muted)]">{Math.min(d.deliveredQty, d.soldQty)} items ready to review</div>
                </div>
                {d.approvedByClient ? (
                  <Badge color="success" dot><CheckCircle2 size={12} /> Approved</Badge>
                ) : (
                  <Button size="sm" variant="success" onClick={() => approve(project.id, d.id)}><ThumbsUp size={14} /> Approve</Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function RenewalBadge({ endsAt }: { endsAt: string }) {
  const days = Math.round((new Date(endsAt).getTime() - NOW) / 86400000);
  const soon = days <= 30;
  return (
    <div className={`rounded-xl border px-3 py-2 text-right ${soon ? "border-[var(--warning-soft)] bg-[var(--warning-soft)]/50" : "border-[var(--border)]"}`}>
      <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: soon ? "var(--warning)" : "var(--muted)" }}>
        <CalendarClock size={13} /> Retainer renews in {days}d
      </div>
      <div className="text-[11px] text-[var(--muted-2)]">{soon ? "Renewal reminder scheduled" : "Healthy"} · {formatDate(endsAt)}</div>
    </div>
  );
}
