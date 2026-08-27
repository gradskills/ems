"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { Button, Avatar } from "@/components/ui/primitives";
import { Check, UserPlus, Users } from "lucide-react";
import type { Lead } from "@/lib/types";

export function AssignPanel({ lead }: { lead: Lead }) {
  const employees = useApp((s) => s.employees);
  const departments = useApp((s) => s.departments);
  const assignLead = useApp((s) => s.assignLead);

  const [users, setUsers] = useState<string[]>(lead.assignedUserIds ?? []);
  const [depts, setDepts] = useState<string[]>(lead.assignedDeptIds ?? []);
  const [saved, setSaved] = useState(false);

  const dirty =
    JSON.stringify([...users].sort()) !== JSON.stringify([...(lead.assignedUserIds ?? [])].sort()) ||
    JSON.stringify([...depts].sort()) !== JSON.stringify([...(lead.assignedDeptIds ?? [])].sort());

  const toggle = (arr: string[], set: (v: string[]) => void, id: string) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  // people who actually deliver work — exclude pure sales unless already picked
  const deliverers = employees.filter((u) => u.departmentId !== "dept-admin");

  function save() {
    assignLead(lead.id, users, depts);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><UserPlus size={15} /> Assign execution</div>
      <p className="mb-3 text-xs text-[var(--muted)]">Assign whole teams and/or specific people to deliver this work.</p>

      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-2)]"><Users size={11} className="mr-1 inline" /> Teams</div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {departments.filter((d) => d.features.length > 0).map((d) => (
          <button
            key={d.id}
            onClick={() => toggle(depts, setDepts, d.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${depts.includes(d.id) ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border-strong)] text-[var(--muted)] hover:bg-[var(--surface-2)]"}`}
          >
            {d.name}
          </button>
        ))}
      </div>

      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-2)]">People</div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {deliverers.map((u) => (
          <button
            key={u.id}
            onClick={() => toggle(users, setUsers, u.id)}
            className={`flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs font-medium transition-colors ${users.includes(u.id) ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border-strong)] text-[var(--muted)] hover:bg-[var(--surface-2)]"}`}
          >
            <Avatar name={u.name} size={20} /> {u.name.split(" ")[0]}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={!dirty && !saved}>
          {saved ? <><Check size={14} /> Assigned</> : "Save assignment"}
        </Button>
        {(lead.assignedUserIds?.length || lead.assignedDeptIds?.length) ? (
          <span className="text-[11px] text-[var(--muted)]">
            Currently: {lead.assignedDeptIds?.map((id) => departments.find((d) => d.id === id)?.name).filter(Boolean).join(", ")}
            {lead.assignedUserIds?.length ? ` · ${lead.assignedUserIds.length} people` : ""}
          </span>
        ) : (
          <span className="text-[11px] text-[var(--muted-2)]">No one assigned yet</span>
        )}
      </div>
    </div>
  );
}
