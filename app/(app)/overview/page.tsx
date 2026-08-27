"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { departmentById } from "@/lib/seed/org";
import { Card, Badge, Avatar, Button, Stat, ProgressBar } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ems/kit";
import { visibleEmployees, leaveTypeLabel, priorityColor, taskStatusColor, taskStatusLabel, auditReportColor, auditReportLabel } from "@/lib/ems";
import { formatDate } from "@/lib/utils";
import { Check, X, CalendarCheck, FileText, FileSearch, Users, AlertTriangle, ArrowRight, ClipboardList } from "lucide-react";

const priRank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export default function OverviewPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const employees = useApp((s) => s.employees);
  const attendance = useApp((s) => s.attendance);
  const leaves = useApp((s) => s.leaves);
  const tasks = useApp((s) => s.tasks);
  const proposals = useApp((s) => s.proposals);
  const auditReports = useApp((s) => s.auditReports);
  const decideLeave = useApp((s) => s.decideLeave);
  const me = userById(actingUserId)!;
  const today = new Date().toISOString().slice(0, 10);

  const team = useMemo(() => visibleEmployees(me, employees), [me, employees]);
  const teamIds = useMemo(() => new Set(team.map((u) => u.id)), [team]);
  const reports = team.filter((u) => u.id !== me.id);

  // people snapshot
  const presentToday = reports.filter((u) => {
    const r = attendance.find((a) => a.userId === u.id && a.date === today);
    return r && (r.status === "present" || r.status === "wfh");
  }).length;
  const onLeaveToday = reports.filter((u) => u.status === "on_leave" || attendance.find((a) => a.userId === u.id && a.date === today)?.status === "leave").length;

  // priorities
  const pendingLeaves = leaves.filter((l) => l.status === "pending" && teamIds.has(l.userId) && l.userId !== me.id);
  const quotationsToVerify = proposals.filter((p) => p.reviewStatus === "internal_review" || (p.approval?.required && !p.approval.approvedBy));
  const reportsToVerify = auditReports.filter((r) => r.status === "pending_verification");
  const teamTasks = tasks.filter((t) => teamIds.has(t.assigneeId) && t.status !== "done");
  const overdue = teamTasks.filter((t) => t.dueAt && t.dueAt.slice(0, 10) < today).sort((a, b) => priRank[a.priority] - priRank[b.priority]);
  const dueToday = teamTasks.filter((t) => t.dueAt && t.dueAt.slice(0, 10) === today);

  const totalActions = pendingLeaves.length + quotationsToVerify.length + reportsToVerify.length;

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${greet}, ${me.name.split(" ")[0]}`}
        subtitle={me.accessLevel === "admin" ? "Organisation overview" : "Your team overview"}
        action={totalActions > 0 && <Link href="/approvals"><Button><Check size={16} /> {totalActions} to action</Button></Link>}
      />

      {/* People snapshot */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4"><Stat label={me.accessLevel === "admin" ? "Headcount" : "Team size"} value={reports.length} /></Card>
        <Card className="p-4"><Stat label="Present today" value={presentToday} accent="var(--success)" /></Card>
        <Card className="p-4"><Stat label="On leave" value={onLeaveToday} accent="var(--purple)" /></Card>
        <Card className="p-4"><Stat label="Needs approval" value={totalActions} accent={totalActions ? "var(--warning)" : undefined} /></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Today's priorities */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Today&apos;s priorities</h3>
              <Link href="/approvals" className="text-xs text-[var(--primary)]">Approvals →</Link>
            </div>

            {totalActions === 0 && overdue.length === 0 && dueToday.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--muted)]">Nothing urgent — you&apos;re on top of things 🎉</div>
            ) : (
              <div className="space-y-2.5">
                {pendingLeaves.slice(0, 4).map((l) => {
                  const u = userById(l.userId);
                  return (
                    <div key={l.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--warning-soft)] text-[var(--warning)]"><CalendarCheck size={15} /></div>
                      <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{u?.name} · {leaveTypeLabel[l.type]} leave ({l.days}d)</div><div className="text-[11px] text-[var(--muted)]">{formatDate(l.from)} → {formatDate(l.to)}</div></div>
                      <Button size="sm" variant="success" onClick={() => decideLeave(l.id, "approved")}><Check size={14} /></Button>
                      <Button size="sm" variant="danger" onClick={() => decideLeave(l.id, "rejected", "Not approved")}><X size={14} /></Button>
                    </div>
                  );
                })}
                {quotationsToVerify.slice(0, 3).map((p) => (
                  <Link key={p.id} href="/proposals" className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-2.5 hover:bg-[var(--surface-2)]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]"><FileText size={15} /></div>
                    <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">Verify quotation {p.number}</div><div className="text-[11px] text-[var(--muted)]">{p.approval?.reason ?? "Awaiting internal review"}</div></div>
                    <ArrowRight size={15} className="text-[var(--muted-2)]" />
                  </Link>
                ))}
                {reportsToVerify.slice(0, 3).map((r) => (
                  <Link key={r.id} href="/audit-reports" className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-2.5 hover:bg-[var(--surface-2)]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--purple-soft)] text-[var(--purple)]"><FileSearch size={15} /></div>
                    <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">Verify audit — {r.company}</div><div className="text-[11px] text-[var(--muted)]">Score {r.score}/100</div></div>
                    <Badge color={auditReportColor[r.status]}>{auditReportLabel[r.status]}</Badge>
                  </Link>
                ))}
                {overdue.slice(0, 4).map((t) => {
                  const u = userById(t.assigneeId);
                  return (
                    <div key={t.id} className="flex items-center gap-3 rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft)]/30 p-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--danger-soft)] text-[var(--danger)]"><AlertTriangle size={15} /></div>
                      <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{t.title}</div><div className="text-[11px] text-[var(--muted)]">{u?.name} · overdue {t.dueAt ? formatDate(t.dueAt) : ""}</div></div>
                      <Badge color={priorityColor[t.priority]}>{t.priority}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Team task load */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Team workload</h3>
              <Link href="/tasks" className="text-xs text-[var(--primary)]">Task board →</Link>
            </div>
            <div className="space-y-2">
              {reports.map((u) => {
                const open = tasks.filter((t) => t.assigneeId === u.id && t.status !== "done");
                if (open.length === 0) return null;
                const dept = departmentById(u.departmentId);
                return (
                  <div key={u.id} className="flex items-center gap-3">
                    <Avatar name={u.name} size={28} />
                    <div className="w-28 shrink-0 truncate text-sm">{u.name.split(" ")[0]} <span className="text-[10px] text-[var(--muted-2)]">{dept?.name}</span></div>
                    <ProgressBar value={open.length} max={6} className="flex-1" color={open.length > 4 ? "var(--danger)" : "var(--primary)"} />
                    <span className="w-6 text-right text-xs font-medium">{open.length}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Jump to</h3>
            <div className="space-y-1.5">
              {[
                { href: "/employees", label: "Employee directory", icon: Users },
                { href: "/leaves", label: "Leave requests", icon: CalendarCheck },
                { href: "/attendance", label: "Attendance", icon: ClipboardList },
                { href: "/approvals", label: "Approvals", icon: Check },
              ].map((x) => (
                <Link key={x.href} href={x.href} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-[var(--surface-2)]">
                  <x.icon size={16} className="text-[var(--muted)]" /> {x.label}
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Due today</h3>
            {dueToday.length === 0 ? <div className="py-3 text-center text-xs text-[var(--muted)]">Nothing due today</div> : (
              <div className="space-y-2">
                {dueToday.map((t) => {
                  const u = userById(t.assigneeId);
                  return (
                    <div key={t.id} className="flex items-center gap-2 text-sm">
                      <Badge color={taskStatusColor[t.status]} dot>{taskStatusLabel[t.status]}</Badge>
                      <span className="min-w-0 flex-1 truncate">{t.title}</span>
                      <span className="text-[10px] text-[var(--muted-2)]">{u?.name.split(" ")[0]}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
