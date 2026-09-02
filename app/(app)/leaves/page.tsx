"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Card, Badge, Avatar, Button } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ems/kit";
import { visibleEmployees, leaveTypeLabel, leaveStatusColor } from "@/lib/ems";
import { formatDate, relativeTime } from "@/lib/utils";
import { Check, X, CalendarCheck } from "lucide-react";

export default function LeavesPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const employees = useApp((s) => s.employees);
  const leaves = useApp((s) => s.leaves);
  const decideLeave = useApp((s) => s.decideLeave);
  const viewer = userById(actingUserId)!;

  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const visibleIds = useMemo(() => new Set(visibleEmployees(viewer, employees).map((u) => u.id)), [viewer, employees]);
  const scoped = leaves.filter((l) => visibleIds.has(l.userId) && l.userId !== viewer.id);
  const pending = scoped.filter((l) => l.status === "pending");
  const shown = filter === "pending" ? pending : scoped;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Leave requests"
        subtitle={`${pending.length} awaiting your decision`}
        action={
          <div className="flex gap-1 rounded-lg bg-[var(--surface-2)] p-1">
            {(["pending", "all"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1 text-xs font-medium capitalize ${filter === f ? "bg-[var(--surface)] shadow-[var(--shadow-sm)]" : "text-[var(--muted)]"}`}>{f}</button>
            ))}
          </div>
        }
      />

      {shown.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <CalendarCheck size={28} className="text-[var(--muted-2)]" />
          <p className="text-sm text-[var(--muted)]">Nothing here — you&apos;re all caught up.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {shown.map((l) => {
            const u = userById(l.userId);
            return (
              <Card key={l.id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Link href={`/employees/${l.userId}`}><Avatar name={u?.name ?? "?"} size={40} /></Link>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/employees/${l.userId}`} className="font-medium hover:text-[var(--primary)]">{u?.name}</Link>
                        <Badge color="info">{leaveTypeLabel[l.type]}</Badge>
                        <Badge color={leaveStatusColor[l.status]} dot>{l.status}</Badge>
                      </div>
                      <div className="text-xs text-[var(--muted)]">{formatDate(l.from)} → {formatDate(l.to)} · {l.days} day{l.days > 1 ? "s" : ""} · applied {relativeTime(l.appliedAt)}</div>
                      <div className="mt-1 text-sm">{l.reason}</div>
                      {l.decisionNote && <div className="mt-1 text-xs text-[var(--muted-2)]">Note: {l.decisionNote}</div>}
                    </div>
                  </div>
                  {l.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" onClick={() => decideLeave(l.id, "approved")}><Check size={15} /> Approve</Button>
                      <Button size="sm" variant="danger" onClick={() => decideLeave(l.id, "rejected", "Not approved")}><X size={15} /> Reject</Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
