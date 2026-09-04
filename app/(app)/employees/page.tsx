"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { departmentById } from "@/lib/seed/org";
import { Card, Badge, Avatar, Button, ProgressBar } from "@/components/ui/primitives";
import { PageHeader, TableShell, SearchInput } from "@/components/ems/kit";
import { visibleEmployees, attendanceSummary, roleLabel } from "@/lib/ems";
import { CreateEmployeeModal } from "@/components/ems/CreateEmployeeModal";
import { downloadCSV } from "@/lib/exports";
import { inr } from "@/lib/utils";
import { ChevronRight, Plus, Users, UserCog, Download } from "lucide-react";

export default function EmployeesPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const employees = useApp((s) => s.employees);
  const departments = useApp((s) => s.departments);
  const attendance = useApp((s) => s.attendance);
  const tasks = useApp((s) => s.tasks);
  const viewer = userById(actingUserId)!;

  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  const scoped = useMemo(() => {
    let list = visibleEmployees(viewer, employees);
    if (dept !== "all") list = list.filter((u) => u.departmentId === dept);
    if (q) {
      const s = q.toLowerCase();
      list = list.filter(
        (u) => u.name.toLowerCase().includes(s) || roleLabel(u, departments.find((d) => d.id === u.departmentId)).toLowerCase().includes(s) || u.email.toLowerCase().includes(s)
      );
    }
    return list;
  }, [viewer, employees, departments, dept, q]);

  const canManage = viewer.accessLevel !== "employee";
  const canSeePay = viewer.accessLevel !== "employee";

  function exportCSV() {
    const header = ["Name", "Department", "Role", "Access level", "Designation", "Reports to", "Status", "Employment", "Email", "Phone", "Location", "Joined", ...(canSeePay ? ["Annual CTC"] : [])];
    const rows = scoped.map((u) => {
      const d = departments.find((x) => x.id === u.departmentId);
      const mgr = u.managerId ? userById(u.managerId) : undefined;
      return [
        u.name, d?.name ?? "", roleLabel(u, d), u.accessLevel, u.designation ?? "", mgr?.name ?? "",
        u.status ?? "active", u.employmentType?.replace("_", " ") ?? "", u.email, u.phone, u.location ?? "",
        u.joinedAt ? new Date(u.joinedAt).toISOString().slice(0, 10) : "",
        ...(canSeePay ? [u.ctcAnnual ? inr(u.ctcAnnual) : ""] : []),
      ];
    });
    downloadCSV(`employees-${new Date().toISOString().slice(0, 10)}`, [header, ...rows]);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employees"
        subtitle={`${scoped.length} people${viewer.accessLevel === "manager" ? " in your team" : " across the org"}`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCSV} disabled={!scoped.length}><Download size={16} /> Export</Button>
            {canManage && <Button onClick={() => setCreateOpen(true)}><Plus size={16} /> Add employee</Button>}
          </div>
        }
      />

      <Card className="p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <SearchInput value={q} onChange={setQ} placeholder="Search name, role, email…" />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setDept("all")}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${dept === "all" ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)] hover:bg-[var(--border)]"}`}
            >
              All
            </button>
            {departments.map((d) => (
              <button
                key={d.id}
                onClick={() => setDept(d.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${dept === d.id ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)] hover:bg-[var(--border)]"}`}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Desktop table */}
      <Card className="hidden overflow-hidden lg:block">
        <TableShell
          head={
            <>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Reports to</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Attendance (30d)</th>
              <th className="px-4 py-3">Open tasks</th>
              <th className="px-4 py-3"></th>
            </>
          }
        >
          {scoped.map((u) => {
            const d = departmentById(u.departmentId);
            const mgr = u.managerId ? userById(u.managerId) : undefined;
            const att = attendanceSummary(attendance.filter((a) => a.userId === u.id));
            const openTasks = tasks.filter((t) => t.assigneeId === u.id && t.status !== "done").length;
            return (
              <tr key={u.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                <td className="px-4 py-3">
                  <Link href={`/employees/${u.id}`} className="flex items-center gap-3">
                    <Avatar name={u.name} size={34} src={u.avatarUrl} />
                    <div>
                      <div className="font-medium hover:text-[var(--primary)]">{u.name}</div>
                      <div className="text-xs text-[var(--muted)]">{roleLabel(u, d)}</div>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Badge color={d?.color ?? "slate"}>{d?.name ?? "—"}</Badge>
                  {u.accessLevel !== "employee" && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] capitalize text-[var(--muted-2)]"><UserCog size={11} /> {u.accessLevel}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-[var(--muted)]">{mgr ? mgr.name : "—"}</td>
                <td className="px-4 py-3">
                  <Badge color={u.status === "active" ? "success" : u.status === "on_leave" ? "warning" : "slate"} dot>
                    {u.status === "on_leave" ? "On leave" : u.status ?? "active"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={att.pct} className="w-20" color={att.pct >= 90 ? "var(--success)" : att.pct >= 75 ? "var(--warning)" : "var(--danger)"} />
                    <span className="text-xs font-medium">{att.pct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-semibold">{openTasks}</td>
                <td className="px-4 py-3 text-right"><Link href={`/employees/${u.id}`}><ChevronRight size={16} className="text-[var(--muted-2)]" /></Link></td>
              </tr>
            );
          })}
        </TableShell>
      </Card>

      {/* Mobile cards */}
      <div className="space-y-2.5 lg:hidden">
        {scoped.map((u) => {
          const d = departmentById(u.departmentId);
          return (
            <Link key={u.id} href={`/employees/${u.id}`}>
              <Card className="lift flex items-center gap-3 p-3">
                <Avatar name={u.name} size={40} src={u.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{u.name}</div>
                  <div className="text-xs text-[var(--muted)]">{roleLabel(u, d)}</div>
                  <div className="mt-1"><Badge color={d?.color ?? "slate"}>{d?.name}</Badge></div>
                </div>
                <ChevronRight size={16} className="text-[var(--muted-2)]" />
              </Card>
            </Link>
          );
        })}
      </div>

      {scoped.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-[var(--muted)]">
          <Users size={28} className="text-[var(--muted-2)]" />
          <p className="text-sm">No employees match your filters.</p>
        </div>
      )}

      <CreateEmployeeModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
