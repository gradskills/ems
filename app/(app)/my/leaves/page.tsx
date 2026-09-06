"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Card, Badge, Button, Stat } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ems/kit";
import { ApplyLeaveModal } from "@/components/ems/ApplyLeaveModal";
import { leaveTypeLabel, leaveStatusColor } from "@/lib/ems";
import { formatDate, relativeTime } from "@/lib/utils";
import { ChevronLeft, CalendarPlus, CalendarCheck, Trash2 } from "lucide-react";

// Employee-facing leaves screen. This is the page the "leave approved / rejected"
// notification links to (/my/leaves) — previously a 404. Employees see their own
// requests + balances and can raise a new one here.
export default function MyLeavesPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const leaves = useApp((s) => s.leaves);
  const deleteLeave = useApp((s) => s.deleteLeave);
  const me = userById(actingUserId)!;

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const mine = useMemo(
    () => leaves.filter((l) => l.userId === me.id).sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1)),
    [leaves, me.id]
  );
  const pendingCount = mine.filter((l) => l.status === "pending").length;
  const shown = filter === "all" ? mine : mine.filter((l) => l.status === filter);

  const filters: { key: typeof filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-5">
      <Link href="/my" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        <ChevronLeft size={16} /> My Dashboard
      </Link>

      <PageHeader
        title="My leaves"
        subtitle={pendingCount ? `${pendingCount} awaiting approval` : "Request time off and track your requests"}
        action={<Button onClick={() => setLeaveOpen(true)}><CalendarPlus size={16} /> Apply leave</Button>}
      />

      {/* Leave balances */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4"><Stat label="Casual" value={me.leaveBalance?.casual ?? 0} /></Card>
        <Card className="p-4"><Stat label="Sick" value={me.leaveBalance?.sick ?? 0} /></Card>
        <Card className="p-4"><Stat label="Earned" value={me.leaveBalance?.earned ?? 0} /></Card>
        <Card className="p-4"><Stat label="Requests" value={mine.length} sub={`${pendingCount} pending`} /></Card>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filter === f.key ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <CalendarCheck size={28} className="text-[var(--muted-2)]" />
          <p className="text-sm text-[var(--muted)]">
            {mine.length === 0 ? "You haven't requested any leave yet." : "Nothing matches this filter."}
          </p>
          {mine.length === 0 && (
            <Button variant="secondary" size="sm" onClick={() => setLeaveOpen(true)}><CalendarPlus size={15} /> Apply for leave</Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {shown.map((l) => {
            const approver = l.approverId ? userById(l.approverId) : undefined;
            return (
              <Card key={l.id} className="p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color="info">{leaveTypeLabel[l.type]}</Badge>
                      <Badge color={leaveStatusColor[l.status]} dot>{l.status}</Badge>
                      <span className="text-sm font-medium">{l.days} day{l.days > 1 ? "s" : ""}</span>
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      {formatDate(l.from)} → {formatDate(l.to)} · applied {relativeTime(l.appliedAt)}
                    </div>
                    <div className="mt-1 text-sm">{l.reason}</div>
                    {l.status !== "pending" && (
                      <div className="mt-1 text-xs text-[var(--muted-2)]">
                        {l.status === "approved" ? "Approved" : l.status === "rejected" ? "Rejected" : "Updated"}
                        {approver ? ` by ${approver.name}` : ""}
                        {l.decidedAt ? ` · ${relativeTime(l.decidedAt)}` : ""}
                        {l.decisionNote ? ` — ${l.decisionNote}` : ""}
                      </div>
                    )}
                  </div>
                  {l.status === "pending" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (confirm("Delete this leave request? This can't be undone.")) deleteLeave(l.id);
                      }}
                    >
                      <Trash2 size={15} /> Delete
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ApplyLeaveModal open={leaveOpen} onClose={() => setLeaveOpen(false)} />
    </div>
  );
}
