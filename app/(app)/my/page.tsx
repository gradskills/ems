"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { userById, userName } from "@/lib/seed/users";
import { departmentById } from "@/lib/seed/org";
import { Card, Badge, Button, Stat, StageBadge, Avatar } from "@/components/ui/primitives";
import { ApplyLeaveModal } from "@/components/ems/ApplyLeaveModal";
import { BreakWidget } from "@/components/ems/BreakWidget";
import { CameraCapture } from "@/components/ems/CameraCapture";
import { attendanceSummary, taskStatusColor, taskStatusLabel, priorityColor, leaveStatusColor, leaveTypeLabel, roleLabel } from "@/lib/ems";
import { formatDate, inr } from "@/lib/utils";
import { LogIn, LogOut, CalendarPlus, CheckSquare, Clock, MapPin, Camera, Users, CalendarClock, Target, Settings, Building2, ShieldCheck, ChevronRight } from "lucide-react";

export default function MyDashboardPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const attendance = useApp((s) => s.attendance);
  const tasks = useApp((s) => s.tasks);
  const leaves = useApp((s) => s.leaves);
  const announcements = useApp((s) => s.announcements);
  const clockIn = useApp((s) => s.clockIn);
  const clockOut = useApp((s) => s.clockOut);
  const me = userById(actingUserId)!;
  const dept = departmentById(me.departmentId);
  const isAdmin = me.accessLevel === "admin"; // admins don't clock in or apply leave
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [sessionElapsed, setSessionElapsed] = useState("");
  const [clockingIn, setClockingIn] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const todayRec = attendance.find((a) => a.userId === me.id && a.date === today);

  useEffect(() => {
    if (!todayRec?.checkIn || todayRec.checkOut) {
      setSessionElapsed("");
      return;
    }
    const tick = () => {
      const diff = Date.now() - Date.parse(todayRec.checkIn!);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setSessionElapsed(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [todayRec?.checkIn, todayRec?.checkOut]);

  const handleClockIn = async () => {
    setCameraOpen(true);
  };

  const doClockIn = async (r: { photo: string; coords?: { lat: number; lng: number }; timezone?: string; wfh: boolean }) => {
    setClockingIn(true);
    await clockIn(r);
    setClockingIn(false);
  };
  const myAtt = attendanceSummary(attendance.filter((a) => a.userId === me.id));
  const myTasks = tasks.filter((t) => t.assigneeId === me.id && t.status !== "done").sort((a, b) => (a.dueAt ?? "") < (b.dueAt ?? "") ? -1 : 1);
  const myLeaves = leaves.filter((l) => l.userId === me.id).slice(0, 4);
  const myAnnouncements = announcements.filter((a) => a.audience === "all" || a.audience === me.departmentId).slice(0, 3);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Admins get a command-center dashboard (no personal clock-in/leave/tasks).
  if (isAdmin) return <AdminMyDashboard greet={greet} name={me.name} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greet}, {me.name.split(" ")[0]}</h1>
          <p className="text-sm text-[var(--muted)]">{roleLabel(me, dept)}</p>
        </div>
        {!isAdmin && (
          <div className="flex items-center gap-2">
            {!todayRec?.checkIn ? (
              <Button onClick={handleClockIn} disabled={clockingIn}>
                <Camera size={16} /> {clockingIn ? "Clocking in…" : "Clock in with selfie"}
              </Button>
            ) : !todayRec?.checkOut ? (
              <Button variant="outline" onClick={clockOut}><LogOut size={16} /> Clock out</Button>
            ) : (
              <Badge color="success" dot>Clocked out for today</Badge>
            )}
            <Button variant="secondary" onClick={() => setLeaveOpen(true)}><CalendarPlus size={16} /> Apply leave</Button>
          </div>
        )}
      </div>

      {!isAdmin && todayRec?.checkIn && (
        <Card className="p-3 text-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {todayRec.checkInPhoto && (
                <img src={todayRec.checkInPhoto} alt="Clock-in selfie" className="h-8 w-8 rounded-full object-cover ring-2 ring-[var(--success)]" style={{ transform: "scaleX(-1)" }} />
              )}
              <Clock size={16} className="text-[var(--muted)]" />
              Clocked in at {new Date(todayRec.checkIn).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
              {todayRec.checkOut && ` · out at ${new Date(todayRec.checkOut).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`}
              {!todayRec.checkOut && sessionElapsed && (
                <span className="ml-1 rounded-md bg-[var(--primary-soft)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--primary)]">
                  {sessionElapsed}
                </span>
              )}
            </div>
            {todayRec.checkInCoords && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <MapPin size={13} />
                {todayRec.checkInCoords.lat.toFixed(5)}, {todayRec.checkInCoords.lng.toFixed(5)}
                {todayRec.checkInTimezone && <span className="ml-1 text-[var(--muted-2)]">({todayRec.checkInTimezone})</span>}
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4"><Stat label="Open tasks" value={myTasks.length} /></Card>
        <Card className="p-4"><Stat label="Attendance" value={`${myAtt.pct}%`} sub="30 days" accent="var(--success)" /></Card>
        <Card className="p-4"><Stat label="Casual left" value={me.leaveBalance?.casual ?? 0} /></Card>
        <Card className="p-4"><Stat label="Earned left" value={me.leaveBalance?.earned ?? 0} /></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">My tasks</h3>
            <Link href="/tasks" className="text-xs text-[var(--primary)]">View board →</Link>
          </div>
          {myTasks.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--muted)]">No open tasks 🎉</div>
          ) : (
            <div className="space-y-2">
              {myTasks.slice(0, 6).map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-2.5">
                  <CheckSquare size={16} className="text-[var(--muted-2)]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{t.title}</div>
                    <div className="text-[11px] text-[var(--muted)]">{t.dueAt ? `Due ${formatDate(t.dueAt)}` : "No due date"}</div>
                  </div>
                  <Badge color={priorityColor[t.priority]}>{t.priority}</Badge>
                  <Badge color={taskStatusColor[t.status]} dot>{taskStatusLabel[t.status]}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          {!isAdmin && <BreakWidget clockedIn={!!todayRec?.checkIn && !todayRec?.checkOut} />}
          <Card className="p-5">
            <h3 className="mb-2 text-sm font-semibold">My leave requests</h3>
            {myLeaves.length === 0 ? <div className="py-4 text-center text-xs text-[var(--muted)]">None yet</div> : (
              <div className="space-y-2">
                {myLeaves.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-sm">
                    <span>{leaveTypeLabel[l.type]} · {l.days}d</span>
                    <Badge color={leaveStatusColor[l.status]} dot>{l.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5">
            <h3 className="mb-2 text-sm font-semibold">Announcements</h3>
            <div className="space-y-2.5">
              {myAnnouncements.map((a) => (
                <div key={a.id}>
                  <div className="text-sm font-medium">{a.title}</div>
                  <div className="line-clamp-2 text-xs text-[var(--muted)]">{a.body}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <ApplyLeaveModal open={leaveOpen} onClose={() => setLeaveOpen(false)} />

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(r) => { setCameraOpen(false); doClockIn(r); }}
      />
    </div>
  );
}

// ── Admin command center — shown at /my for admins instead of the personal dashboard ──
function AdminMyDashboard({ greet, name }: { greet: string; name: string }) {
  const employees = useApp((s) => s.employees);
  const attendance = useApp((s) => s.attendance);
  const meetings = useApp((s) => s.meetings);
  const tasks = useApp((s) => s.tasks);
  const leads = useApp((s) => s.leads);

  const today = new Date().toISOString().slice(0, 10);
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

  const staff = employees.filter((e) => e.accessLevel !== "admin" && e.status !== "inactive");
  const todayRecs = attendance.filter((a) => a.date === today && a.checkIn);
  const workingNow = todayRecs.filter((a) => !a.checkOut).length;

  const todaysMeetings = meetings
    .filter((m) => m.scheduledAt.slice(0, 10) === today && m.status !== "cancelled")
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  const openTasks = tasks.filter((t) => t.status !== "done");
  const todaysTasks = openTasks
    .filter((t) => t.dueAt && t.dueAt.slice(0, 10) <= today)
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));

  const dealsToClose = leads
    .filter((l) => !l.pooled && (l.stage === "negotiation" || l.stage === "proposal_sent"))
    .sort((a, b) => b.estimatedValue - a.estimatedValue);
  const pipelineValue = dealsToClose.reduce((s, l) => s + l.estimatedValue, 0);

  const settingsLinks = [
    { href: "/employees", label: "Employees", icon: Users },
    { href: "/approvals", label: "Approvals", icon: CheckSquare },
    { href: "/departments", label: "Departments & Roles", icon: Building2 },
    { href: "/reports", label: "Reports", icon: ShieldCheck },
    { href: "/settings", label: "Company Settings", icon: Settings },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greet}, {name.split(" ")[0]}</h1>
          <p className="text-sm text-[var(--muted)]">Here's what's happening across the company today.</p>
        </div>
        <Link href="/clock"><Button variant="outline"><Users size={16} /> Who's in</Button></Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href="/clock"><Card className="lift p-4"><Stat label="Clocked in today" value={`${todayRecs.length}/${staff.length}`} sub={`${workingNow} working now`} accent="var(--success)" /></Card></Link>
        <Card className="p-4"><Stat label="Meetings today" value={todaysMeetings.length} /></Card>
        <Link href="/tasks"><Card className="lift p-4"><Stat label="Open tasks" value={openTasks.length} sub={`${todaysTasks.length} due today`} /></Card></Link>
        <Link href="/pipeline"><Card className="lift p-4"><Stat label="Deals to close" value={dealsToClose.length} sub={inr(pipelineValue, { compact: true })} accent="var(--primary)" /></Card></Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Deals to close */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><Target size={16} className="text-[var(--muted)]" /> Deals to close</h3>
              <Link href="/pipeline" className="text-xs text-[var(--primary)]">Pipeline →</Link>
            </div>
            {dealsToClose.length === 0 ? (
              <div className="py-6 text-center text-sm text-[var(--muted)]">No deals in negotiation right now.</div>
            ) : (
              <div className="space-y-2">
                {dealsToClose.slice(0, 6).map((l) => (
                  <Link key={l.id} href={`/leads/${l.id}`} className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-2.5 hover:bg-[var(--surface-2)]">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{l.company}</div>
                      <div className="truncate text-xs text-[var(--muted)]">{l.contactName} · {userName(l.ownerId).split(" ")[0]}</div>
                    </div>
                    <StageBadge stage={l.stage} />
                    <span className="w-20 text-right text-sm font-semibold">{inr(l.estimatedValue, { compact: true })}</span>
                    <ChevronRight size={16} className="text-[var(--muted-2)]" />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Today's tasks */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><CheckSquare size={16} className="text-[var(--muted)]" /> Tasks due today</h3>
              <Link href="/tasks" className="text-xs text-[var(--primary)]">All tasks →</Link>
            </div>
            {todaysTasks.length === 0 ? (
              <div className="py-6 text-center text-sm text-[var(--muted)]">Nothing due today 🎉</div>
            ) : (
              <div className="space-y-2">
                {todaysTasks.slice(0, 6).map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-2.5">
                    <CheckSquare size={16} className="text-[var(--muted-2)]" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{t.title}</div>
                      <div className="text-[11px] text-[var(--muted)]">{userName(t.assigneeId).split(" ")[0]} · {t.dueAt ? `Due ${formatDate(t.dueAt)}` : "No due date"}</div>
                    </div>
                    <Badge color={priorityColor[t.priority]}>{t.priority}</Badge>
                    <Badge color={taskStatusColor[t.status]} dot>{taskStatusLabel[t.status]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {/* Today's meetings */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><CalendarClock size={16} className="text-[var(--muted)]" /> Meetings today</h3>
              <Link href="/meetings" className="text-xs text-[var(--primary)]">All →</Link>
            </div>
            {todaysMeetings.length === 0 ? (
              <div className="py-6 text-center text-xs text-[var(--muted)]">No meetings scheduled today.</div>
            ) : (
              <div className="space-y-2">
                {todaysMeetings.map((m) => (
                  <Link key={m.id} href={`/meetings/${m.id}`} className="block rounded-lg border border-[var(--border)] p-2.5 hover:bg-[var(--surface-2)]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{m.title}</span>
                      <span className="shrink-0 text-xs font-semibold text-[var(--primary)]">{fmtTime(m.scheduledAt)}</span>
                    </div>
                    <div className="truncate text-[11px] text-[var(--muted)]">{userName(m.organizerId).split(" ")[0]}{m.attendeeIds.length ? ` +${m.attendeeIds.length}` : ""}</div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Admin settings */}
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Settings size={16} className="text-[var(--muted)]" /> Admin</h3>
            <div className="space-y-1">
              {settingsLinks.map((s) => {
                const Icon = s.icon;
                return (
                  <Link key={s.href} href={s.href} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]">
                    <Icon size={16} className="text-[var(--muted-2)]" />
                    <span className="flex-1">{s.label}</span>
                    <ChevronRight size={15} className="text-[var(--muted-2)]" />
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
