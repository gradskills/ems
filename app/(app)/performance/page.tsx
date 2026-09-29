"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Card, ProgressBar, SectionTitle, Badge } from "@/components/ui/primitives";
import { inr } from "@/lib/utils";
import { startOfMonthISO } from "@/lib/bda";
import type { Call } from "@/lib/types";
import { PhoneOutgoing, PhoneCall, Trophy, Target, Coins, TrendingUp, Flame } from "lucide-react";

const COMMISSION = 0.08; // 8% of won deal value

export default function PerformancePage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const leads = useApp((s) => s.leads);
  const calls = useApp((s) => s.calls);
  const invoices = useApp((s) => s.invoices);
  const me = userById(actingUserId)!;

  const myLeads = useMemo(() => leads.filter((l) => l.ownerId === actingUserId), [leads, actingUserId]);
  const myCalls = useMemo(() => calls.filter((c) => c.agentId === actingUserId), [calls, actingUserId]);
  const monthStart = startOfMonthISO();
  const monthCalls = myCalls.filter((c) => c.at >= monthStart);
  const monthConnects = monthCalls.filter((c) => c.disposition === "connected").length;
  const connectRate = monthCalls.length ? Math.round((monthConnects / monthCalls.length) * 100) : null;

  const won = myLeads.filter((l) => l.stage === "won");
  const lost = myLeads.filter((l) => l.stage === "lost");
  const winRate = won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : null;
  const wonValue = won.reduce((s, l) => s + l.estimatedValue, 0);
  const pipeline = myLeads.filter((l) => !["won", "lost"].includes(l.stage)).reduce((s, l) => s + l.estimatedValue, 0);
  const commission = Math.round(wonValue * COMMISSION);
  // incentive on money actually collected against my won deals' invoices
  const wonIds = new Set(won.map((l) => l.id));
  const collected = invoices.filter((i) => wonIds.has(i.leadId)).reduce((s, i) => s + (i.received || 0), 0);
  const commissionPaid = Math.round(collected * COMMISSION);

  const targetRev = me.monthlyTargetRevenue;
  const targetCalls = me.monthlyTargetCalls;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My performance</h1>
        <p className="hidden text-sm text-[var(--muted)] lg:block">{me.name}</p>
      </div>

      {/* Commission — the adoption driver */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 bg-gradient-to-r from-[var(--success)] to-[#0f9d58] p-5 text-white sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
            <Coins size={28} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium opacity-90">Incentive earned (8% of won deals)</div>
            <div className="text-3xl font-bold">{inr(commission)}</div>
            <div className="text-xs opacity-80">from {won.length} closed deal{won.length === 1 ? "" : "s"} worth {inr(wonValue)}</div>
          </div>
          <div className="rounded-xl bg-white/15 px-4 py-2 text-center">
            <div className="text-xs opacity-80">Paid on collection</div>
            <div className="text-lg font-bold">{inr(commissionPaid)}</div>
            <div className="text-[10px] opacity-70">{inr(collected, { compact: true })} received on invoices</div>
          </div>
        </div>
      </Card>

      {/* Targets */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><Target size={16} className="text-[var(--primary)]" /> Revenue target</div>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl font-bold">{inr(wonValue, { compact: true })}</span>
            <span className="text-sm text-[var(--muted)]">{targetRev ? `of ${inr(targetRev, { compact: true })}` : "won"}</span>
          </div>
          {targetRev ? (
            <>
              <ProgressBar className="mt-2" value={wonValue} max={targetRev} color="var(--primary)" />
              <div className="mt-1 text-xs text-[var(--muted)]">{Math.round((wonValue / targetRev) * 100)}% achieved</div>
            </>
          ) : (
            <div className="mt-2 text-xs text-[var(--muted)]">No revenue target set — ask your manager to add one.</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><PhoneOutgoing size={16} className="text-[var(--info)]" /> Calls this month</div>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl font-bold">{monthCalls.length}</span>
            <span className="text-sm text-[var(--muted)]">{targetCalls ? `of ${targetCalls}` : "logged"}</span>
          </div>
          {targetCalls ? (
            <>
              <ProgressBar className="mt-2" value={monthCalls.length} max={targetCalls} color="var(--info)" />
              <div className="mt-1 text-xs text-[var(--muted)]">{Math.round((monthCalls.length / targetCalls) * 100)}% of monthly goal</div>
            </>
          ) : (
            <div className="mt-2 text-xs text-[var(--muted)]">No calls target set.</div>
          )}
        </Card>
      </div>

      {/* Funnel stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat icon={<PhoneOutgoing size={15} />} label="Dials (month)" value={monthCalls.length} />
        <MiniStat icon={<PhoneCall size={15} />} label="Connect rate" value={connectRate == null ? "—" : `${connectRate}%`} color="var(--success)" />
        <MiniStat icon={<TrendingUp size={15} />} label="Open pipeline" value={inr(pipeline, { compact: true })} />
        <MiniStat icon={<Trophy size={15} />} label="Win rate" value={winRate == null ? "—" : `${winRate}%`} color="var(--purple)" />
      </div>

      {/* Best time to call — from your own logged calls */}
      <Card className="p-4">
        <SectionTitle action={<Badge color="success">Your connect rate by hour</Badge>}>
          <span className="flex items-center gap-1.5"><Flame size={14} className="text-[var(--danger)]" /> Best time to call</span>
        </SectionTitle>
        <Heatmap calls={myCalls} />
      </Card>
    </div>
  );
}

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 text-[var(--muted)]">{icon}<span className="text-xs font-medium">{label}</span></div>
      <div className="mt-1 text-xl font-bold" style={color ? { color } : undefined}>{value}</div>
    </Card>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; // getDay() 1..6
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const hourLabel = (h: number) => `${h > 12 ? h - 12 : h}`;
const MIN_CALLS = 3; // don't call a slot "best" on one lucky dial

function Heatmap({ calls }: { calls: Call[] }) {
  // [day][hour] → { total, connected }
  const grid = useMemo(() => {
    const g = DAYS.map(() => HOURS.map(() => ({ total: 0, connected: 0 })));
    for (const c of calls) {
      const d = new Date(c.at);
      const di = d.getDay() - 1;
      const hi = HOURS.indexOf(d.getHours());
      if (di < 0 || di >= DAYS.length || hi < 0) continue;
      g[di][hi].total++;
      if (c.disposition === "connected") g[di][hi].connected++;
    }
    return g;
  }, [calls]);

  const best = useMemo(() => {
    let top: { d: number; h: number; rate: number } | null = null;
    grid.forEach((row, d) => row.forEach((c, h) => {
      if (c.total < MIN_CALLS) return;
      const rate = c.connected / c.total;
      if (!top || rate > top.rate) top = { d, h, rate };
    }));
    return top as { d: number; h: number; rate: number } | null;
  }, [grid]);

  if (!calls.length) {
    return <p className="py-6 text-center text-xs text-[var(--muted)]">Log calls from your leads and this fills in with when people actually pick up.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex gap-1 pl-10">
            {HOURS.map((h) => (
              <div key={h} className="w-7 text-center text-[10px] text-[var(--muted-2)]">{hourLabel(h)}</div>
            ))}
          </div>
          {DAYS.map((day, d) => (
            <div key={day} className="mt-1 flex items-center gap-1">
              <div className="w-9 text-[10px] font-medium text-[var(--muted)]">{day}</div>
              {HOURS.map((h, hi) => {
                const c = grid[d][hi];
                const rate = c.total ? c.connected / c.total : 0;
                return (
                  <div
                    key={h}
                    className="h-7 w-7 rounded"
                    style={{ background: c.total ? `color-mix(in srgb, var(--success) ${Math.round(15 + rate * 85)}%, var(--surface-2))` : "var(--surface-2)" }}
                    title={c.total ? `${c.connected}/${c.total} connected (${Math.round(rate * 100)}%)` : "No calls"}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {best
          ? <>Your calls connect best on <strong>{DAYS[best.d]} around {hourLabel(HOURS[best.h])} {HOURS[best.h] >= 12 ? "PM" : "AM"}</strong> ({Math.round(best.rate * 100)}% connected).</>
          : `Based on ${calls.length} logged call${calls.length === 1 ? "" : "s"} — a clearer pattern shows once a time slot has ${MIN_CALLS}+ calls.`}
      </p>
    </>
  );
}
