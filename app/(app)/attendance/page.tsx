"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { departmentById } from "@/lib/seed/org";
import { Card, Badge, Avatar, ProgressBar, Stat } from "@/components/ui/primitives";
import { PageHeader, TableShell, SegmentedControl } from "@/components/ems/kit";
import { AttendanceCalendar } from "@/components/ems/AttendanceCalendar";
import { visibleEmployees, attendanceSummary, attendanceLabel, attendanceColor } from "@/lib/ems";
import { MapPin, Clock, Camera, Table2, CalendarDays } from "lucide-react";

export default function AttendancePage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const employees = useApp((s) => s.employees);
  const attendance = useApp((s) => s.attendance);
  const viewer = userById(actingUserId)!;
  const today = new Date().toISOString().slice(0, 10);

  const people = useMemo(() => visibleEmployees(viewer, employees).filter((u) => u.id !== viewer.id || viewer.accessLevel !== "admin"), [viewer, employees]);

  const todayRecords = people.map((u) => attendance.find((a) => a.userId === u.id && a.date === today));
  const presentToday = todayRecords.filter((r) => r && (r.status === "present" || r.status === "wfh")).length;
  const onLeaveToday = todayRecords.filter((r) => r?.status === "leave").length;
  const absentToday = todayRecords.filter((r) => r?.status === "absent").length;

  const [photoModal, setPhotoModal] = useState<{ src: string; name: string } | null>(null);
  const [view, setView] = useState<"table" | "calendar">("table");
  const [calEmpId, setCalEmpId] = useState<string>("");
  const calEmp = people.find((p) => p.id === calEmpId) ?? people[0];

  const fmtTime = (iso?: string) => iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "—";

  return (
    <div className="space-y-5">
      <PageHeader title="Attendance" subtitle={`${people.length} people${viewer.accessLevel === "manager" ? " in your team" : ""}`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4"><Stat label="Present today" value={presentToday} accent="var(--success)" /></Card>
        <Card className="p-4"><Stat label="On leave" value={onLeaveToday} accent="var(--purple)" /></Card>
        <Card className="p-4"><Stat label="Absent" value={absentToday} accent="var(--danger)" /></Card>
        <Card className="p-4"><Stat label="Headcount" value={people.length} /></Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          value={view}
          onChange={setView}
          items={[
            { key: "table", label: "Table", icon: <Table2 size={14} /> },
            { key: "calendar", label: "Calendar", icon: <CalendarDays size={14} /> },
          ]}
        />
        {view === "calendar" && calEmp && (
          <select
            value={calEmp.id}
            onChange={(e) => setCalEmpId(e.target.value)}
            className="h-9 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)] sm:w-64"
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {departmentById(p.departmentId)?.name}</option>
            ))}
          </select>
        )}
      </div>

      {view === "calendar" && calEmp && (
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <Avatar name={calEmp.name} size={34} />
            <div>
              <div className="text-sm font-semibold">{calEmp.name}</div>
              <div className="text-xs text-[var(--muted)]">{departmentById(calEmp.departmentId)?.name} · {attendanceSummary(attendance.filter((a) => a.userId === calEmp.id)).pct}% attendance</div>
            </div>
          </div>
          <div className="mx-auto max-w-md">
            <AttendanceCalendar records={attendance.filter((a) => a.userId === calEmp.id)} />
          </div>
        </Card>
      )}

      {view === "table" && (
      <Card className="overflow-hidden">
        <TableShell head={<><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Today</th><th className="px-4 py-3">Clock-in details</th><th className="px-4 py-3">This month</th><th className="px-4 py-3">P / HD / L / A</th></>}>
          {people.map((u) => {
            const recs = attendance.filter((a) => a.userId === u.id);
            const s = attendanceSummary(recs);
            const t = recs.find((a) => a.date === today);
            const d = departmentById(u.departmentId);
            return (
              <tr key={u.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                <td className="px-4 py-3">
                  <Link href={`/employees/${u.id}`} className="flex items-center gap-2.5">
                    <Avatar name={u.name} size={30} />
                    <span className="font-medium hover:text-[var(--primary)]">{u.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3"><Badge color={d?.color ?? "slate"}>{d?.name}</Badge></td>
                <td className="px-4 py-3">{t ? <Badge color={attendanceColor[t.status]}>{attendanceLabel[t.status]}</Badge> : <span className="text-xs text-[var(--muted-2)]">—</span>}</td>
                <td className="px-4 py-3">
                  {t?.checkIn ? (
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1.5 text-[var(--muted)]">
                        <Clock size={12} />
                        <span>{fmtTime(t.checkIn)}{t.checkOut ? ` → ${fmtTime(t.checkOut)}` : ""}</span>
                      </div>
                      {t.checkInCoords && (
                        <a
                          href={`https://www.google.com/maps?q=${t.checkInCoords.lat},${t.checkInCoords.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[var(--primary)] hover:underline"
                        >
                          <MapPin size={12} />
                          <span>{t.checkInCoords.lat.toFixed(4)}, {t.checkInCoords.lng.toFixed(4)}</span>
                        </a>
                      )}
                      {t.checkInPhoto && (
                        <button onClick={() => setPhotoModal({ src: t.checkInPhoto!, name: u.name })} className="flex items-center gap-1.5 text-[var(--muted-2)] hover:text-[var(--primary)]">
                          <Camera size={12} />
                          <img src={t.checkInPhoto} alt={`${u.name} selfie`} className="h-5 w-5 rounded-full object-cover" style={{ transform: "scaleX(-1)" }} />
                          <span>View selfie</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--muted-2)]">—</span>
                  )}
                </td>
                <td className="px-4 py-3"><div className="flex items-center gap-2"><ProgressBar value={s.pct} className="w-24" color={s.pct >= 90 ? "var(--success)" : s.pct >= 75 ? "var(--warning)" : "var(--danger)"} /><span className="text-xs font-medium">{s.pct}%</span></div></td>
                <td className="px-4 py-3 text-xs text-[var(--muted)]">{s.present} / {s.half} / {s.leave} / {s.absent}</td>
              </tr>
            );
          })}
        </TableShell>
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
