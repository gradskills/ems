"use client";

import type { Activity, ActivityType } from "@/lib/types";
import { userName } from "@/lib/seed/users";
import { relativeTime, formatDate } from "@/lib/utils";
import { Phone, Mail, MessageCircle, StickyNote, CalendarClock, ArrowRightLeft, FileText, PencilLine } from "lucide-react";

const icons: Record<ActivityType, { icon: typeof Phone; color: string }> = {
  call: { icon: Phone, color: "var(--success)" },
  email: { icon: Mail, color: "var(--info)" },
  whatsapp: { icon: MessageCircle, color: "var(--success)" },
  note: { icon: StickyNote, color: "var(--muted)" },
  meeting: { icon: CalendarClock, color: "var(--purple)" },
  stage_change: { icon: ArrowRightLeft, color: "var(--primary)" },
  proposal: { icon: FileText, color: "var(--warning)" },
  field_edit: { icon: PencilLine, color: "var(--danger)" },
};

export function Timeline({ items }: { items: Activity[] }) {
  if (items.length === 0) return <div className="py-6 text-center text-sm text-[var(--muted)]">No activity yet.</div>;
  return (
    <div className="relative space-y-1">
      {items.map((a, i) => {
        const { icon: Icon, color } = icons[a.type];
        const isEdit = a.type === "field_edit";
        return (
          <div key={a.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--surface)] shadow-[var(--shadow-sm)]"
                style={{ background: `color-mix(in srgb, ${color} 12%, white)`, color }}
              >
                <Icon size={15} />
              </div>
              {i < items.length - 1 && <div className="w-px flex-1 bg-[var(--border)]" />}
            </div>
            <div className={`min-w-0 flex-1 pb-4 ${isEdit ? "rounded-lg bg-[var(--danger-soft)]/40 px-3 -mx-1" : ""}`}>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-medium">{a.title}</span>
                <span className="text-[11px] text-[var(--muted-2)]" title={formatDate(a.at, true)}>
                  {relativeTime(a.at)}
                </span>
              </div>
              {a.body && <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">{a.body}</p>}
              <div className="mt-0.5 text-[11px] text-[var(--muted-2)]">by {userName(a.actorId)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
