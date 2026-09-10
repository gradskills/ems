"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { departmentById } from "@/lib/seed/org";
import { Card, Badge, Avatar, ProgressBar } from "@/components/ui/primitives";
import { PageHeader, TableShell } from "@/components/ems/kit";
import { attendanceLeaderboard } from "@/lib/leaderboard";
import { roleLabel } from "@/lib/ems";
import { Trophy, Star, Flame } from "lucide-react";

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={13} className={i < n ? "fill-[var(--warning)] text-[var(--warning)]" : "text-[var(--border-strong)]"} />
      ))}
    </span>
  );
}

// gold / silver / bronze accents (hex chosen to read in both light & dark)
const medal = [
  { ring: "ring-[#e0b34d]", badge: "bg-[#e0b34d]", order: "sm:order-2", raise: "sm:-translate-y-4", avatar: 68 },
  { ring: "ring-[#a9b0bd]", badge: "bg-[#a9b0bd]", order: "sm:order-1", raise: "", avatar: 56 },
  { ring: "ring-[#cd7f32]", badge: "bg-[#cd7f32]", order: "sm:order-3", raise: "", avatar: 56 },
];

export default function LeaderboardPage() {
  const employees = useApp((s) => s.employees);
  const attendance = useApp((s) => s.attendance);
  const actingUserId = useApp((s) => s.actingUserId);

  const rows = useMemo(() => attendanceLeaderboard(employees, attendance), [employees, attendance]);
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Attendance Leaderboard"
        subtitle="Ranked by attendance across all recorded days — keep the streak alive!"
      />

      {rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-[var(--muted)]">No attendance data yet.</Card>
      ) : (
        <>
          {/* Podium — top 3 (medal badges; #1 centered & raised on desktop) */}
          <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
            {podium.map((r) => {
              const d = departmentById(r.user.departmentId);
              const isMe = r.user.id === actingUserId;
              const m = medal[r.rank - 1];
              return (
                <Link key={r.user.id} href={`/employees/${r.user.id}`} className={m.order}>
                  <Card className={`lift relative flex flex-col items-center gap-1 p-5 pt-7 text-center ring-2 ${m.ring} ${m.raise} ${isMe ? "border-[var(--primary)]" : ""}`}>
                    <span className={`absolute -top-3.5 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full text-xs font-bold text-white shadow-[var(--shadow-sm)] ${m.badge}`}>{r.rank}</span>
                    {r.rank === 1 && <Trophy size={18} className="absolute right-4 top-4 text-[#e0b34d]" />}
                    <Avatar name={r.user.name} size={m.avatar} src={r.user.avatarUrl} />
                    <div className="mt-1 font-semibold">{r.user.name}{isMe && " (you)"}</div>
                    <div className="text-xs text-[var(--muted)]">{roleLabel(r.user, d)}</div>
                    <div className="mt-1 text-2xl font-bold tabular-nums">{r.pct}%</div>
                    <Stars n={r.rating} />
                    {r.streak > 1 && <div className="mt-1 flex items-center gap-1 text-xs text-[var(--warning)]"><Flame size={13} /> {r.streak}-day streak</div>}
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* The rest */}
          {rest.length > 0 && (
            <Card className="overflow-hidden">
              <TableShell
                head={
                  <>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Attendance</th>
                    <th className="px-4 py-3">Present</th>
                    <th className="px-4 py-3">Streak</th>
                    <th className="px-4 py-3">Rating</th>
                  </>
                }
              >
                {rest.map((r) => {
                  const d = departmentById(r.user.departmentId);
                  const isMe = r.user.id === actingUserId;
                  return (
                    <tr key={r.user.id} className={`border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] ${isMe ? "bg-[var(--primary-soft)]" : ""}`}>
                      <td className="px-4 py-3 font-semibold text-[var(--muted-2)]">{r.rank}</td>
                      <td className="px-4 py-3">
                        <Link href={`/employees/${r.user.id}`} className="flex items-center gap-2.5">
                          <Avatar name={r.user.name} size={32} src={r.user.avatarUrl} />
                          <div>
                            <div className="font-medium hover:text-[var(--primary)]">{r.user.name}{isMe && " (you)"}</div>
                            <div className="text-xs text-[var(--muted)]"><Badge color={d?.color ?? "slate"}>{d?.name ?? "—"}</Badge></div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={r.pct} className="w-24" color={r.pct >= 90 ? "var(--success)" : r.pct >= 75 ? "var(--warning)" : "var(--danger)"} />
                          <span className="text-xs font-medium">{r.pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{r.present}/{r.working}</td>
                      <td className="px-4 py-3 text-sm">{r.streak > 0 ? <span className="flex items-center gap-1 text-[var(--warning)]"><Flame size={13} /> {r.streak}</span> : "—"}</td>
                      <td className="px-4 py-3"><Stars n={r.rating} /></td>
                    </tr>
                  );
                })}
              </TableShell>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
