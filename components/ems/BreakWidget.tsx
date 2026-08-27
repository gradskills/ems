"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { Card, Button, Badge } from "@/components/ui/primitives";
import { breakTypeLabel, breakDefaults, activeBreak } from "@/lib/ems";
import { Coffee, Cookie, UtensilsCrossed, Armchair, Play, Square, AlarmClock } from "lucide-react";
import type { BreakType } from "@/lib/types";

const icons: Record<BreakType, typeof Coffee> = { tea: Coffee, snacks: Cookie, lunch: UtensilsCrossed, casual: Armchair };
const ORDER: BreakType[] = ["tea", "snacks", "lunch", "casual"];

function mmss(totalSec: number) {
  const s = Math.max(0, Math.round(totalSec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function BreakWidget({ clockedIn }: { clockedIn: boolean }) {
  const actingUserId = useApp((s) => s.actingUserId);
  const attendance = useApp((s) => s.attendance);
  const startBreak = useApp((s) => s.startBreak);
  const endBreak = useApp((s) => s.endBreak);
  const breakReminder = useApp((s) => s.breakReminder);

  const today = new Date().toISOString().slice(0, 10);
  const rec = attendance.find((a) => a.userId === actingUserId && a.date === today);
  const brk = activeBreak(rec);
  const takenToday = (rec?.breaks ?? []).filter((b) => b.endedAt).length;

  // custom minutes per break type (defaults are the "respective time")
  const [mins, setMins] = useState<Record<BreakType, number>>(breakDefaults);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  // fire "clock back in" reminders once at time-up, then every 5 minutes while overdue
  useEffect(() => {
    if (!brk || !now) return;
    const overdueMin = (now - Date.parse(brk.startedAt)) / 60000 - brk.plannedMinutes;
    if (overdueMin < 0) return;
    const due = Math.floor(overdueMin / 5) + 1;
    if (brk.remindersSent < due) breakReminder(brk.id);
  }, [now, brk, breakReminder]);

  if (brk) {
    const elapsedSec = now ? (now - Date.parse(brk.startedAt)) / 1000 : 0;
    const remaining = brk.plannedMinutes * 60 - elapsedSec;
    const overdue = remaining <= 0;
    const Icon = icons[brk.type];
    return (
      <Card className={`p-5 ${overdue ? "border-[var(--danger)]" : ""}`}>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${overdue ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--primary-soft)] text-[var(--primary)]"}`}>
            <Icon size={22} />
          </div>
          <div className="text-sm font-medium">{breakTypeLabel[brk.type]} break in progress</div>
          <div className={`font-mono text-3xl font-bold tabular-nums ${overdue ? "text-[var(--danger)]" : ""}`}>
            {overdue ? `+${mmss(-remaining)}` : mmss(remaining)}
          </div>
          {overdue ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--danger)]">
              <AlarmClock size={14} /> Break over — please clock back in{brk.remindersSent > 0 ? ` · ${brk.remindersSent} reminder${brk.remindersSent > 1 ? "s" : ""} sent` : ""}
            </div>
          ) : (
            <div className="text-xs text-[var(--muted)]">{brk.plannedMinutes} min planned · you can end anytime</div>
          )}
          <Button variant={overdue ? "danger" : "primary"} className="mt-1" onClick={endBreak}><Square size={15} /> End break & clock back in</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Take a break</h3>
        {takenToday > 0 && <Badge color="slate">{takenToday}/4 taken today</Badge>}
      </div>
      {!clockedIn ? (
        <div className="py-4 text-center text-xs text-[var(--muted)]">Clock in first to start a break.</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {ORDER.map((type) => {
            const Icon = icons[type];
            return (
              <div key={type} className="rounded-lg border border-[var(--border)] p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Icon size={15} className="text-[var(--muted)]" /> {breakTypeLabel[type]}</div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={mins[type]}
                    onChange={(e) => setMins((m) => ({ ...m, [type]: Number(e.target.value) }))}
                    className="h-8 w-14 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-xs"
                  />
                  <span className="text-[11px] text-[var(--muted-2)]">min</span>
                  <Button size="sm" className="ml-auto" onClick={() => startBreak(type, mins[type] || breakDefaults[type])}><Play size={13} /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
