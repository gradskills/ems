"use client";

import { useEffect, useState } from "react";
import { useSearchParams, notFound } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { departmentById } from "@/lib/seed/org";
import { Card, Badge, Avatar, ProgressBar, Stat, Button } from "@/components/ui/primitives";
import { Tabs, InfoRow, TableShell } from "@/components/ems/kit";
import { inr, formatDate, localDateISO } from "@/lib/utils";
import { downloadCSV, downloadPayslip } from "@/lib/exports";
import {
  attendanceSummary, attendanceLabel, attendanceColor, leaveTypeLabel, leaveStatusColor,
  taskStatusColor, taskStatusLabel, priorityColor, projectStatusColor, projectStatusLabel, payslipTotals, monthLabel, roleLabel,
  effectiveAttendanceStatus, needsAttendanceReview,
} from "@/lib/ems";
import { ChevronLeft, Mail, Phone, MapPin, ChevronRight, Wallet, Download, Pencil, IdCard, CalendarClock, AlertTriangle } from "lucide-react";
import { EditEmployeeModal } from "@/components/ems/EditEmployeeModal";
import { MyProfileEditModal } from "@/components/ems/MyProfileEditModal";
import { IdCardModal } from "@/components/ems/EmployeeIdCard";
import { AttendanceCalendar } from "@/components/ems/AttendanceCalendar";
import { AttendanceEditModal } from "@/components/ems/AttendanceEditModal";

type Tab = "overview" | "projects" | "tasks" | "attendance" | "leaves" | "payroll";

const TAB_KEYS: Tab[] = ["overview", "projects", "tasks", "attendance", "leaves", "payroll"];

/**
 * The full employee profile (overview, projects, tasks, attendance, leaves,
 * payroll). Viewer-aware: the acting user only sees payroll for themselves (or
 * if they're a manager/admin), and only managers/admin can edit. Rendered both
 * from the admin `/employees/[id]` route and the employee-facing `/my/profile`.
 */
export function EmployeeProfile({
  employeeId,
  backHref = "/employees",
  backLabel = "All employees",
}: {
  employeeId: string;
  backHref?: string;
  backLabel?: string;
}) {
  const searchParams = useSearchParams();
  const actingUserId = useApp((s) => s.actingUserId);
  const employees = useApp((s) => s.employees);
  const attendance = useApp((s) => s.attendance);
  const leaves = useApp((s) => s.leaves);
  const payslips = useApp((s) => s.payslips);
  const tasks = useApp((s) => s.tasks);
  const projects = useApp((s) => s.projects);

  // the tab requested by the URL (?tab=attendance), if valid — e.g. deep-link from Attendance
  const urlTab = ((): Tab | undefined => {
    const q = searchParams.get("tab") as Tab | null;
    return q && TAB_KEYS.includes(q) ? q : undefined;
  })();
  const [tab, setTab] = useState<Tab>(urlTab ?? "overview");
  const [editOpen, setEditOpen] = useState(false);
  const [myEditOpen, setMyEditOpen] = useState(false);
  const [idCardOpen, setIdCardOpen] = useState(false);
  const [attMonth, setAttMonth] = useState<string>("all"); // "all" or "YYYY-MM"
  const [attEditDate, setAttEditDate] = useState<string | null>(null); // admin attendance editor

  // when the URL's ?tab= changes (client nav to a new deep-link), adopt it — the
  // React-recommended "adjust state during render" pattern, no effect needed.
  const [seenUrlTab, setSeenUrlTab] = useState(urlTab);
  if (urlTab && urlTab !== seenUrlTab) {
    setSeenUrlTab(urlTab);
    setTab(urlTab);
  }

  // tick so today's live "working time" stays fresh
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(i);
  }, []);

  const emp = employees.find((u) => u.id === employeeId);
  if (!emp) return notFound();

  const viewer = userById(actingUserId)!;
  const canSeePay = viewer.accessLevel !== "employee" || viewer.id === emp.id;
  const canEdit = viewer.accessLevel !== "employee";
  const isSelf = viewer.id === emp.id;
  const canEditAttendance = viewer.accessLevel === "admin" && !isSelf; // admins fix others' attendance
  const dept = departmentById(emp.departmentId);
  const mgr = emp.managerId ? userById(emp.managerId) : undefined;

  const empAtt = attendance.filter((a) => a.userId === emp.id);
  const att = attendanceSummary(empAtt);
  // months present in this employee's attendance, newest first, for the filter
  const attMonths = Array.from(new Set(empAtt.map((a) => a.date.slice(0, 7)))).sort().reverse();
  // records shown in the attendance table — all, or a single selected month
  const shownAtt = attMonth === "all" ? empAtt : empAtt.filter((a) => a.date.slice(0, 7) === attMonth);
  // per-month rollup for the selected view (falls back to the 30-day summary for "all")
  const monthSummary = attMonth === "all" ? att : attendanceSummary(shownAtt);

  // ── worked-time metrics (total across records + today's live working time) ──
  const today = localDateISO();
  const fmtDur = (mins: number) => `${Math.floor(mins / 60)}h ${mins % 60}m`;
  const todayRec = empAtt.find((a) => a.date === today);
  const netWorked = (rec?: typeof todayRec) => {
    if (!rec?.checkIn) return 0;
    const end = rec.checkOut ? Date.parse(rec.checkOut) : now;
    let ms = end - Date.parse(rec.checkIn);
    for (const b of rec.breaks ?? []) ms -= Math.max(0, (b.endedAt ? Date.parse(b.endedAt) : now) - Date.parse(b.startedAt));
    return Math.max(0, Math.round(ms / 60000));
  };
  const workingTodayMin = netWorked(todayRec);
  const isWorkingNow = !!todayRec?.checkIn && !todayRec?.checkOut;
  const empLeaves = leaves.filter((l) => l.userId === emp.id);
  const empPayslips = payslips.filter((p) => p.userId === emp.id);
  const empTasks = tasks.filter((t) => t.assigneeId === emp.id);
  const empProjects = projects.filter((p) => p.memberIds.includes(emp.id) || p.managerId === emp.id);

  const e = emp; // stable narrowed reference for closures below
  const slug = e.name.replace(/\s+/g, "-");
  function exportProfile() {
    const rows: (string | number)[][] = [
      ["Field", "Value"],
      ["Name", e.name], ["Email", e.email], ["Phone", e.phone],
      ["Department", dept?.name ?? ""], ["Role", roleLabel(e, dept)], ["Access level", e.accessLevel],
      ["Designation", e.designation ?? ""], ["Reports to", mgr?.name ?? ""], ["Status", e.status ?? "active"],
      ["Employment type", e.employmentType?.replace("_", " ") ?? ""], ["Location", e.location ?? ""],
      ["Joined", e.joinedAt ? formatDate(e.joinedAt) : ""],
      ...(canSeePay && e.ctcAnnual ? [["Annual CTC", inr(e.ctcAnnual)] as (string | number)[]] : []),
    ];
    downloadCSV(`${slug}-profile`, rows);
  }
  function exportTasks() {
    downloadCSV(`${slug}-tasks`, [["Task", "Status", "Priority", "Due"], ...empTasks.map((t) => [t.title, taskStatusLabel[t.status], t.priority, t.dueAt ? formatDate(t.dueAt) : ""])]);
  }
  function exportLeaves() {
    downloadCSV(`${slug}-leaves`, [["Type", "From", "To", "Days", "Reason", "Status"], ...empLeaves.map((l) => [leaveTypeLabel[l.type], formatDate(l.from), formatDate(l.to), l.days, l.reason, l.status])]);
  }
  function exportAttendance() {
    const suffix = attMonth === "all" ? "attendance" : `attendance-${attMonth}`;
    downloadCSV(`${slug}-${suffix}`, [["Date", "Status", "Check in", "Check out", "Minutes"], ...shownAtt.map((a) => [formatDate(a.date), attendanceLabel[a.status], a.checkIn ?? "", a.checkOut ?? "", a.workedMinutes ?? ""])]);
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "projects", label: "Projects", count: empProjects.length },
    { key: "tasks", label: "Tasks", count: empTasks.filter((t) => t.status !== "done").length },
    { key: "attendance", label: "Attendance" },
    { key: "leaves", label: "Leaves", count: empLeaves.filter((l) => l.status === "pending").length || undefined },
    ...(canSeePay ? [{ key: "payroll" as Tab, label: "Payroll" }] : []),
  ];

  const statusBadge = (
    <Badge color={emp.status === "active" ? "success" : emp.status === "on_leave" ? "warning" : "slate"} dot>
      {emp.status === "on_leave" ? "On leave" : emp.status ?? "active"}
    </Badge>
  );

  return (
    <div className="space-y-4">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        <ChevronLeft size={16} /> {backLabel}
      </Link>

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* ── LEFT: identity card + calendar (sticky on desktop) ── */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="overflow-hidden">
            {/* soft banner behind the avatar */}
            <div className="h-16 bg-gradient-to-r from-[var(--primary-soft)] to-[var(--surface-2)]" />
            <div className="-mt-10 flex flex-col items-center px-5 pb-5 text-center">
              <div className="rounded-full ring-4 ring-[var(--surface)]">
                <Avatar name={emp.name} size={80} src={emp.avatarUrl} />
              </div>
              <h1 className="mt-3 text-lg font-bold tracking-tight">{emp.name}</h1>
              <p className="text-sm text-[var(--muted)]">{roleLabel(emp, dept)}</p>
              <div className="mt-2">{statusBadge}</div>

              {/* contact block */}
              <div className="mt-4 w-full space-y-2 border-t border-[var(--border)] pt-4 text-left text-sm">
                {emp.phone && (
                  <div className="flex items-center gap-2.5 text-[var(--muted)]">
                    <Phone size={15} className="shrink-0 text-[var(--muted-2)]" />
                    <span className="truncate text-[var(--foreground)]">{emp.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-[var(--muted)]">
                  <Mail size={15} className="shrink-0 text-[var(--muted-2)]" />
                  <a href={`mailto:${emp.email}`} className="truncate text-[var(--foreground)] hover:text-[var(--primary)]">{emp.email}</a>
                </div>
                {emp.location && (
                  <div className="flex items-start gap-2.5 text-[var(--muted)]">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-[var(--muted-2)]" />
                    <span className="text-[var(--foreground)]">{emp.location}</span>
                  </div>
                )}
              </div>

              {/* all-time attendance highlight */}
              <div className="mt-4 flex w-full items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2 text-left">
                <span className="text-xs font-medium text-[var(--muted)]">Attendance</span>
                <span className="text-sm font-bold text-[var(--foreground)]">{att.pct}% <span className="font-normal text-[var(--muted-2)]">all-time</span></span>
              </div>

              {/* actions */}
              <div className="mt-4 grid w-full gap-2">
                {isSelf && <Button variant="primary" size="sm" className="w-full" onClick={() => setMyEditOpen(true)}><Pencil size={14} /> Edit profile</Button>}
                {canEdit && !isSelf && <Button variant="primary" size="sm" className="w-full" onClick={() => setEditOpen(true)}><Pencil size={14} /> Edit employee</Button>}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIdCardOpen(true)}><IdCard size={14} /> ID Card</Button>
                  <Button variant="outline" size="sm" onClick={exportProfile}><Download size={14} /> Export</Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="flex justify-center p-4">
            <AttendanceCalendar records={empAtt} />
          </Card>
        </aside>

        {/* ── RIGHT: tabbed content ── */}
        <div className="min-w-0 space-y-4">
          <Tabs tabs={tabs} active={tab} onChange={setTab} />

          {tab === "overview" && (
            <div className="space-y-4">
              <Card className="p-5">
                <h3 className="mb-2 text-sm font-semibold">Employment</h3>
                <InfoRow label="Department"><Badge color={dept?.color ?? "slate"}>{dept?.name}</Badge></InfoRow>
                <InfoRow label="Role">{roleLabel(emp, dept)}</InfoRow>
                <InfoRow label="Access level"><span className="capitalize">{emp.accessLevel}</span></InfoRow>
                <InfoRow label="Reports to">{mgr ? mgr.name : "—"}</InfoRow>
                <InfoRow label="Employment type"><span className="capitalize">{emp.employmentType?.replace("_", " ")}</span></InfoRow>
                <InfoRow label="Joined">{emp.joinedAt ? formatDate(emp.joinedAt) : "—"}</InfoRow>
                {emp.monthlyTargetRevenue ? <InfoRow label="Monthly revenue target">{inr(emp.monthlyTargetRevenue, { compact: true })}</InfoRow> : null}
              </Card>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="p-5">
                  <h3 className="mb-3 text-sm font-semibold">Leave balance</h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div><div className="text-xl font-bold">{emp.leaveBalance?.casual ?? 0}</div><div className="text-[11px] text-[var(--muted)]">Casual</div></div>
                    <div><div className="text-xl font-bold">{emp.leaveBalance?.sick ?? 0}</div><div className="text-[11px] text-[var(--muted)]">Sick</div></div>
                    <div><div className="text-xl font-bold">{emp.leaveBalance?.earned ?? 0}</div><div className="text-[11px] text-[var(--muted)]">Earned</div></div>
                  </div>
                </Card>
                {canSeePay && !!emp.ctcAnnual && (
                  <Card className="p-5">
                    <h3 className="mb-2 text-sm font-semibold">Compensation</h3>
                    <InfoRow label="Annual CTC">{inr(emp.ctcAnnual, { compact: true })}</InfoRow>
                    <InfoRow label="Monthly gross">{inr((emp.salary?.basic ?? 0) + (emp.salary?.hra ?? 0) + (emp.salary?.special ?? 0))}</InfoRow>
                    {emp.bankLast4 && <InfoRow label="Bank a/c">•••• {emp.bankLast4}</InfoRow>}
                  </Card>
                )}
              </div>
            </div>
          )}

      {tab === "projects" && (
        <Card className="overflow-hidden">
          {empProjects.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--muted)]">Not assigned to any projects.</div>
          ) : (
            <TableShell head={<><th className="px-4 py-3">Project</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Role</th><th className="px-4 py-3"></th></>}>
              {empProjects.map((p) => (
                <tr key={p.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                  <td className="px-4 py-3"><Link href={`/projects/${p.id}`} className="font-medium hover:text-[var(--primary)]">{p.name}</Link></td>
                  <td className="px-4 py-3 text-[var(--muted)]">{p.clientCompany}</td>
                  <td className="px-4 py-3"><Badge color={projectStatusColor[p.status]} dot>{projectStatusLabel[p.status]}</Badge></td>
                  <td className="px-4 py-3"><Badge color={priorityColor[p.priority]}>{p.priority}</Badge></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><ProgressBar value={p.progress} className="w-20" /><span className="text-xs">{p.progress}%</span></div></td>
                  <td className="px-4 py-3 text-xs">{p.managerId === emp.id ? "Lead" : "Member"}</td>
                  <td className="px-4 py-3 text-right"><Link href={`/projects/${p.id}`}><ChevronRight size={16} className="text-[var(--muted-2)]" /></Link></td>
                </tr>
              ))}
            </TableShell>
          )}
        </Card>
      )}

      {tab === "tasks" && (
        <div className="space-y-3">
          {empTasks.length > 0 && <div className="flex justify-end"><Button variant="outline" size="sm" onClick={exportTasks}><Download size={14} /> Export tasks</Button></div>}
          <Card className="overflow-hidden">
          {empTasks.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--muted)]">No tasks assigned.</div>
          ) : (
            <TableShell head={<><th className="px-4 py-3">Task</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Due</th></>}>
              {empTasks.map((t) => (
                <tr key={t.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                  <td className="px-4 py-3 font-medium">{t.title}</td>
                  <td className="px-4 py-3"><Badge color={taskStatusColor[t.status]} dot>{taskStatusLabel[t.status]}</Badge></td>
                  <td className="px-4 py-3"><Badge color={priorityColor[t.priority]}>{t.priority}</Badge></td>
                  <td className="px-4 py-3 text-xs text-[var(--muted)]">{t.dueAt ? formatDate(t.dueAt) : "—"}</td>
                </tr>
              ))}
            </TableShell>
          )}
          </Card>
        </div>
      )}

      {tab === "attendance" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
            <Card className="p-4"><Stat label={isWorkingNow ? "Working today" : "Worked today"} value={fmtDur(workingTodayMin)} accent={isWorkingNow ? "var(--success)" : undefined} sub={isWorkingNow ? "in progress" : undefined} /></Card>
            <Card className="p-4"><Stat label="Total worked" value={fmtDur(shownAtt.reduce((s, a) => s + (a.workedMinutes ?? 0), 0))} sub={attMonth === "all" ? "all time" : monthLabel(attMonth)} /></Card>
            <Card className="p-4"><Stat label="Present" value={monthSummary.present} accent="var(--success)" /></Card>
            <Card className="p-4"><Stat label="Half days" value={monthSummary.half} accent="var(--warning)" /></Card>
            <Card className="p-4"><Stat label="On leave" value={monthSummary.leave} accent="var(--purple)" /></Card>
            <Card className="p-4"><Stat label="Absent" value={monthSummary.absent} accent="var(--danger)" /></Card>
          </div>
          {/* month filter — view any previous month's attendance */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-[var(--muted)]">Month</span>
              <select
                value={attMonth}
                onChange={(e) => setAttMonth(e.target.value)}
                className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="all">All months</option>
                {attMonths.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
              </select>
              <span className="text-xs text-[var(--muted-2)]">{shownAtt.length} {shownAtt.length === 1 ? "day" : "days"}</span>
            </label>
            <div className="flex items-center gap-2">
              {canEditAttendance && <Button variant="primary" size="sm" onClick={() => setAttEditDate(today)}><CalendarClock size={14} /> Edit attendance</Button>}
              {shownAtt.length > 0 && <Button variant="outline" size="sm" onClick={exportAttendance}><Download size={14} /> Export attendance</Button>}
            </div>
          </div>
          {/* Admin: days this employee forgot to clock out and asked to have fixed */}
          {canEditAttendance && (() => {
            const rv = empAtt.filter((a) => needsAttendanceReview(a, today)).sort((a, b) => (a.date < b.date ? 1 : -1));
            if (!rv.length) return null;
            return (
              <button
                onClick={() => setAttEditDate(rv[0].date)}
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-left transition-colors hover:brightness-[0.98]"
              >
                <AlertTriangle size={18} className="shrink-0 text-[var(--warning)]" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[var(--warning)]">{rv.length} day{rv.length > 1 ? "s" : ""} need review</div>
                  <div className="text-xs text-[var(--muted)]">{emp.name.split(" ")[0]} forgot to clock out and asked for a fix. Counting as half-days until corrected — tap to review.</div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-[var(--warning)]" />
              </button>
            );
          })()}
          <Card className="overflow-hidden">
            {shownAtt.length === 0 ? (
              <div className="py-12 text-center text-sm text-[var(--muted)]">No attendance recorded for this month.</div>
            ) : (
            <TableShell head={<><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Check in</th><th className="px-4 py-3">Check out</th><th className="px-4 py-3">Worked</th><th className="px-4 py-3">Breaks</th>{canEditAttendance && <th className="px-4 py-3"></th>}</>}>
              {shownAtt.map((a) => {
                const done = (a.breaks ?? []).filter((b) => b.endedAt);
                const brkMin = done.reduce((s, b) => s + Math.round((Date.parse(b.endedAt!) - Date.parse(b.startedAt)) / 60000), 0);
                const eff = effectiveAttendanceStatus(a, today);
                const flagged = needsAttendanceReview(a, today);
                return (
                  <tr key={a.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3">{formatDate(a.date)}{a.date === today && <span className="ml-1.5 text-[10px] font-semibold uppercase text-[var(--primary)]">Today</span>}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5"><Badge color={attendanceColor[eff]}>{attendanceLabel[eff]}</Badge>{flagged && <AlertTriangle size={13} className="text-[var(--warning)]" aria-label="Needs review" />}</span></td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)]">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)]">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "—"}</td>
                    <td className="px-4 py-3 text-xs">{a.date === today && isWorkingNow ? fmtDur(workingTodayMin) : a.workedMinutes ? `${Math.floor(a.workedMinutes / 60)}h ${a.workedMinutes % 60}m` : "—"}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)]">{done.length ? `${done.length} · ${brkMin}m` : "—"}</td>
                    {canEditAttendance && (
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setAttEditDate(a.date)} title="Edit attendance" className="rounded-md p-1.5 text-[var(--muted-2)] hover:bg-[var(--surface-2)] hover:text-[var(--primary)]"><Pencil size={15} /></button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </TableShell>
            )}
          </Card>
        </div>
      )}

      {tab === "leaves" && (
        <div className="space-y-3">
          {empLeaves.length > 0 && <div className="flex justify-end"><Button variant="outline" size="sm" onClick={exportLeaves}><Download size={14} /> Export leaves</Button></div>}
          <Card className="overflow-hidden">
          {empLeaves.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--muted)]">No leave requests.</div>
          ) : (
            <TableShell head={<><th className="px-4 py-3">Type</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Days</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th></>}>
              {empLeaves.map((l) => (
                <tr key={l.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3">{leaveTypeLabel[l.type]}</td>
                  <td className="px-4 py-3 text-xs text-[var(--muted)]">{formatDate(l.from)} → {formatDate(l.to)}</td>
                  <td className="px-4 py-3">{l.days}</td>
                  <td className="px-4 py-3 text-xs text-[var(--muted)]">{l.reason}</td>
                  <td className="px-4 py-3"><Badge color={leaveStatusColor[l.status]} dot>{l.status}</Badge></td>
                </tr>
              ))}
            </TableShell>
          )}
          </Card>
        </div>
      )}

      {tab === "payroll" && canSeePay && (
        <div className="space-y-3">
          {empPayslips.length === 0 ? (
            <Card><div className="py-12 text-center text-sm text-[var(--muted)]">No payslips yet.</div></Card>
          ) : empPayslips.map((p) => {
            const t = payslipTotals(p);
            return (
              <Card key={p.id} className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet size={18} className="text-[var(--muted)]" />
                    <span className="font-semibold">{monthLabel(p.month)}</span>
                    <Badge color={p.status === "paid" ? "success" : p.status === "processed" ? "info" : "slate"}>{p.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right"><div className="text-lg font-bold">{inr(t.net)}</div><div className="text-[11px] text-[var(--muted)]">Net pay</div></div>
                    <Button variant="outline" size="sm" onClick={() => downloadPayslip(p, emp)}><Download size={14} /> Payslip</Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase text-[var(--muted-2)]">Earnings</div>
                    {p.earnings.map((e) => <div key={e.label} className="flex justify-between py-0.5 text-sm"><span className="text-[var(--muted)]">{e.label}</span><span>{inr(e.amount)}</span></div>)}
                    <div className="mt-1 flex justify-between border-t border-[var(--border)] pt-1 text-sm font-semibold"><span>Gross</span><span>{inr(t.earnings)}</span></div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase text-[var(--muted-2)]">Deductions</div>
                    {p.deductions.map((e) => <div key={e.label} className="flex justify-between py-0.5 text-sm"><span className="text-[var(--muted)]">{e.label}</span><span>−{inr(e.amount)}</span></div>)}
                    <div className="mt-1 flex justify-between border-t border-[var(--border)] pt-1 text-sm font-semibold"><span>Total</span><span>−{inr(t.deductions)}</span></div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
        </div>
      </div>
      {canEdit && !isSelf && <EditEmployeeModal open={editOpen} onClose={() => setEditOpen(false)} employee={emp} />}
      {isSelf && <MyProfileEditModal open={myEditOpen} onClose={() => setMyEditOpen(false)} employee={emp} />}
      {canEditAttendance && (
        <AttendanceEditModal
          open={!!attEditDate}
          onClose={() => setAttEditDate(null)}
          employee={emp}
          date={attEditDate ?? today}
        />
      )}
      <IdCardModal open={idCardOpen} onClose={() => setIdCardOpen(false)} employee={emp} />
    </div>
  );
}
