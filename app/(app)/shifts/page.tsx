"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { departmentById } from "@/lib/seed/org";
import { Card, Badge, Button, Avatar } from "@/components/ui/primitives";
import { PageHeader, TableShell, SearchInput } from "@/components/ems/kit";
import { Modal, Field, Input } from "@/components/ui/modal";
import { visibleEmployees, roleLabel } from "@/lib/ems";
import { WEEKDAYS, shiftWindow, daysSummary } from "@/lib/shifts";
import { userById } from "@/lib/seed/users";
import type { Shift } from "@/lib/types";
import { Clock, Plus, Pencil, Trash2, CalendarClock } from "lucide-react";

const COLORS: Shift["color"][] = ["primary", "info", "purple", "success", "warning", "danger", "slate"];
const selectCls = "h-9 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]";

export default function ShiftsPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const shifts = useApp((s) => s.shifts);
  const employees = useApp((s) => s.employees);
  const addShift = useApp((s) => s.addShift);
  const updateShift = useApp((s) => s.updateShift);
  const deleteShift = useApp((s) => s.deleteShift);
  const assignShift = useApp((s) => s.assignShift);
  const viewer = userById(actingUserId)!;

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [color, setColor] = useState<Shift["color"]>("primary");

  const roster = useMemo(() => {
    const list = visibleEmployees(viewer, employees).filter((u) => u.status !== "resigned");
    if (!q) return list;
    const s = q.toLowerCase();
    return list.filter((u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
  }, [viewer, employees, q]);

  const memberCount = (shiftId: string) => employees.filter((u) => u.shiftId === shiftId && u.status !== "resigned").length;

  function openCreate() {
    setEditId(null); setName(""); setStartTime("09:00"); setEndTime("18:00"); setDays([1, 2, 3, 4, 5, 6]); setColor("primary"); setOpen(true);
  }
  function openEdit(s: Shift) {
    setEditId(s.id); setName(s.name); setStartTime(s.startTime); setEndTime(s.endTime); setDays(s.days); setColor(s.color); setOpen(true);
  }
  function toggleDay(d: number) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b)));
  }
  function submit() {
    if (!name.trim()) return;
    if (editId) updateShift(editId, { name: name.trim(), startTime, endTime, days, color });
    else addShift({ name: name.trim(), startTime, endTime, days, color });
    setOpen(false); setEditId(null);
  }
  function remove(s: Shift) {
    if (!window.confirm(`Delete the "${s.name}" shift? Anyone assigned to it will be unassigned.`)) return;
    const res = deleteShift(s.id);
    if (!res.ok) window.alert(res.error);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Shifts"
        subtitle="Define work shifts and assign them to employees & managers"
        action={<Button onClick={openCreate}><Plus size={16} /> New shift</Button>}
      />

      {/* Shift definitions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shifts.map((s) => (
          <Card key={s.id} className="p-5">
            <div className="mb-2 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)]"><Clock size={18} className="text-[var(--muted)]" /></div>
                <div>
                  <div className="flex items-center gap-2 font-semibold">{s.name} {s.system && <Badge color="slate">System</Badge>}</div>
                  <div className="text-[11px] text-[var(--muted-2)]">{memberCount(s.id)} assigned</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(s)} className="rounded-md p-1.5 text-[var(--muted-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]" aria-label="Edit"><Pencil size={15} /></button>
                {!s.system && <button onClick={() => remove(s)} className="rounded-md p-1.5 text-[var(--muted-2)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]" aria-label="Delete"><Trash2 size={15} /></button>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm"><CalendarClock size={14} className="text-[var(--muted)]" /> {shiftWindow(s)}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {WEEKDAYS.map((d, i) => (
                <span key={i} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${s.days.includes(i) ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "bg-[var(--surface-2)] text-[var(--muted-2)]"}`}>{d}</span>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Assign employees */}
      <Card className="p-3">
        <div className="mb-2 px-1 text-sm font-semibold">Assign shifts</div>
        <div className="mb-3"><SearchInput value={q} onChange={setQ} placeholder="Search employees…" /></div>
        <TableShell head={<><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Shift</th></>}>
          {roster.map((u) => {
            const d = departmentById(u.departmentId);
            return (
              <tr key={u.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={u.name} size={30} src={u.avatarUrl} />
                    <div>
                      <div className="text-sm font-medium">{u.name}</div>
                      <div className="text-xs text-[var(--muted)]">{roleLabel(u, d)}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5"><Badge color={d?.color ?? "slate"}>{d?.name ?? "—"}</Badge></td>
                <td className="px-4 py-2.5">
                  <select className={selectCls} value={u.shiftId ?? ""} onChange={(e) => assignShift(u.id, e.target.value || undefined)}>
                    <option value="">— No shift —</option>
                    {shifts.map((s) => <option key={s.id} value={s.id}>{s.name} ({shiftWindow(s)})</option>)}
                  </select>
                </td>
              </tr>
            );
          })}
        </TableShell>
        {roster.length === 0 && <div className="py-8 text-center text-sm text-[var(--muted)]">No employees match.</div>}
      </Card>

      {/* Create / edit modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? "Edit shift" : "New shift"}
        size="md"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit} disabled={!name.trim()}>{editId ? "Save changes" : "Create shift"}</Button></>}
      >
        <div className="space-y-4">
          <Field label="Shift name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. General, Night" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start time"><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Field>
            <Field label="End time" hint="Set earlier than start for overnight"><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Field>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-[var(--muted)]">Working days</div>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((d, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${days.includes(i) ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border-strong)] text-[var(--muted)] hover:bg-[var(--surface-2)]"}`}>{d}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-[var(--muted)]">Colour</div>
            <div className="flex gap-2">
              {COLORS.map((c) => <button key={c} type="button" onClick={() => setColor(c)} className={`rounded-full px-1 ${color === c ? "ring-2 ring-[var(--ring)]" : ""}`}><Badge color={c}>{c}</Badge></button>)}
            </div>
          </div>
          <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">Preview: <span className="font-medium text-[var(--foreground)]">{name || "Shift"}</span> · {daysSummary(days)}</div>
        </div>
      </Modal>
    </div>
  );
}
