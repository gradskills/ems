"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { useTheme } from "@/lib/theme";
import { Card, Button } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ems/kit";
import { MobileNavCustomizer } from "@/components/ems/MobileNavCustomizer";
import { ClockReminderSettings } from "@/components/ems/ClockReminderSettings";
import { readNotificationPrefs, writeNotificationPrefs, defaultNotificationPrefs, type NotificationPrefs } from "@/lib/notiprefs";
import { Sun, Moon, KeyRound, Bell, Palette } from "lucide-react";

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-[var(--primary)]" : "bg-[var(--border-strong)]"}`}
    >
      <span className="absolute h-5 w-5 rounded-full bg-white shadow transition-[left]" style={{ top: 2, left: on ? 22 : 2 }} />
    </button>
  );
}

const NOTI_ROWS: { key: keyof NotificationPrefs; label: string; desc: string }[] = [
  { key: "leave", label: "Leave decisions", desc: "When your leave request is approved or rejected" },
  { key: "task", label: "Tasks", desc: "When a task is assigned or updated" },
  { key: "approval", label: "Approvals", desc: "Items awaiting or cleared from your queue" },
  { key: "meeting", label: "Meetings", desc: "Invites and upcoming meeting reminders" },
  { key: "announcement", label: "Announcements", desc: "Company & department updates" },
  { key: "invoice", label: "Invoices & payments", desc: "Billing and payment activity" },
];

function AppearanceCard() {
  const resolved = useTheme((s) => s.resolved);
  const setTheme = useTheme((s) => s.setTheme);
  const opts: { key: "light" | "dark"; label: string; icon: typeof Sun }[] = [
    { key: "light", label: "Light", icon: Sun },
    { key: "dark", label: "Dark", icon: Moon },
  ];
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Palette size={16} className="text-[var(--primary)]" />
        <h3 className="text-sm font-semibold">Appearance</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {opts.map((o) => {
          const Icon = o.icon;
          const active = resolved === o.key;
          return (
            <button
              key={o.key}
              onClick={() => setTheme(o.key)}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${active ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border-strong)] text-[var(--muted)] hover:bg-[var(--surface-2)]"}`}
            >
              <Icon size={16} /> {o.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function NotificationSettings() {
  const actingUserId = useApp((s) => s.actingUserId);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setPrefs(readNotificationPrefs(actingUserId)); }, [actingUserId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!prefs) return null;
  const update = (key: keyof NotificationPrefs, v: boolean) => {
    const next = { ...prefs, [key]: v };
    setPrefs(next);
    writeNotificationPrefs(actingUserId, next);
  };
  const allOn = Object.values(prefs).every(Boolean);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-[var(--primary)]" />
          <h3 className="text-sm font-semibold">Notifications</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={() => { const v = !allOn; const next = { ...defaultNotificationPrefs() }; (Object.keys(next) as (keyof NotificationPrefs)[]).forEach((k) => (next[k] = v)); setPrefs(next); writeNotificationPrefs(actingUserId, next); }}>
          {allOn ? "Mute all" : "Enable all"}
        </Button>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {NOTI_ROWS.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className="text-sm font-medium">{r.label}</div>
              <div className="text-xs text-[var(--muted)]">{r.desc}</div>
            </div>
            <Toggle on={prefs[r.key]} onChange={(v) => update(r.key, v)} label={`Toggle ${r.label}`} />
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-[var(--muted-2)]">Controls which alerts show in your notifications. Saved on this device.</p>
    </Card>
  );
}

export default function AccountSettingsPage() {
  const user = userById(useApp((s) => s.actingUserId))!;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Settings" subtitle={`Personal preferences for ${user.name.split(" ")[0]}`} />

      <AppearanceCard />
      <MobileNavCustomizer />
      <ClockReminderSettings />
      <NotificationSettings />

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound size={16} className="text-[var(--primary)]" />
          <h3 className="text-sm font-semibold">Account</h3>
        </div>
        <Link href="/account/password">
          <Button variant="outline" size="sm"><KeyRound size={14} /> Change password</Button>
        </Link>
      </Card>
    </div>
  );
}
