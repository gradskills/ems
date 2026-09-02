"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { departmentById } from "@/lib/seed/org";
import { Card, Badge, Avatar, ProgressBar, Stat } from "@/components/ui/primitives";
import { PageHeader, TableShell, SegmentedControl, SearchInput } from "@/components/ems/kit";
import { AttendanceCalendar } from "@/components/ems/AttendanceCalendar";
import {
  visibleEmployees, attendanceSummary, attendanceLabel, attendanceColor,
  activeBreak, breakTypeLabel,
} from "@/lib/ems";
import type { AttendanceRecord } from "@/lib/types";
import { MapPin, Clock, Camera, Table2, CalendarDays, Users, Coffee, ChevronRight } from "lucide-react";

type View = "today" | "everyone" | "calendar";
type BadgeColor = "slate" | "success" | "warning" | "info" | "purple" | "danger" | "primary";

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
  const employees = useApp((s) => s.employees);
  const attendance = useApp((s) => s.attendance);
  const departments = useApp((s) => s.departments);
  const viewer = userById(actingUserId)!;
  const today = new Date().toISOString().slice(0, 10);

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
    () => visibleEmployees(viewer, employees).filter((u) => u.id !== viewer.id || viewer.accessLevel !== "admin"),
    [viewer, employees]
  );

  // today's record per person (for the "who's in" board + counters)
  const withToday = useMemo(
    () => people.map((u) => ({ u, rec: attendance.find((a) => a.userId === u.id && a.date === today), st: todayState(attendance.find((a) => a.userId === u.id && a.date === today)) })),
    [people, attendance, today]
  );

  const count = (k: string) => withToday.filter((r) => r.st.key === k).length;
  const inToday = withToday.filter((r) => r.st.key !== "notin").length;

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
          ]}
        />
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {view !== "calendar" && (
            <div className="sm:w-52"><SearchInput value={query} onChange={setQuery} placeholder="Search name…" /></div>
          )}
          {view !== "calendar" && (
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
                      <td className="px-4 py-3 text-right"><Link href={`/employees/${u.id}?tab=attendance`}><ChevronRight size={16} className="text-[var(--muted-2)]" /></Link></td>
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
                      <td className="px-4 py-3 text-right"><Link href={`/employees/${u.id}?tab=attendance`}><ChevronRight size={16} className="text-[var(--muted-2)]" /></Link></td>
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

      {photoModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setPhotoModal(null)}>
          <div className="relative max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-sm font-semibold">{photoModal.name}&apos;s clock-in selfie</h3>
            <img src={photoModal.src} alt="Clock-in selfie" className="w-full rounded-xl" style={{ transform: "scaleX(-1)" }} />
            <button onClick={() => setPhotoModal(null)} className="absolute right-3 top-3 rounded-lg p-1 text-[var(--muted-2)] hover:bg-[var(--surface-2)]">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
