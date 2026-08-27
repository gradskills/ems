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
import { inr } from "@/lib/utils";
import { Download } from "lucide-react";

export default function PayrollPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const employees = useApp((s) => s.employees);
  const payslips = useApp((s) => s.payslips);
  const viewer = userById(actingUserId)!;

  const months = useMemo(() => Array.from(new Set(payslips.map((p) => p.month))).sort().reverse(), [payslips]);
  const [month, setMonth] = useState(months[0] ?? "");

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
        subtitle={`${rows.length} payslips · ${monthLabel(month)}`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCSV} disabled={!rows.length}><Download size={16} /> Export</Button>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="h-10 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
              {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
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
                <td className="px-4 py-3"><Badge color={p.status === "paid" ? "success" : p.status === "processed" ? "info" : "slate"} dot>{p.status}</Badge></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => downloadPayslip(p, u)} title="Download payslip PDF" className="rounded-md p-1.5 text-[var(--muted-2)] hover:bg-[var(--surface)] hover:text-[var(--primary)]">
                    <Download size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </TableShell>
      </Card>
    </div>
  );
}
