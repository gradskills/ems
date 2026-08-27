"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { departmentById } from "@/lib/seed/org";
import { Card, Badge, Button, Stat, Avatar } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ems/kit";
import { BreakWidget } from "@/components/ems/BreakWidget";
import { CameraCapture } from "@/components/ems/CameraCapture";
import { AttendanceCalendar } from "@/components/ems/AttendanceCalendar";
import { attendanceSummary, roleLabel } from "@/lib/ems";
import { LogIn, LogOut, Clock, MapPin, CalendarClock, Camera, Home, Building2, Users } from "lucide-react";

export default function ClockPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const attendance = useApp((s) => s.attendance);
  const clockIn = useApp((s) => s.clockIn);
  const clockOut = useApp((s) => s.clockOut);
  const me = userById(actingUserId)!;
  const dept = departmentById(me.departmentId);

  const today = new Date().toISOString().slice(0, 10);
  const todayRec = attendance.find((a) => a.userId === actingUserId && a.date === today);
  const clockedIn = !!todayRec?.checkIn && !todayRec?.checkOut;

  const [elapsed, setElapsed] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    if (!todayRec?.checkIn || todayRec.checkOut) { setElapsed(""); return; }
    const tick = () => {
      const diff = Date.now() - Date.parse(todayRec.checkIn!);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [todayRec?.checkIn, todayRec?.checkOut]);

  async function handleClockIn() {
    setCameraOpen(true);
  }

  async function doClockIn(r: { photo: string; coords?: { lat: number; lng: number }; timezone?: string; wfh: boolean }) {
    setBusy(true);
    setErr("");
    const ok = await clockIn(r);
    setBusy(false);
    if (!ok) setErr("Couldn't get your location. Please enable location access and try again.");
  }

  const summary = attendanceSummary(attendance.filter((a) => a.userId === me.id));
  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "—");

  // Admins don't clock in — they see a live board of who's working today.
  if (me.accessLevel === "admin") return <AdminAttendanceBoard />;

  return (
    <div className="space-y-5">
      <PageHeader title="Clock in / out" subtitle={`${me.name} · ${roleLabel(me, dept)}`} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full ${clockedIn ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--primary-soft)] text-[var(--primary)]"}`}>
              <Clock size={30} />
            </div>

            {!todayRec?.checkIn ? (
              <>
                <div>
                  <div className="text-lg font-semibold">You haven't clocked in yet</div>
                  <div className="text-sm text-[var(--muted)]">Clock in to start your workday. A selfie is required.</div>
                </div>
                {err && <div className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-xs font-medium text-[var(--danger)]">{err}</div>}
                <Button size="lg" onClick={handleClockIn} disabled={busy}><Camera size={18} /> {busy ? "Clocking in…" : "Clock in with selfie"}</Button>
              </>
            ) : !todayRec?.checkOut ? (
              <>
                {todayRec.checkInPhoto && (
                  <img src={todayRec.checkInPhoto} alt="Clock-in selfie" className="h-16 w-16 rounded-full object-cover ring-2 ring-[var(--success)]" style={{ transform: "scaleX(-1)" }} />
                )}
                <div className="font-mono text-4xl font-bold tabular-nums">{elapsed || "00:00:00"}</div>
                <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  Clocked in at {fmt(todayRec.checkIn)}
                  {todayRec.status === "wfh" && <Badge color="info" dot>Work from home</Badge>}
                </div>
                {todayRec.checkInCoords && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--muted-2)]">
                    <MapPin size={13} /> {todayRec.checkInCoords.lat.toFixed(4)}, {todayRec.checkInCoords.lng.toFixed(4)}
                    {todayRec.checkInTimezone && <span>({todayRec.checkInTimezone})</span>}
                  </div>
                )}
                <Button size="lg" variant="outline" onClick={clockOut}><LogOut size={18} /> Clock out</Button>
              </>
            ) : (
              <>
                <Badge color="success" dot>Clocked out for today</Badge>
                {todayRec.checkInPhoto && (
                  <img src={todayRec.checkInPhoto} alt="Clock-in selfie" className="h-14 w-14 rounded-full object-cover ring-2 ring-[var(--success)]" style={{ transform: "scaleX(-1)" }} />
                )}
                <div className="text-sm text-[var(--muted)]">In {fmt(todayRec.checkIn)} · Out {fmt(todayRec.checkOut)}
                  {todayRec.workedMinutes != null && ` · ${Math.floor(todayRec.workedMinutes / 60)}h ${todayRec.workedMinutes % 60}m worked`}
                </div>
              </>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4"><Stat label="Today" value={todayRec?.checkIn ? (todayRec.checkOut ? "Done" : "Active") : "—"} accent={clockedIn ? "var(--success)" : undefined} /></Card>
            <Card className="p-4"><Stat label="Attendance" value={`${summary.pct}%`} sub="30 days" /></Card>
          </div>
          <BreakWidget clockedIn={clockedIn} />
        </div>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><CalendarClock size={16} className="text-[var(--muted)]" /> My attendance</div>
        <AttendanceCalendar records={attendance.filter((a) => a.userId === me.id)} />
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><CalendarClock size={16} className="text-[var(--muted)]" /> Recent days</div>
        <div className="space-y-1.5">
          {attendance.filter((a) => a.userId === me.id).slice(0, 6).map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
              <span className="font-medium">{new Date(a.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
              <div className="flex items-center gap-2">
                {a.checkInPhoto && <img src={a.checkInPhoto} alt="" className="h-5 w-5 rounded-full object-cover" style={{ transform: "scaleX(-1)" }} />}
                <span className="text-xs text-[var(--muted)]">{fmt(a.checkIn)} → {fmt(a.checkOut)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(r) => { setCameraOpen(false); doClockIn(r); }}
      />
    </div>
  );
}

// ── Admin view: who's working today (no clock-in for admins) ──
function AdminAttendanceBoard() {
  const employees = useApp((s) => s.employees);
  const attendance = useApp((s) => s.attendance);
  const today = new Date().toISOString().slice(0, 10);
  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "—");

  // Everyone who actually clocks in (managers + employees), active accounts only
  const people = employees.filter((e) => e.accessLevel !== "admin" && e.status !== "inactive");
  const rows = people
    .map((e) => ({ e, rec: attendance.find((a) => a.userId === e.id && a.date === today) }))
    .sort((a, b) => {
      const rank = (x: typeof a) => (x.rec?.checkIn && !x.rec?.checkOut ? 0 : x.rec?.checkIn ? 1 : 2);
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
      return (b.rec?.checkIn ?? "").localeCompare(a.rec?.checkIn ?? "");
    });

  const workingNow = rows.filter((r) => r.rec?.checkIn && !r.rec?.checkOut);
  const wfhNow = workingNow.filter((r) => r.rec?.status === "wfh");
  const doneToday = rows.filter((r) => r.rec?.checkOut);
  const notIn = rows.filter((r) => !r.rec?.checkIn);

  const statusFor = (rec?: (typeof rows)[number]["rec"]) => {
    if (rec?.checkIn && !rec?.checkOut) return rec.status === "wfh"
      ? { label: "Working · WFH", color: "info" as const }
      : { label: "Working now", color: "success" as const };
    if (rec?.checkOut) return { label: "Clocked out", color: "slate" as const };
    return { label: "Not clocked in", color: "slate" as const };
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Who's in today" subtitle="Live attendance across the team" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4"><Stat label="Working now" value={String(workingNow.length)} accent="var(--success)" /></Card>
        <Card className="p-4"><Stat label="From home" value={String(wfhNow.length)} accent="var(--info)" /></Card>
        <Card className="p-4"><Stat label="Clocked out" value={String(doneToday.length)} /></Card>
        <Card className="p-4"><Stat label="Not in yet" value={String(notIn.length)} /></Card>
      </div>

      <Card className="p-0">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">
          <Users size={16} className="text-[var(--muted)]" /> Team ({people.length})
        </div>
        <div className="divide-y divide-[var(--border)]">
          {rows.map(({ e, rec }) => {
            const st = statusFor(rec);
            return (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                {rec?.checkInPhoto ? (
                  <img src={rec.checkInPhoto} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-[var(--success)]" style={{ transform: "scaleX(-1)" }} />
                ) : (
                  <Avatar name={e.name} size={36} />
                )}
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-sm font-medium">{e.name}</div>
                  <div className="truncate text-xs text-[var(--muted)]">{roleLabel(e, departmentById(e.departmentId))}</div>
                </div>
                <div className="hidden shrink-0 items-center gap-1.5 text-xs text-[var(--muted-2)] sm:flex">
                  {rec?.checkIn && (rec.status === "wfh" ? <Home size={13} /> : <Building2 size={13} />)}
                  {rec?.checkInCoords && (
                    <span className="tabular-nums">{rec.checkInCoords.lat.toFixed(3)}, {rec.checkInCoords.lng.toFixed(3)}</span>
                  )}
                </div>
                <div className="w-20 shrink-0 text-right text-xs text-[var(--muted)]">
                  {rec?.checkIn ? <>in {fmt(rec.checkIn)}{rec.checkOut && <div>out {fmt(rec.checkOut)}</div>}</> : "—"}
                </div>
                <Badge color={st.color} dot>{st.label}</Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
