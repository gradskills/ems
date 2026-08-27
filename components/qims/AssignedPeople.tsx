"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { Avatar } from "@/components/ui/primitives";
import { departmentById } from "@/lib/seed/org";
import { X, Plus, Check } from "lucide-react";
import type { Lead } from "@/lib/types";

// Compact "assigned people" control shown beside the stage: avatars of assigned
// people + an Add button to add/remove people (replaces the old AssignPanel).
export function AssignedPeople({ lead }: { lead: Lead }) {
  const employees = useApp((s) => s.employees);
  const assignLead = useApp((s) => s.assignLead);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const assignedIds = lead.assignedUserIds ?? [];
  const assigned = employees.filter((u) => assignedIds.includes(u.id));
  const deliverers = employees.filter((u) => u.departmentId !== "dept-admin");

  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function toggle(id: string) {
    const next = assignedIds.includes(id) ? assignedIds.filter((x) => x !== id) : [...assignedIds, id];
    assignLead(lead.id, next, lead.assignedDeptIds ?? []);
  }

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <span className="text-xs font-medium text-[var(--muted)]">Assigned</span>
      <div className="flex items-center -space-x-2">
        {assigned.map((u) => (
          <div key={u.id} className="group relative" title={u.name}>
            <div className="rounded-full ring-2 ring-[var(--surface)]"><Avatar name={u.name} size={28} /></div>
            <button
              onClick={() => toggle(u.id)}
              className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-[var(--danger)] text-white group-hover:flex"
              title={`Remove ${u.name}`}
            >
              <X size={10} />
            </button>
          </div>
        ))}
        {assigned.length === 0 && <span className="text-xs text-[var(--muted-2)]">No one yet</span>}
      </div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-[var(--border-strong)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
        title="Add / remove people"
      >
        <Plus size={15} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-72 w-60 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] animate-in">
          <div className="sticky top-0 border-b border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Assign people</div>
          {deliverers.map((u) => {
            const on = assignedIds.includes(u.id);
            const dept = departmentById(u.departmentId);
            return (
              <button key={u.id} onClick={() => toggle(u.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-2)]">
                <Avatar name={u.name} size={26} />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-sm font-medium">{u.name}</div>
                  <div className="truncate text-[11px] text-[var(--muted-2)]">{dept?.name}</div>
                </div>
                {on && <Check size={15} className="shrink-0 text-[var(--primary)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
