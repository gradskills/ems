"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Card, Badge, Button } from "@/components/ui/primitives";
import {
  readReminderConfig, writeReminderConfig, defaultReminderConfig, type ClockReminderConfig,
} from "@/lib/reminders";
import { shiftById, shiftWindow } from "@/lib/shifts";
import { AlarmClock, Bell, BellOff } from "lucide-react";

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-[var(--primary)]" : "bg-[var(--border-strong)]"}`}
    >
      <span className="absolute h-5 w-5 rounded-full bg-white shadow transition-[left]" style={{ top: 2, left: on ? 22 : 2 }} />
    </button>
  );
}

const timeCls = "h-9 shrink-0 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-40";

export function ClockReminderSettings() {
  const actingUserId = useApp((s) => s.actingUserId);
  const shifts = useApp((s) => s.shifts);
  const me = userById(actingUserId)!;
  const shift = shiftById(shifts, me.shiftId);

  const [cfg, setCfg] = useState<ClockReminderConfig | null>(null);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  // load saved config (client-only) once mounted
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setCfg(readReminderConfig(me.id, defaultReminderConfig(shift)));
    try {
      setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    } catch {
      setPerm("unsupported");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id, me.shiftId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function update(patch: Partial<ClockReminderConfig>) {
    setCfg((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      writeReminderConfig(me.id, next);
      return next;
    });
  }

  async function askPermission() {
    try {
      if (typeof Notification === "undefined") return;
      const p = await Notification.requestPermission();
      setPerm(p);
    } catch { /* ignore */ }
  }

  function useShiftTimes() {
    if (!shift) return;
    update({ clockInTime: shift.startTime, clockOutTime: shift.endTime });
  }

  if (!cfg) return null; // avoid SSR/client mismatch until localStorage is read

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlarmClock size={16} className="text-[var(--primary)]" />
        <h3 className="text-sm font-semibold">Clock-in / out reminders</h3>
        {shift && <Badge color={shift.color}>{shift.name} · {shiftWindow(shift)}</Badge>}
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">Remind me to clock in</div>
            <div className="text-xs text-[var(--muted)]">Fires if you haven&apos;t clocked in by this time</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <input type="time" className={timeCls} value={cfg.clockInTime} disabled={!cfg.clockInEnabled} onChange={(e) => update({ clockInTime: e.target.value })} />
            <Toggle on={cfg.clockInEnabled} onChange={(v) => update({ clockInEnabled: v })} label="Toggle clock-in reminder" />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">Remind me to clock out</div>
            <div className="text-xs text-[var(--muted)]">Fires if you clocked in but not out</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <input type="time" className={timeCls} value={cfg.clockOutTime} disabled={!cfg.clockOutEnabled} onChange={(e) => update({ clockOutTime: e.target.value })} />
            <Toggle on={cfg.clockOutEnabled} onChange={(v) => update({ clockOutEnabled: v })} label="Toggle clock-out reminder" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
          {shift && <Button size="sm" variant="outline" onClick={useShiftTimes}>Use my shift times</Button>}
          {perm === "granted" ? (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--success)]"><Bell size={13} /> Desktop alerts on</span>
          ) : perm === "unsupported" ? (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--muted-2)]"><BellOff size={13} /> Desktop alerts unavailable</span>
          ) : (
            <Button size="sm" variant="ghost" onClick={askPermission}><Bell size={14} /> Enable desktop alerts</Button>
          )}
        </div>
        <p className="text-[11px] text-[var(--muted-2)]">Reminders run while the app is open in your browser. Saved on this device.</p>
      </div>
    </Card>
  );
}
