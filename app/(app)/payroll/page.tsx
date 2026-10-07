"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { departmentById } from "@/lib/seed/org";
import { Card, Badge, Avatar, Stat, Button } from "@/components/ui/primitives";
import { PageHeader, TableShell } from "@/components/ems/kit";
import { visibleEmployees, payslipTotals, monthLabel } from "@/lib/ems";
import { downloadCSV, downloadPayslip } from "@/lib/exports";
import { GeneratePayrollModal } from "@/components/ems/GeneratePayrollModal";
import { EditPayslipModal } from "@/components/ems/EditPayslipModal";
import { inr } from "@/lib/utils";
import { Download, Trash2, Plus, Pencil } from "lucide-react";
import type { Payslip, PayslipStatus } from "@/lib/types";

export default function PayrollPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const employees = useApp((s) => s.employees);
  const payslips = useApp((s) => s.payslips);
  const updatePayslip = useApp((s) => s.updatePayslip);
  const deletePayslip = useApp((s) => s.deletePayslip);
  const viewer = userById(actingUserId)!;
  const isAdmin = viewer.accessLevel === "admin";

  const months = useMemo(() => Array.from(new Set(payslips.map((p) => p.month))).sort().reverse(), [payslips]);
  const [month, setMonth] = useState(months[0] ?? "");
  const [genOpen, setGenOpen] = useState(false);
  const [editing, setEditing] = useState<Payslip | undefined>(undefined);

  const visibleIds = useMemo(() => new Set(visibleEmployees(viewer, employees).map((u) => u.id)), [viewer, employees]);
  const rows = payslips.filter((p) => p.month === month && visibleIds.has(p.userId));

  const totalNet = rows.reduce((s, p) => s + payslipTotals(p).net, 0);
  const totalGross = rows.reduce((s, p) => s + payslipTotals(p).earnings, 0);
  const paid = rows.filter((p) => p.status === "paid").length;

  function exportCSV() {
    const header = ["Employee", "Department", "Month", "Gross", "Deductions", "Net pay", "Paid days", "LOP days", "Status"];
    const csvRows = rows.map((p) => {
      const u = userById(p.userId);
      const d = u ? departmentById(u.departmentId) : undefined;
      const t = payslipTotals(p);
      return [u?.name ?? p.userId, d?.name ?? "", monthLabel(p.month), t.earnings, t.deductions, t.net, p.paidDays, p.lopDays, p.status];
    });
    downloadCSV(`payroll-${month}`, [header, ...csvRows]);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payroll"
        subtitle={`${rows.length} payslips${month ? ` · ${monthLabel(month)}` : ""}`}
        action={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <select value={month} onChange={(e) => setMonth(e.target.value)} disabled={!months.length} className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm disabled:opacity-50 sm:flex-none">
              {months.length ? months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>) : <option value="">No payslips yet</option>}
            </select>
            <Button variant="outline" onClick={exportCSV} disabled={!rows.length} className="shrink-0"><Download size={16} /> Export</Button>
            {isAdmin && <Button onClick={() => setGenOpen(true)} className="shrink-0"><Plus size={16} /> Generate</Button>}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4"><Stat label="Total net payout" value={inr(totalNet, { compact: true })} /></Card>
        <Card className="p-4"><Stat label="Gross" value={inr(totalGross, { compact: true })} /></Card>
        <Card className="p-4"><Stat label="Payslips" value={rows.length} /></Card>
        <Card className="p-4"><Stat label="Paid" value={`${paid}/${rows.length}`} accent="var(--success)" /></Card>
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center text-sm text-[var(--muted)]">
            <span>{months.length ? "No payslips for this month." : "No payslips generated yet."}</span>
            {isAdmin && <Button onClick={() => setGenOpen(true)}><Plus size={16} /> Generate payroll</Button>}
          </div>
        ) : (
        <TableShell head={<><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Gross</th><th className="px-4 py-3">Deductions</th><th className="px-4 py-3">Net pay</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></>}>
          {rows.map((p) => {
            const u = userById(p.userId);
            const d = u ? departmentById(u.departmentId) : undefined;
            const t = payslipTotals(p);
            return (
              <tr key={p.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                <td className="px-4 py-3">
                  <Link href={`/employees/${p.userId}`} className="flex items-center gap-2.5">
                    <Avatar name={u?.name ?? "?"} size={30} />
                    <span className="font-medium hover:text-[var(--primary)]">{u?.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3"><Badge color={d?.color ?? "slate"}>{d?.name}</Badge></td>
                <td className="px-4 py-3">{inr(t.earnings)}</td>
                <td className="px-4 py-3 text-[var(--muted)]">−{inr(t.deductions)}</td>
                <td className="px-4 py-3 font-semibold">{inr(t.net)}</td>
                <td className="px-4 py-3">
                  {isAdmin ? (
                    <select
                      value={p.status}
                      onChange={(e) => updatePayslip(p.id, { status: e.target.value as PayslipStatus })}
                      className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs"
                    >
                      <option value="draft">draft</option>
                      <option value="processed">processed</option>
                      <option value="paid">paid</option>
                    </select>
                  ) : (
                    <Badge color={p.status === "paid" ? "success" : p.status === "processed" ? "info" : "slate"} dot>{p.status}</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => downloadPayslip(p, u)} title="Download payslip PDF" className="rounded-md p-1.5 text-[var(--muted-2)] hover:bg-[var(--surface)] hover:text-[var(--primary)]">
                      <Download size={16} />
                    </button>
                    {isAdmin && (
                      <button onClick={() => setEditing(p)} title="Edit payslip" className="rounded-md p-1.5 text-[var(--muted-2)] hover:bg-[var(--surface)] hover:text-[var(--primary)]">
                        <Pencil size={16} />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => { if (window.confirm(`Delete ${u?.name ?? "this"}'s ${monthLabel(p.month)} payslip?`)) deletePayslip(p.id); }}
                        title="Delete payslip"
                        className="rounded-md p-1.5 text-[var(--muted-2)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </TableShell>
        )}
      </Card>

      {isAdmin && (
        <GeneratePayrollModal
          open={genOpen}
          onClose={() => setGenOpen(false)}
          viewer={viewer}
          onGenerated={(m) => setMonth(m)}
        />
      )}
      {isAdmin && editing && (
        <EditPayslipModal
          key={editing.id}
          open={!!editing}
          onClose={() => setEditing(undefined)}
          payslip={editing}
        />
      )}
    </div>
  );
}
