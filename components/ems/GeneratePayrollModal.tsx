"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Modal, Field, Input } from "@/components/ui/modal";
import { Button, Avatar } from "@/components/ui/primitives";
import { visibleEmployees, monthLabel } from "@/lib/ems";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { User } from "@/lib/types";

function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function GeneratePayrollModal({
  open, onClose, viewer, onGenerated,
}: {
  open: boolean;
  onClose: () => void;
  viewer: User;
  onGenerated: (month: string, count: number) => void;
}) {
  const employees = useApp((s) => s.employees);
  const payslips = useApp((s) => s.payslips);
  const generatePayroll = useApp((s) => s.generatePayroll);

  const roster = useMemo(
    () => visibleEmployees(viewer, employees).filter((e) => e.status !== "resigned" && e.approvalStatus !== "rejected"),
    [viewer, employees],
  );
  const [month, setMonth] = useState(thisMonth());
  const [selected, setSelected] = useState<Set<string>>(() => new Set(roster.map((e) => e.id)));

  // ids that already have a payslip for the chosen month (can't regenerate)
  const already = useMemo(
    () => new Set(payslips.filter((p) => p.month === month).map((p) => p.userId)),
    [payslips, month],
  );
  const eligible = roster.filter((e) => !already.has(e.id));
  const toMake = eligible.filter((e) => selected.has(e.id)).length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function run() {
    const ids = eligible.filter((e) => selected.has(e.id)).map((e) => e.id);
    if (!ids.length) return;
    const count = generatePayroll(month, ids);
    onGenerated(month, count);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Generate payroll" size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={run} disabled={!toMake}>Generate {toMake || ""} payslip{toMake === 1 ? "" : "s"}</Button></>}>
      <div className="space-y-4">
        <Field label="Pay month" hint="Draft payslips are computed from each person's salary structure and that month's attendance (absences reduce pay).">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </Field>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted)]">Employees · {monthLabel(month)}</span>
            <button
              type="button"
              onClick={() => setSelected(new Set(eligible.map((e) => e.id)))}
              className="text-xs font-medium text-[var(--primary)] hover:underline"
            >
              Select all eligible
            </button>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] p-1.5">
            {roster.map((e) => {
              const done = already.has(e.id);
              const checked = selected.has(e.id) && !done;
              return (
                <button
                  key={e.id}
                  type="button"
                  disabled={done}
                  onClick={() => toggle(e.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    done ? "cursor-not-allowed opacity-50" : checked ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--surface-2)]",
                  )}
                >
                  <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", checked ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border-strong)]")}>
                    {checked && <Check size={12} />}
                  </span>
                  <Avatar name={e.name} size={22} src={e.avatarUrl} />
                  <span className="flex-1 truncate">{e.name}</span>
                  {done && <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-2)]">Done</span>}
                  {!e.salary && !e.ctcAnnual && !done && <span className="text-[10px] text-[var(--warning)]">no salary</span>}
                </button>
              );
            })}
            {roster.length === 0 && <div className="py-6 text-center text-xs text-[var(--muted-2)]">No employees to run payroll for.</div>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
