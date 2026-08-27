"use client";

import Link from "next/link";
import { useApp } from "@/lib/store";
import { Card, Button } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ems/kit";
import { relativeTime } from "@/lib/utils";
import { Bell, CalendarCheck, CheckSquare, FileText, Receipt, Megaphone, LifeBuoy, FileSearch, Check, CalendarClock } from "lucide-react";
import type { NotificationKind } from "@/lib/types";

const icons: Record<NotificationKind, typeof Bell> = {
  leave: CalendarCheck,
  task: CheckSquare,
  quotation: FileText,
  approval: Check,
  invoice: Receipt,
  announcement: Megaphone,
  ticket: LifeBuoy,
  audit_report: FileSearch,
  meeting: CalendarClock,
  system: Bell,
};

export default function NotificationsPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const notifications = useApp((s) => s.notifications);
  const markRead = useApp((s) => s.markNotificationRead);
  const markAll = useApp((s) => s.markAllNotificationsRead);

  const mine = notifications.filter((n) => n.userId === actingUserId);
  const unread = mine.filter((n) => !n.read).length;

  return (
    <div className="space-y-5">
      <PageHeader title="Notifications" subtitle={`${unread} unread`} action={unread > 0 && <Button variant="secondary" onClick={() => markAll(actingUserId)}><Check size={16} /> Mark all read</Button>} />

      <Card className="divide-y divide-[var(--border)] overflow-hidden">
        {mine.length === 0 && <div className="py-12 text-center text-sm text-[var(--muted)]">No notifications.</div>}
        {mine.map((n) => {
          const Icon = icons[n.kind];
          const inner = (
            <div className={`flex items-start gap-3 p-4 ${!n.read ? "bg-[var(--primary-soft)]/30" : ""}`} onClick={() => markRead(n.id)}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)]"><Icon size={16} className="text-[var(--muted)]" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{n.title}</span>
                  {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />}
                </div>
                {n.body && <div className="text-xs text-[var(--muted)]">{n.body}</div>}
                <div className="mt-0.5 text-[11px] text-[var(--muted-2)]">{relativeTime(n.at)}</div>
              </div>
            </div>
          );
          return n.href ? <Link key={n.id} href={n.href} className="block hover:bg-[var(--surface-2)]">{inner}</Link> : <div key={n.id}>{inner}</div>;
        })}
      </Card>
    </div>
  );
}
