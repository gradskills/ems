// ─────────────────────────────────────────────────────────────
// Client-side export helpers — CSV downloads + branded PDF payslips.
// Everything runs in the browser (Blob + anchor), no server round-trip.
// ─────────────────────────────────────────────────────────────
import type { Payslip, User } from "@/lib/types";
import { payslipTotals, monthLabel } from "@/lib/ems";
import { wrapDocument, printDocument } from "@/lib/documents";

/** escape one CSV cell (quote when it contains comma / quote / newline) */
function cell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** rows[0] is treated as the header row */
export function toCSV(rows: (string | number | undefined | null)[][]): string {
  return rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

/** trigger a browser download of arbitrary text as a file */
export function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** convenience: build CSV from rows and download it */
export function downloadCSV(filename: string, rows: (string | number | undefined | null)[][]) {
  // BOM so Excel opens UTF-8 (₹, accented names) correctly
  downloadText(filename.endsWith(".csv") ? filename : `${filename}.csv`, "﻿" + toCSV(rows), "text/csv");
}

const rupee = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/** open a branded, printable payslip (Save-as-PDF) */
export function downloadPayslip(p: Payslip, emp?: User) {
  const t = payslipTotals(p);
  const earnRows = p.earnings.map((e) => `<tr><td>${e.label}</td><td class="right">${rupee(e.amount)}</td></tr>`).join("");
  const dedRows = p.deductions.map((e) => `<tr><td>${e.label}</td><td class="right">− ${rupee(e.amount)}</td></tr>`).join("");
  const inner = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
      <div><h1>Payslip</h1><div class="muted">${monthLabel(p.month)} · ${p.status}</div></div>
      <div class="right"><div class="pill">Net ${rupee(t.net)}</div></div>
    </div>
    <div class="grid2" style="margin:16px 0">
      <div class="box"><div class="muted">Employee</div><strong>${emp?.name ?? p.userId}</strong><div class="muted">${emp?.designation ?? ""}${emp?.email ? `<br/>${emp.email}` : ""}</div></div>
      <div class="box"><div class="muted">Pay period</div><strong>${monthLabel(p.month)}</strong><div class="muted" style="margin-top:6px">Paid days: ${p.paidDays}${p.lopDays ? ` · LOP: ${p.lopDays}` : ""}${emp?.bankLast4 ? `<br/>A/C •••• ${emp.bankLast4}` : ""}</div></div>
    </div>
    <div class="grid2">
      <div>
        <table><thead><tr><th>Earnings</th><th class="right">Amount</th></tr></thead>
        <tbody>${earnRows}<tr class="totrow"><td>Gross earnings</td><td class="right">${rupee(t.earnings)}</td></tr></tbody></table>
      </div>
      <div>
        <table><thead><tr><th>Deductions</th><th class="right">Amount</th></tr></thead>
        <tbody>${dedRows || `<tr><td class="muted">None</td><td class="right">${rupee(0)}</td></tr>`}<tr class="totrow"><td>Total deductions</td><td class="right">− ${rupee(t.deductions)}</td></tr></tbody></table>
      </div>
    </div>
    <table style="margin-top:8px"><tbody><tr class="totrow"><td class="right">Net pay</td><td class="right" style="width:180px">${rupee(t.net)}</td></tr></tbody></table>
    <p class="note">This is a computer-generated payslip and does not require a signature.</p>
  `;
  printDocument(wrapDocument(`Payslip ${monthLabel(p.month)}`, inner), `payslip-${(emp?.name ?? p.userId).replace(/\s+/g, "-")}-${p.month}`);
}
