"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Modal, Field, Input } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import { monthLabel } from "@/lib/ems";
import { inr } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import type { Payslip, PayComponent, PayslipStatus } from "@/lib/types";

const selectCls = "h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]";

export function EditPayslipModal({ open, onClose, payslip }: { open: boolean; onClose: () => void; payslip?: Payslip }) {
  const updatePayslip = useApp((s) => s.updatePayslip);

  const [earnings, setEarnings] = useState<PayComponent[]>(payslip?.earnings ?? []);
  const [deductions, setDeductions] = useState<PayComponent[]>(payslip?.deductions ?? []);
  const [paidDays, setPaidDays] = useState(String(payslip?.paidDays ?? 0));
  const [lopDays, setLopDays] = useState(String(payslip?.lopDays ?? 0));
  const [status, setStatus] = useState<PayslipStatus>(payslip?.status ?? "draft");

  if (!payslip) return null;
  const emp = userById(payslip.userId);

  const gross = earnings.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalDed = deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const net = gross - totalDed;

  function row(list: PayComponent[], setList: (v: PayComponent[]) => void, kind: string) {
    return (
      <div className="space-y-1.5">
        {list.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1"><Input value={c.label} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Label" /></div>
            <div className="w-32"><Input type="number" value={String(c.amount)} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) || 0 } : x)))} /></div>
            <button onClick={() => setList(list.filter((_, j) => j !== i))} className="rounded-md p-2 text-[var(--muted-2)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]" aria-label="Remove"><Trash2 size={15} /></button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => setList([...list, { label: "", amount: 0 }])}><Plus size={13} /> Add {kind}</Button>
      </div>
    );
  }

  function save() {
    updatePayslip(payslip!.id, {
      earnings: earnings.filter((e) => e.label.trim()),
      deductions: deductions.filter((d) => d.label.trim()),
      paidDays: Number(paidDays) || 0,
      lopDays: Number(lopDays) || 0,
      status,
      gross,
      net,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Edit payslip · ${emp?.name ?? payslip.userId}`} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save}>Save payslip</Button></>}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm">
          <span className="font-medium">{monthLabel(payslip.month)}</span>
          <span className="text-[var(--muted)]">Net <strong className="text-[var(--foreground)]">{inr(net)}</strong> · Gross {inr(gross)} · Deductions −{inr(totalDed)}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Paid days"><Input type="number" value={paidDays} onChange={(e) => setPaidDays(e.target.value)} /></Field>
          <Field label="LOP days"><Input type="number" value={lopDays} onChange={(e) => setLopDays(e.target.value)} /></Field>
          <Field label="Status">
            <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as PayslipStatus)}>
              <option value="draft">Draft</option><option value="processed">Processed</option><option value="paid">Paid</option>
            </select>
          </Field>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold">Earnings</h4>
          {row(earnings, setEarnings, "earning")}
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold">Deductions</h4>
          {row(deductions, setDeductions, "deduction")}
        </div>
      </div>
    </Modal>
  );
}
