"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { userById, userName } from "@/lib/seed/users";
import { departmentById } from "@/lib/seed/org";
import { Card, Badge, Button, Stat, StageBadge } from "@/components/ui/primitives";
import { ApplyLeaveModal } from "@/components/ems/ApplyLeaveModal";
import { ClockCard } from "@/components/ems/ClockCard";
import { CameraCapture } from "@/components/ems/CameraCapture";
import { AttendanceCalendar } from "@/components/ems/AttendanceCalendar";
import { BirthdayBanner } from "@/components/ems/BirthdayBanner";
import { attendanceSummary, taskStatusColor, taskStatusLabel, priorityColor, leaveStatusColor, leaveTypeLabel, roleLabel } from "@/lib/ems";
import { formatDate, inr, localDateISO } from "@/lib/utils";
import { CalendarPlus, CheckSquare, Users, CalendarClock, Target, Settings, Building2, ShieldCheck, ChevronRight, AlertTriangle, LifeBuoy } from "lucide-react";

export default function MyDashboardPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const attendance = useApp((s) => s.attendance);
  const tasks = useApp((s) => s.tasks);
  const leaves = useApp((s) => s.leaves);
  const announcements = useApp((s) => s.announcements);
  const clockIn = useApp((s) => s.clockIn);
  const requestAttendanceFix = useApp((s) => s.requestAttendanceFix);
  const me = userById(actingUserId)!;
  const dept = departmentById(me.departmentId);
  const isAdmin = me.accessLevel === "admin"; // admins don't clock in or apply leave
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [fixRequested, setFixRequested] = useState<string | null>(null);
  const [clockingIn, setClockingIn] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [clockErr, setClockErr] = useState("");

  const today = localDateISO();

  const handleClockIn = async () => {
    setCameraOpen(true);
  };

  const doClockIn = async (r: { photo: string; coords?: { lat: number; lng: number }; timezone?: string; wfh: boolean }) => {
    setClockingIn(true);
    setClockErr("");
    const ok = await clockIn(r);
    setClockingIn(false);
    if (!ok) setClockErr("Couldn't get your location. Please enable location access and try again.");
  };
  const fmtT = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "—");
  const myAtt = attendanceSummary(attendance.filter((a) => a.userId === me.id));
  const myTasks = tasks.filter((t) => t.assigneeId === me.id && t.status !== "done").sort((a, b) => (a.dueAt ?? "") < (b.dueAt ?? "") ? -1 : 1);
  const myLeaves = leaves.filter((l) => l.userId === me.id).slice(0, 4);
  const myAnnouncements = announcements.filter((a) => a.audience === "all" || a.audience === me.departmentId).slice(0, 3);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Admins get a command-center dashboard (no personal clock-in/leave/tasks).
  if (isAdmin) return <AdminMyDashboard greet={greet} name={me.name} />;

  // A day gone by where they clocked in but never clocked out (forgot to log
  // out), or the backend flagged the punch for review — only an admin can fix it.
  const unfinished = attendance
    .filter((a) => a.userId === me.id && a.date < today && ((a.checkIn && !a.checkOut) || a.status === "needs_review" || a.status === "pending_punchout"))
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greet}, {me.name.split(" ")[0]}</h1>
          <p className="hidden text-sm text-[var(--muted)] lg:block">{roleLabel(me, dept)}</p>
        </div>
        <Button variant="secondary" className="hidden lg:inline-flex" onClick={() => setLeaveOpen(true)}><CalendarPlus size={16} /> Apply leave</Button>
      </div>

      <BirthdayBanner />

      {unfinished && (
        <Card className="flex flex-col gap-3 border-[var(--warning)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning)]">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold">Attendance needs a fix</div>
              <div className="text-xs text-[var(--muted)]">
                It looks like you didn&apos;t clock out on {new Date(unfinished.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}. Only an admin can correct your clock-out time.
              </div>
            </div>
          </div>
          {fixRequested === unfinished.date || unfinished.fixRequested ? (
            <span className="shrink-0 rounded-lg bg-[var(--success-soft)] px-3 py-2 text-xs font-medium text-[var(--success)]">Request sent to admin ✓</span>
          ) : (
            <Button
              variant="outline"
              className="shrink-0"
              onClick={() => { requestAttendanceFix(unfinished.date); setFixRequested(unfinished.date); }}
            >
              <LifeBuoy size={16} /> Contact admin
            </Button>
          )}
        </Card>
      )}

      {/* ── Clock in/out + breaks + attendance log + at-a-glance stats ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ClockCard me={me} onClockIn={handleClockIn} clockingIn={clockingIn} clockErr={clockErr} />
        </div>

        <div className="grid grid-cols-2 gap-3 self-start">
          <Card className="p-4"><Stat label="Open tasks" value={myTasks.length} /></Card>
          <Card className="p-4"><Stat label="Attendance" value={`${myAtt.pct}%`} sub="30 days" accent="var(--success)" /></Card>
          <Card className="p-4"><Stat label="Casual left" value={me.leaveBalance?.casual ?? 0} /></Card>
          <Card className="p-4"><Stat label="Earned left" value={me.leaveBalance?.earned ?? 0} /></Card>
        </div>
      </div>

      {/* ── My tasks + leave requests + announcements ── */}
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
          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">My leave requests</h3>
              <Link href="/my/leaves" className="text-xs text-[var(--primary)]">View all →</Link>
            </div>
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

      {/* ── Recent days + attendance calendar ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><CalendarClock size={16} className="text-[var(--muted)]" /> Recent days</div>
          <div className="space-y-1.5">
            {attendance.filter((a) => a.userId === me.id).slice(0, 7).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                <span className="font-medium">{new Date(a.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
                <div className="flex items-center gap-2">
                  {a.checkInPhoto && <img src={a.checkInPhoto} alt="" className="h-5 w-5 rounded-full object-cover" style={{ transform: "scaleX(-1)" }} />}
                  <span className="text-xs text-[var(--muted)]">{fmtT(a.checkIn)} → {fmtT(a.checkOut)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><CalendarClock size={16} className="text-[var(--muted)]" /> My attendance</div>
          <div className="flex flex-1 items-center justify-center"><AttendanceCalendar records={attendance.filter((a) => a.userId === me.id)} /></div>
        </Card>
      </div>

      <Button variant="primary" className="w-full lg:hidden" onClick={() => setLeaveOpen(true)}><CalendarPlus size={16} /> Apply leave</Button>

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

  const today = localDateISO();
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
          <p className="hidden text-sm text-[var(--muted)] lg:block">Here's what's happening across the company today.</p>
        </div>
        <Link href="/attendance"><Button variant="outline"><Users size={16} /> Who's in</Button></Link>
      </div>

      <BirthdayBanner />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href="/attendance"><Card className="lift p-4"><Stat label="Clocked in today" value={`${todayRecs.length}/${staff.length}`} sub={`${workingNow} working now`} accent="var(--success)" /></Card></Link>
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
