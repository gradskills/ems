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

const medalColor = ["text-[#d4af37]", "text-[#9ca3af]", "text-[#cd7f32]"]; // gold, silver, bronze

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
          {/* Podium — top 3 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {podium.map((r) => {
              const d = departmentById(r.user.departmentId);
              const isMe = r.user.id === actingUserId;
              return (
                <Link key={r.user.id} href={`/employees/${r.user.id}`}>
                  <Card className={`lift relative flex flex-col items-center gap-1 p-5 text-center ${isMe ? "border-[var(--primary)]" : ""}`}>
                    <Trophy size={20} className={`absolute left-4 top-4 ${medalColor[r.rank - 1]}`} />
                    <span className="absolute right-4 top-4 text-lg font-bold text-[var(--muted-2)]">#{r.rank}</span>
                    <Avatar name={r.user.name} size={56} src={r.user.avatarUrl} />
                    <div className="mt-1 font-semibold">{r.user.name}{isMe && " (you)"}</div>
                    <div className="text-xs text-[var(--muted)]">{roleLabel(r.user, d)}</div>
                    <div className="mt-1 text-2xl font-bold">{r.pct}%</div>
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
