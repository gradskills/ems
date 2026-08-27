"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Card, ProgressBar, SectionTitle, Badge } from "@/components/ui/primitives";
import { inr } from "@/lib/utils";
import { PhoneOutgoing, PhoneCall, Trophy, Target, Coins, TrendingUp, Flame } from "lucide-react";

export default function PerformancePage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const leads = useApp((s) => s.leads);
  const calls = useApp((s) => s.calls);
  const me = userById(actingUserId)!;

  const myLeads = useMemo(() => leads.filter((l) => l.ownerId === actingUserId), [leads, actingUserId]);
  const myCalls = calls.filter((c) => c.agentId === actingUserId);
  const connects = myCalls.filter((c) => c.disposition === "connected").length;
  const connectRate = myCalls.length ? Math.round((connects / myCalls.length) * 100) : 0;
  const won = myLeads.filter((l) => l.stage === "won");
  const wonValue = won.reduce((s, l) => s + l.estimatedValue, 0);
  const pipeline = myLeads.filter((l) => !["won", "lost"].includes(l.stage)).reduce((s, l) => s + l.estimatedValue, 0);
  const commission = Math.round(wonValue * 0.08);

  const targetRev = me.monthlyTargetRevenue ?? 500000;
  const targetCalls = me.monthlyTargetCalls ?? 400;
  // demo monthly numbers (seed + a base)
  const monthCalls = 247 + myCalls.length;
  const monthWonValue = wonValue;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My performance</h1>
        <p className="text-sm text-[var(--muted)]">This month · {me.name}</p>
      </div>

      {/* Commission — the adoption driver */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 bg-gradient-to-r from-[var(--success)] to-[#0f9d58] p-5 text-white sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
            <Coins size={28} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium opacity-90">Incentive earned this month (8% of won)</div>
            <div className="text-3xl font-bold">{inr(commission)}</div>
            <div className="text-xs opacity-80">from {won.length} closed deals worth {inr(wonValue)}</div>
          </div>
          <div className="rounded-xl bg-white/15 px-4 py-2 text-center">
            <div className="text-xs opacity-80">Paid on collection</div>
            <div className="text-lg font-bold">{inr(Math.round(commission * 0.6))}</div>
            <div className="text-[10px] opacity-70">60% invoiced &amp; received</div>
          </div>
        </div>
      </Card>

      {/* Targets */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><Target size={16} className="text-[var(--primary)]" /> Revenue target</div>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl font-bold">{inr(monthWonValue, { compact: true })}</span>
            <span className="text-sm text-[var(--muted)]">of {inr(targetRev, { compact: true })}</span>
          </div>
          <ProgressBar className="mt-2" value={monthWonValue} max={targetRev} color="var(--primary)" />
          <div className="mt-1 text-xs text-[var(--muted)]">{Math.round((monthWonValue / targetRev) * 100)}% achieved</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><PhoneOutgoing size={16} className="text-[var(--info)]" /> Calls target</div>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl font-bold">{monthCalls}</span>
            <span className="text-sm text-[var(--muted)]">of {targetCalls}</span>
          </div>
          <ProgressBar className="mt-2" value={monthCalls} max={targetCalls} color="var(--info)" />
          <div className="mt-1 text-xs text-[var(--muted)]">{Math.round((monthCalls / targetCalls) * 100)}% of monthly goal</div>
        </Card>
      </div>

      {/* Funnel stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat icon={<PhoneOutgoing size={15} />} label="Dials" value={monthCalls} />
        <MiniStat icon={<PhoneCall size={15} />} label="Connect rate" value={`${connectRate || 61}%`} color="var(--success)" />
        <MiniStat icon={<TrendingUp size={15} />} label="Open pipeline" value={inr(pipeline, { compact: true })} />
        <MiniStat icon={<Trophy size={15} />} label="Win rate" value="34%" color="var(--purple)" />
      </div>

      {/* Best time to call heatmap */}
      <Card className="p-4">
        <SectionTitle action={<Badge color="success">Your connect rate by hour</Badge>}>
          <span className="flex items-center gap-1.5"><Flame size={14} className="text-[var(--danger)]" /> Best time to call</span>
        </SectionTitle>
        <Heatmap />
        <p className="mt-2 text-xs text-[var(--muted)]">
          Your calls connect best on <strong>Tue–Thu, 11 AM–1 PM and 5–7 PM</strong>. Front-load your call list into these windows.
        </p>
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

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hours = ["9", "10", "11", "12", "1", "2", "3", "4", "5", "6", "7"];
// deterministic pseudo connect-rate matrix (0-1)
function cell(d: number, h: number) {
  const peak = (h >= 2 && h <= 4) || (h >= 8 && h <= 10);
  const midweek = d >= 1 && d <= 3;
  let v = 0.25 + (peak ? 0.4 : 0) + (midweek ? 0.2 : 0);
  v += ((d * 7 + h * 13) % 10) / 100;
  return Math.min(1, v);
}

function Heatmap() {
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="flex gap-1 pl-10">
          {hours.map((h) => (
            <div key={h} className="w-7 text-center text-[10px] text-[var(--muted-2)]">{h}</div>
          ))}
        </div>
        {days.map((day, d) => (
          <div key={day} className="mt-1 flex items-center gap-1">
            <div className="w-9 text-[10px] font-medium text-[var(--muted)]">{day}</div>
            {hours.map((_, h) => {
              const v = cell(d, h);
              return (
                <div
                  key={h}
                  className="h-7 w-7 rounded"
                  style={{ background: `color-mix(in srgb, var(--success) ${Math.round(v * 100)}%, var(--surface-2))` }}
                  title={`${Math.round(v * 100)}% connect`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
