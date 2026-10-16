"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Modal, Field, Input, Textarea } from "@/components/ui/modal";
import { Button, Badge, Avatar } from "@/components/ui/primitives";
import { visibleEmployees } from "@/lib/ems";
import {
  payItemKindLabel,
  earningKinds,
  deductionKinds,
  blankPayItem,
} from "@/lib/payroll";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Pencil, ArrowLeft, Check, Users } from "lucide-react";
import type { PayItemDef, PayItemKind, PayrollType, User } from "@/lib/types";

const COLORS: PayrollType["color"][] = ["primary", "info", "purple", "success", "warning", "danger", "slate"];
const swatch: Record<PayrollType["color"], string> = {
  primary: "bg-[var(--primary)]", info: "bg-[var(--info)]", purple: "bg-[var(--purple)]",
  success: "bg-[var(--success)]", warning: "bg-[var(--warning)]", danger: "bg-[var(--danger)]", slate: "bg-[var(--muted-2)]",
};
const selectCls = "h-9 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-sm outline-none focus:border-[var(--primary)]";

export function PayrollTypesModal({ open, onClose, viewer }: { open: boolean; onClose: () => void; viewer: User }) {
  const payrollTypes = useApp((s) => s.payrollTypes);
  const [editing, setEditing] = useState<PayrollType | "new" | null>(null);

  function close() {
    setEditing(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title={editing ? (editing === "new" ? "New payroll type" : "Edit payroll type") : "Payroll types"}
      footer={
        editing ? undefined : (
          <>
            <Button variant="ghost" onClick={close}>Done</Button>
            <Button onClick={() => setEditing("new")}><Plus size={16} /> New type</Button>
          </>
        )
      }
    >
      {editing ? (
        <TypeEditor
          key={editing === "new" ? "new" : editing.id}
          type={editing === "new" ? undefined : editing}
          viewer={viewer}
          onBack={() => setEditing(null)}
        />
      ) : (
        <div className="space-y-2">
          {payrollTypes.length === 0 && (
            <div className="py-8 text-center text-sm text-[var(--muted-2)]">No payroll types yet. Create one to get started.</div>
          )}
          {payrollTypes.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", swatch[t.color])} />
                  <span className="truncate font-medium">{t.name}</span>
                  <Badge color="slate"><Users size={11} /> {t.memberIds.length}</Badge>
                  {t.prorateByAttendance && <Badge color="info">prorated</Badge>}
                </div>
                {t.description && <p className="mt-1 text-xs text-[var(--muted)]">{t.description}</p>}
                <p className="mt-1.5 text-xs text-[var(--muted-2)]">
                  {t.earnings.length} earning{t.earnings.length === 1 ? "" : "s"} · {t.deductions.length} deduction{t.deductions.length === 1 ? "" : "s"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing(t)}><Pencil size={13} /> Edit</Button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function TypeEditor({ type, viewer, onBack }: { type?: PayrollType; viewer: User; onBack: () => void }) {
  const employees = useApp((s) => s.employees);
  const payrollTypes = useApp((s) => s.payrollTypes);
  const createPayrollType = useApp((s) => s.createPayrollType);
  const updatePayrollType = useApp((s) => s.updatePayrollType);
  const deletePayrollType = useApp((s) => s.deletePayrollType);

  const [name, setName] = useState(type?.name ?? "");
  const [description, setDescription] = useState(type?.description ?? "");
  const [color, setColor] = useState<PayrollType["color"]>(type?.color ?? "primary");
  const [prorate, setProrate] = useState(type?.prorateByAttendance ?? true);
  const [earnings, setEarnings] = useState<PayItemDef[]>(type?.earnings ?? [blankPayItem("fixed")]);
  const [deductions, setDeductions] = useState<PayItemDef[]>(type?.deductions ?? []);
  const [memberIds, setMemberIds] = useState<string[]>(type?.memberIds ?? []);

  const roster = useMemo(() => visibleEmployees(viewer, employees), [viewer, employees]);
  // which OTHER type a person currently sits in (so reassigning is visible)
  const otherTypeName = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of payrollTypes) {
      if (t.id === type?.id) continue;
      for (const m of t.memberIds) map.set(m, t.name);
    }
    return map;
  }, [payrollTypes, type?.id]);

  const valid = name.trim().length > 0 && earnings.some((e) => e.label.trim());

  function toggleMember(id: string) {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function save() {
    if (!valid) return;
    const cleanEarnings = earnings.filter((e) => e.label.trim());
    const cleanDeductions = deductions.filter((d) => d.label.trim());
    const payload = { name: name.trim(), description: description.trim() || undefined, color, earnings: cleanEarnings, deductions: cleanDeductions, prorateByAttendance: prorate, memberIds };
    if (type) updatePayrollType(type.id, payload);
    else createPayrollType(payload);
    onBack();
  }

  function remove() {
    if (!type) return;
    if (window.confirm(`Delete payroll type "${type.name}"? Employees on it become unassigned.`)) {
      deletePayrollType(type.id);
      onBack();
    }
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft size={14} /> All types
      </button>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Full-time salaried" /></Field>
        <Field label="Colour">
          <div className="flex h-10 items-center gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn("h-6 w-6 rounded-full ring-offset-2 ring-offset-[var(--surface)] transition", swatch[c], color === c ? "ring-2 ring-[var(--foreground)]" : "hover:scale-110")}
                aria-label={c}
              />
            ))}
          </div>
        </Field>
      </div>
      <Field label="Description"><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this type is for…" /></Field>

      <button
        type="button"
        onClick={() => setProrate((p) => !p)}
        className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2.5 text-left text-sm hover:bg-[var(--surface-2)]"
      >
        <span>
          <span className="font-medium">Prorate by attendance</span>
          <span className="block text-xs text-[var(--muted-2)]">Loss-of-pay days reduce earnings for this type</span>
        </span>
        <span className={cn("flex h-5 w-9 items-center rounded-full px-0.5 transition-colors", prorate ? "bg-[var(--primary)]" : "bg-[var(--border-strong)]")}>
          <span className={cn("h-4 w-4 rounded-full bg-white transition-transform", prorate && "translate-x-4")} />
        </span>
      </button>

      <ItemSection title="Earnings" items={earnings} setItems={setEarnings} kinds={earningKinds} />
      <ItemSection title="Deductions" items={deductions} setItems={setDeductions} kinds={deductionKinds} />

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Assigned employees · {memberIds.length}</span>
          <button type="button" onClick={() => setMemberIds(roster.map((e) => e.id))} className="text-xs font-medium text-[var(--primary)] hover:underline">Select all</button>
        </div>
        <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] p-1.5">
          {roster.map((e) => {
            const checked = memberIds.includes(e.id);
            const other = otherTypeName.get(e.id);
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => toggleMember(e.id)}
                className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors", checked ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--surface-2)]")}
              >
                <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", checked ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border-strong)]")}>
                  {checked && <Check size={12} />}
                </span>
                <Avatar name={e.name} size={22} src={e.avatarUrl} />
                <span className="flex-1 truncate">{e.name}</span>
                {!checked && other && <span className="text-[10px] text-[var(--muted-2)]">in {other}</span>}
              </button>
            );
          })}
          {roster.length === 0 && <div className="py-6 text-center text-xs text-[var(--muted-2)]">No employees to assign.</div>}
        </div>
        <p className="mt-1 text-xs text-[var(--muted-2)]">A person belongs to one type — assigning them here removes them from any other.</p>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-4">
        {type ? (
          <Button variant="ghost" onClick={remove} className="text-[var(--danger)] hover:bg-[var(--danger-soft)]"><Trash2 size={15} /> Delete</Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onBack}>Cancel</Button>
          <Button onClick={save} disabled={!valid}>{type ? "Save type" : "Create type"}</Button>
        </div>
      </div>
    </div>
  );
}

function ItemSection({
  title, items, setItems, kinds,
}: {
  title: string;
  items: PayItemDef[];
  setItems: (v: PayItemDef[]) => void;
  kinds: PayItemKind[];
}) {
  function patch(i: number, p: Partial<PayItemDef>) {
    setItems(items.map((x, j) => (j === i ? { ...x, ...p } : x)));
  }
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div key={it.id} className="flex items-center gap-2">
            <input
              value={it.label}
              onChange={(e) => patch(i, { label: e.target.value })}
              placeholder="Label"
              className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)]"
            />
            <select value={it.kind} onChange={(e) => patch(i, { kind: e.target.value as PayItemKind })} className={cn(selectCls, "w-32 shrink-0")}>
              {kinds.map((k) => <option key={k} value={k}>{payItemKindLabel[k]}</option>)}
            </select>
            <div className="relative w-24 shrink-0">
              <input
                type="number"
                min={0}
                value={String(it.value)}
                onChange={(e) => patch(i, { value: Number(e.target.value) || 0 })}
                className="h-9 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] pl-3 pr-6 text-sm outline-none focus:border-[var(--primary)]"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-2)]">{it.kind === "fixed" ? "₹" : "%"}</span>
            </div>
            <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="shrink-0 rounded-md p-2 text-[var(--muted-2)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]" aria-label="Remove"><Trash2 size={15} /></button>
          </div>
        ))}
        {items.length === 0 && <p className="px-1 text-xs text-[var(--muted-2)]">None.</p>}
        <Button variant="ghost" size="sm" onClick={() => setItems([...items, blankPayItem("fixed")])}><Plus size={13} /> Add {title.toLowerCase().replace(/s$/, "")}</Button>
      </div>
    </div>
  );
}
