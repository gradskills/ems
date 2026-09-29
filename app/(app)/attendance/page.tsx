"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { localDateISO } from "@/lib/utils";
import { userById } from "@/lib/seed/users";
import { departmentById } from "@/lib/seed/org";
import { Card, Badge, Avatar, ProgressBar, Stat } from "@/components/ui/primitives";
import { PageHeader, TableShell, SegmentedControl, SearchInput } from "@/components/ems/kit";
import { AttendanceCalendar } from "@/components/ems/AttendanceCalendar";
import { AttendanceEditModal } from "@/components/ems/AttendanceEditModal";
import {
  visibleEmployees, attendanceSummary, attendanceLabel, attendanceColor,
  activeBreak, breakTypeLabel, needsAttendanceReview,
} from "@/lib/ems";
import type { AttendanceRecord, User, CompanyDay, CompanyDayType } from "@/lib/types";
import { MapPin, Clock, Camera, Table2, CalendarDays, Users, Coffee, ChevronRight, Pencil, CalendarCog, PartyPopper, Briefcase, AlertTriangle, Info, Trash2, Plus } from "lucide-react";

type View = "today" | "everyone" | "calendar" | "days";
type BadgeColor = "slate" | "success" | "warning" | "info" | "purple" | "danger" | "primary";

// ── company-day (holiday / working-day / portal-issue) presentation ──
const companyDayMeta: Record<CompanyDayType, { label: string; color: BadgeColor; icon: typeof PartyPopper }> = {
  holiday: { label: "Holiday", color: "purple", icon: PartyPopper },
  working_day: { label: "Working day", color: "success", icon: Briefcase },
  technical_issue: { label: "Technical / portal issue", color: "warning", icon: AlertTriangle },
  other: { label: "Other", color: "info", icon: Info },
};

// derive a person's live state for today from their record
function todayState(rec?: AttendanceRecord): { key: "working" | "wfh" | "break" | "out" | "notin"; label: string; color: BadgeColor } {
  if (activeBreak(rec)) return { key: "break", label: `On ${breakTypeLabel[activeBreak(rec)!.type]} break`, color: "warning" };
  if (rec?.checkIn && !rec?.checkOut) return rec.status === "wfh"
    ? { key: "wfh", label: "Work from home", color: "info" }
    : { key: "working", label: "Working now", color: "success" };
  if (rec?.checkOut) return { key: "out", label: "Clocked out", color: "slate" };
  return { key: "notin", label: "Not in yet", color: "slate" };
}

const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "—");

export default function AttendancePage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const viewLens = useApp((s) => s.viewLens);
  const employees = useApp((s) => s.employees);
  const attendance = useApp((s) => s.attendance);
  const departments = useApp((s) => s.departments);
  const companyDays = useApp((s) => s.companyDays);
  const saveCompanyDay = useApp((s) => s.saveCompanyDay);
  const removeCompanyDay = useApp((s) => s.removeCompanyDay);
  const viewer = userById(actingUserId)!;
  const today = localDateISO();
  const isAdmin = viewer.accessLevel === "admin";
  const lensDept = viewLens !== "management" ? viewLens : null;

  const todayCompanyDay = companyDays.find((d) => d.date === today);

  // company-day form (admin) — add or edit a holiday / working-day / portal-issue
  const [cdId, setCdId] = useState<string | null>(null);
  const [cdDate, setCdDate] = useState("");
  const [cdType, setCdType] = useState<CompanyDayType>("holiday");
  const [cdReason, setCdReason] = useState("");
  const resetCdForm = () => { setCdId(null); setCdDate(""); setCdType("holiday"); setCdReason(""); };
  const editCompanyDay = (d: CompanyDay) => { setCdId(d.id); setCdDate(d.date); setCdType(d.type); setCdReason(d.reason); };
  const submitCompanyDay = () => {
    if (!cdDate || !cdReason.trim()) return;
    saveCompanyDay({ id: cdId ?? undefined, date: cdDate, type: cdType, reason: cdReason.trim() });
    resetCdForm();
  };
  const sortedCompanyDays = useMemo(() => [...companyDays].sort((a, b) => (a.date < b.date ? 1 : -1)), [companyDays]);

  const [editTarget, setEditTarget] = useState<{ user: User; date: string } | null>(null);
  const [view, setView] = useState<View>("today");
  const [deptFilter, setDeptFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>(""); // today view: "" | working | break | wfh | out | notin
  const [query, setQuery] = useState("");
  const [photoModal, setPhotoModal] = useState<{ src: string; name: string } | null>(null);
  const [calEmpId, setCalEmpId] = useState<string>("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const rangeActive = !!(rangeFrom || rangeTo);
  const inRange = (date: string) => (!rangeFrom || date >= rangeFrom) && (!rangeTo || date <= rangeTo);

  // tick so on-break elapsed minutes stay fresh
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(i);
  }, []);

  const people = useMemo(
    () => visibleEmployees(viewer, employees)
      .filter((u) => u.id !== viewer.id || viewer.accessLevel !== "admin")
      .filter((u) => !lensDept || u.departmentId === lensDept),
    [viewer, employees, lensDept]
  );

  // today's record per person (for the "who's in" board + counters)
  const withToday = useMemo(
    () => people.map((u) => ({ u, rec: attendance.find((a) => a.userId === u.id && a.date === today), st: todayState(attendance.find((a) => a.userId === u.id && a.date === today)) })),
    [people, attendance, today]
  );

  const count = (k: string) => withToday.filter((r) => r.st.key === k).length;
  const inToday = withToday.filter((r) => r.st.key !== "notin").length;

  // Admin: past days an employee forgot to clock out AND asked an admin to fix
  // via "Contact admin". A forgotten punch-out with no request quietly counts as
  // a half-day, so it does NOT appear here. We key the flagged days by employee
  // so each attendance row can show a "needs review" mark beside its edit pencil,
  // and the editor can list every pending day for that person (latest first).
  const reviewByUser = useMemo(() => {
    const m = new Map<string, AttendanceRecord[]>();
    if (!isAdmin) return m;
    for (const a of attendance) {
      if (needsAttendanceReview(a, today)) {
        const arr = m.get(a.userId) ?? [];
        arr.push(a);
        m.set(a.userId, arr);
      }
    }
    for (const arr of m.values()) arr.sort((x, y) => (x.date < y.date ? 1 : -1));
    return m;
  }, [isAdmin, attendance, today]);

  // department options limited to those that actually have people in view
  const deptOptions = useMemo(() => {
    const ids = new Set(people.map((p) => p.departmentId));
    return departments.filter((d) => ids.has(d.id));
  }, [people, departments]);

  const matchesFilters = useCallback(
    (u: (typeof people)[number]) =>
      (!deptFilter || u.departmentId === deptFilter) &&
      (!query.trim() || u.name.toLowerCase().includes(query.trim().toLowerCase())),
    [deptFilter, query]
  );

  // rows for the "in today" board — only people who are in (unless a status filter picks another cohort)
  const todayRows = useMemo(() => {
    return withToday
      .filter(({ u }) => matchesFilters(u))
      .filter(({ st }) => (statusFilter ? st.key === statusFilter : st.key !== "notin"))
      .sort((a, b) => {
        const rank = (k: string) => ({ break: 0, working: 1, wfh: 2, out: 3, notin: 4 }[k] ?? 5);
        const d = rank(a.st.key) - rank(b.st.key);
        if (d !== 0) return d;
        return (b.rec?.checkIn ?? "").localeCompare(a.rec?.checkIn ?? "");
      });
  }, [withToday, statusFilter, matchesFilters]);

  const everyoneRows = useMemo(() => people.filter(matchesFilters), [people, matchesFilters]);

  const calEmp = people.find((p) => p.id === calEmpId) ?? people[0];

  const statusChips: { key: string; label: string }[] = [
    { key: "", label: "In today" },
    { key: "working", label: "Working" },
    { key: "break", label: "On break" },
    { key: "wfh", label: "WFH" },
    { key: "out", label: "Clocked out" },
    { key: "notin", label: "Not in" },
  ];

  function breakCell(rec?: AttendanceRecord) {
    const brk = activeBreak(rec);
    if (brk) {
      const elapsed = Math.max(0, Math.floor((now - Date.parse(brk.startedAt)) / 60000));
      const overdue = elapsed >= brk.plannedMinutes;
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${overdue ? "text-[var(--danger)]" : "text-[var(--warning)]"}`}>
          <Coffee size={12} /> {breakTypeLabel[brk.type]} · {elapsed}/{brk.plannedMinutes}m{overdue ? " · over" : ""}
        </span>
      );
    }
    const done = (rec?.breaks ?? []).filter((b) => b.endedAt);
    if (done.length) {
      const total = done.reduce((s, b) => s + Math.round((Date.parse(b.endedAt!) - Date.parse(b.startedAt)) / 60000), 0);
      return <span className="text-xs text-[var(--muted)]">{done.length} break{done.length > 1 ? "s" : ""} · {total}m</span>;
    }
    return <span className="text-xs text-[var(--muted-2)]">—</span>;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Attendance" subtitle={`${people.length} people${viewer.accessLevel === "manager" ? " in your team" : ""} · ${inToday} in today`} />

      {/* Today is an admin-declared company day (holiday / working-day / portal issue) */}
      {todayCompanyDay && (() => {
        const meta = companyDayMeta[todayCompanyDay.type];
        const Icon = meta.icon;
        return (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--primary)]"><Icon size={18} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">Today: {meta.label}</span>
                <Badge color={meta.color} dot>{meta.label}</Badge>
              </div>
              <div className="truncate text-xs text-[var(--muted)]">{todayCompanyDay.reason}</div>
            </div>
            {isAdmin && (
              <button onClick={() => { setView("days"); editCompanyDay(todayCompanyDay); }} className="shrink-0 text-xs font-medium text-[var(--primary)] hover:underline">Edit</button>
            )}
          </div>
        );
      })()}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4"><Stat label="Working now" value={count("working")} accent="var(--success)" /></Card>
        <Card className="p-4"><Stat label="On break" value={count("break")} accent="var(--warning)" /></Card>
        <Card className="p-4"><Stat label="Work from home" value={count("wfh")} accent="var(--info)" /></Card>
        <Card className="p-4"><Stat label="Not in yet" value={count("notin")} /></Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl
          value={view}
          onChange={setView}
          items={[
            { key: "today", label: "In today", icon: <Users size={14} /> },
            { key: "everyone", label: "Everyone", icon: <Table2 size={14} /> },
            { key: "calendar", label: "Calendar", icon: <CalendarDays size={14} /> },
            ...(isAdmin ? [{ key: "days" as View, label: "Company days", icon: <CalendarCog size={14} /> }] : []),
          ]}
        />
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {view !== "calendar" && view !== "days" && (
            <div className="sm:w-52"><SearchInput value={query} onChange={setQuery} placeholder="Search name…" /></div>
          )}
          {view !== "calendar" && view !== "days" && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-10 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)]"
            >
              <option value="">All departments</option>
              {deptOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          {view === "calendar" && calEmp && (
            <select
              value={calEmp.id}
              onChange={(e) => setCalEmpId(e.target.value)}
              className="h-10 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)] sm:w-64"
            >
              {people.map((p) => <option key={p.id} value={p.id}>{p.name} · {departmentById(p.departmentId)?.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* ── IN TODAY ── */}
      {view === "today" && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {statusChips.map((c) => (
              <button
                key={c.key}
                onClick={() => setStatusFilter(c.key)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${statusFilter === c.key ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <Card className="overflow-hidden">
            {todayRows.length === 0 ? (
              <div className="py-12 text-center text-sm text-[var(--muted)]">No one matches this filter.</div>
            ) : (
              <TableShell head={<><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Clock-in</th><th className="px-4 py-3">Break</th><th className="px-4 py-3">Location</th><th className="px-4 py-3"></th></>}>
                {todayRows.map(({ u, rec, st }) => {
                  const d = departmentById(u.departmentId);
                  return (
                    <tr key={u.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                      <td className="px-4 py-3">
                        <Link href={`/employees/${u.id}?tab=attendance`} className="flex items-center gap-2.5">
                          {rec?.checkInPhoto ? (
                            <img src={rec.checkInPhoto} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-[var(--success)]" style={{ transform: "scaleX(-1)" }} />
                          ) : (
                            <Avatar name={u.name} size={30} />
                          )}
                          <span className="font-medium hover:text-[var(--primary)]">{u.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3"><Badge color={d?.color ?? "slate"}>{d?.name}</Badge></td>
                      <td className="px-4 py-3"><Badge color={st.color} dot>{st.label}</Badge></td>
                      <td className="px-4 py-3">
                        {rec?.checkIn ? (
                          <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                            <Clock size={12} /> {fmtTime(rec.checkIn)}{rec.checkOut ? ` → ${fmtTime(rec.checkOut)}` : ""}
                          </span>
                        ) : <span className="text-xs text-[var(--muted-2)]">—</span>}
                      </td>
                      <td className="px-4 py-3">{breakCell(rec)}</td>
                      <td className="px-4 py-3">
                        {rec?.checkInCoords ? (
                          <a
                            href={`https://www.google.com/maps?q=${rec.checkInCoords.lat},${rec.checkInCoords.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline"
                          >
                            <MapPin size={12} /> {rec.checkInCoords.lat.toFixed(3)}, {rec.checkInCoords.lng.toFixed(3)}
                          </a>
                        ) : rec?.checkInPhoto ? (
                          <button onClick={() => setPhotoModal({ src: rec.checkInPhoto!, name: u.name })} className="flex items-center gap-1.5 text-xs text-[var(--muted-2)] hover:text-[var(--primary)]">
                            <Camera size={12} /> Selfie
                          </button>
                        ) : <span className="text-xs text-[var(--muted-2)]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isAdmin && (() => { const rv = reviewByUser.get(u.id); return rv?.length ? (
                            <button onClick={() => setEditTarget({ user: u, date: rv[0].date })} title={`${rv.length} day${rv.length > 1 ? "s" : ""} need review — forgot to clock out`} className="relative rounded-md p-1.5 text-[var(--warning)] hover:bg-[var(--warning-soft)]">
                              <AlertTriangle size={15} />
                              {rv.length > 1 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--warning)] px-1 text-[10px] font-bold leading-none text-white">{rv.length}</span>}
                            </button>
                          ) : null; })()}
                          {isAdmin && (
                            <button onClick={() => setEditTarget({ user: u, date: today })} title="Edit attendance" className="rounded-md p-1.5 text-[var(--muted-2)] hover:bg-[var(--surface)] hover:text-[var(--primary)]">
                              <Pencil size={15} />
                            </button>
                          )}
                          <Link href={`/employees/${u.id}?tab=attendance`}><ChevronRight size={16} className="text-[var(--muted-2)]" /></Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </TableShell>
            )}
          </Card>
        </>
      )}

      {/* ── EVERYONE (complete attendance) ── */}
      {view === "everyone" && (
        <>
          <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 sm:flex-row sm:items-center">
            <span className="text-xs font-semibold text-[var(--muted)]">Date range</span>
            <div className="flex items-center gap-2">
              <input type="date" value={rangeFrom} max={rangeTo || today} onChange={(e) => setRangeFrom(e.target.value)} className="h-9 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-sm outline-none focus:border-[var(--primary)]" />
              <span className="text-xs text-[var(--muted-2)]">to</span>
              <input type="date" value={rangeTo} min={rangeFrom || undefined} max={today} onChange={(e) => setRangeTo(e.target.value)} className="h-9 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-sm outline-none focus:border-[var(--primary)]" />
            </div>
            {rangeActive && (
              <button onClick={() => { setRangeFrom(""); setRangeTo(""); }} className="text-xs font-medium text-[var(--primary)] hover:underline">Clear</button>
            )}
            <span className="text-xs text-[var(--muted-2)] sm:ml-auto">{rangeActive ? "Showing the selected range" : "Showing the last 30 days"}</span>
          </div>

          <Card className="overflow-hidden">
            {everyoneRows.length === 0 ? (
              <div className="py-12 text-center text-sm text-[var(--muted)]">No one matches this filter.</div>
            ) : (
              <TableShell head={<><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Today</th><th className="px-4 py-3">{rangeActive ? "In range" : "Last 30 days"}</th><th className="px-4 py-3">P / HD / L / A</th><th className="px-4 py-3">Worked</th><th className="px-4 py-3"></th></>}>
                {everyoneRows.map((u) => {
                  const recs = attendance.filter((a) => a.userId === u.id && inRange(a.date));
                  const s = attendanceSummary(recs);
                  const t = attendance.find((a) => a.userId === u.id && a.date === today);
                  const workedMin = recs.reduce((sum, a) => sum + (a.workedMinutes ?? 0), 0);
                  const d = departmentById(u.departmentId);
                  return (
                    <tr key={u.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                      <td className="px-4 py-3">
                        <Link href={`/employees/${u.id}?tab=attendance`} className="flex items-center gap-2.5">
                          <Avatar name={u.name} size={30} />
                          <span className="font-medium hover:text-[var(--primary)]">{u.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3"><Badge color={d?.color ?? "slate"}>{d?.name}</Badge></td>
                      <td className="px-4 py-3">{t ? <Badge color={attendanceColor[t.status]}>{attendanceLabel[t.status]}</Badge> : <span className="text-xs text-[var(--muted-2)]">—</span>}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><ProgressBar value={s.pct} className="w-24" color={s.pct >= 90 ? "var(--success)" : s.pct >= 75 ? "var(--warning)" : "var(--danger)"} /><span className="text-xs font-medium">{s.pct}%</span></div></td>
                      <td className="px-4 py-3 text-xs text-[var(--muted)]">{s.present} / {s.half} / {s.leave} / {s.absent}</td>
                      <td className="px-4 py-3 text-xs">{workedMin ? `${Math.floor(workedMin / 60)}h ${workedMin % 60}m` : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isAdmin && (() => { const rv = reviewByUser.get(u.id); return rv?.length ? (
                            <button onClick={() => setEditTarget({ user: u, date: rv[0].date })} title={`${rv.length} day${rv.length > 1 ? "s" : ""} need review — forgot to clock out`} className="relative rounded-md p-1.5 text-[var(--warning)] hover:bg-[var(--warning-soft)]">
                              <AlertTriangle size={15} />
                              {rv.length > 1 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--warning)] px-1 text-[10px] font-bold leading-none text-white">{rv.length}</span>}
                            </button>
                          ) : null; })()}
                          {isAdmin && (
                            <button onClick={() => setEditTarget({ user: u, date: today })} title="Edit today's attendance" className="rounded-md p-1.5 text-[var(--muted-2)] hover:bg-[var(--surface)] hover:text-[var(--primary)]">
                              <Pencil size={15} />
                            </button>
                          )}
                          <Link href={`/employees/${u.id}?tab=attendance`}><ChevronRight size={16} className="text-[var(--muted-2)]" /></Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </TableShell>
            )}
          </Card>
        </>
      )}

      {/* ── CALENDAR (per person) ── */}
      {view === "calendar" && calEmp && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Avatar name={calEmp.name} size={34} />
              <div>
                <div className="text-sm font-semibold">{calEmp.name}</div>
                <div className="text-xs text-[var(--muted)]">{departmentById(calEmp.departmentId)?.name} · {attendanceSummary(attendance.filter((a) => a.userId === calEmp.id)).pct}% attendance</div>
              </div>
            </div>
            <Link href={`/employees/${calEmp.id}?tab=attendance`} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline">
              Full record <ChevronRight size={14} />
            </Link>
          </div>
          <div className="mx-auto max-w-md">
            <AttendanceCalendar records={attendance.filter((a) => a.userId === calEmp.id)} />
          </div>
        </Card>
      )}

      {/* ── COMPANY DAYS (admin: holidays / working days / portal issues) ── */}
      {view === "days" && isAdmin && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* add / edit form */}
          <Card className="p-5 lg:col-span-1">
            <h3 className="mb-1 text-sm font-semibold">{cdId ? "Edit company day" : "Add a company day"}</h3>
            <p className="mb-4 text-xs text-[var(--muted)]">Declare a holiday, a designated working day, a day the attendance portal had issues, or any other note. Applies to everyone and can be set for past dates.</p>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Date</span>
                <input type="date" value={cdDate} onChange={(e) => setCdDate(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Type</span>
                <select value={cdType} onChange={(e) => setCdType(e.target.value as CompanyDayType)} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]">
                  {(Object.keys(companyDayMeta) as CompanyDayType[]).map((t) => <option key={t} value={t}>{companyDayMeta[t].label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Reason / note</span>
                <input value={cdReason} onChange={(e) => setCdReason(e.target.value)} placeholder="e.g. Diwali, Server maintenance…" className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" />
              </label>
              <div className="flex gap-2 pt-1">
                <button onClick={submitCompanyDay} disabled={!cdDate || !cdReason.trim()} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">
                  {cdId ? <><Pencil size={14} /> Save changes</> : <><Plus size={14} /> Add day</>}
                </button>
                {cdId && <button onClick={resetCdForm} className="rounded-lg border border-[var(--border-strong)] px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-2)]">Cancel</button>}
              </div>
            </div>
          </Card>

          {/* list of declared days */}
          <Card className="overflow-hidden lg:col-span-2">
            {sortedCompanyDays.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <CalendarCog size={26} className="text-[var(--muted-2)]" />
                <p className="text-sm text-[var(--muted)]">No company days declared yet.</p>
              </div>
            ) : (
              <TableShell head={<><th className="px-4 py-3">Date</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3"></th></>}>
                {sortedCompanyDays.map((d) => {
                  const meta = companyDayMeta[d.type];
                  const Icon = meta.icon;
                  return (
                    <tr key={d.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                        <div className="text-[11px] text-[var(--muted-2)]">{new Date(d.date).toLocaleDateString("en-IN", { weekday: "long" })}{d.date === today ? " · Today" : ""}</div>
                      </td>
                      <td className="px-4 py-3"><Badge color={meta.color} dot><span className="inline-flex items-center gap-1"><Icon size={11} /> {meta.label}</span></Badge></td>
                      <td className="px-4 py-3 text-sm text-[var(--muted)]">{d.reason}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => editCompanyDay(d)} title="Edit" className="rounded-md p-1.5 text-[var(--muted-2)] hover:bg-[var(--surface)] hover:text-[var(--primary)]"><Pencil size={15} /></button>
                          <button onClick={() => removeCompanyDay(d.id)} title="Delete" className="rounded-md p-1.5 text-[var(--muted-2)] hover:bg-[var(--surface)] hover:text-[var(--danger)]"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </TableShell>
            )}
          </Card>
        </div>
      )}

      {photoModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setPhotoModal(null)}>
          <div className="relative max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-sm font-semibold">{photoModal.name}&apos;s clock-in selfie</h3>
            <img src={photoModal.src} alt="Clock-in selfie" className="w-full rounded-xl" style={{ transform: "scaleX(-1)" }} />
            <button onClick={() => setPhotoModal(null)} className="absolute right-3 top-3 rounded-lg p-1 text-[var(--muted-2)] hover:bg-[var(--surface-2)]">✕</button>
          </div>
        </div>
      )}

      {isAdmin && (
        <AttendanceEditModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          employee={editTarget?.user ?? null}
          date={editTarget?.date ?? today}
          record={editTarget ? attendance.find((a) => a.userId === editTarget.user.id && a.date === editTarget.date) : undefined}
        />
      )}
    </div>
  );
}
