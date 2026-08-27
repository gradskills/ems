"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Avatar, Button, selectCellCls } from "@/components/ui/primitives";
import { taskColumns, taskStatusLabel, visibleEmployees } from "@/lib/ems";
import { cn, isPast } from "@/lib/utils";
import { Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { Task, TaskStatus, TaskPriority, User } from "@/lib/types";

type SortKey = "title" | "assignee" | "status" | "priority" | "dueAt";
const priorityOrder: Record<TaskPriority, number> = { low: 0, medium: 1, high: 2, urgent: 3 };

interface TasksSheetProps {
  tasks: Task[];
  me: User;
  canEdit: (t: Task) => boolean;
  onEdit: (t: Task) => void;
}

export function TasksSheet({ tasks, me, canEdit, onEdit }: TasksSheetProps) {
  const employees = useApp((s) => s.employees);
  const projects = useApp((s) => s.projects);
  const moveTask = useApp((s) => s.moveTask);
  const updateTask = useApp((s) => s.updateTask);
  const deleteTask = useApp((s) => s.deleteTask);

  const assignable = useMemo(
    () => (me.accessLevel !== "employee" ? visibleEmployees(me, employees) : [me]),
    [me, employees]
  );

  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");

  function toggleSort(key: SortKey) {
    setSort((s) => (s?.key === key ? (s.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 }));
  }

  const rows = useMemo(() => {
    if (!sort) return tasks;
    const val = (t: Task): string | number => {
      switch (sort.key) {
        case "title": return t.title.toLowerCase();
        case "assignee": return (userById(t.assigneeId)?.name ?? "").toLowerCase();
        case "status": return String(taskColumns.indexOf(t.status));
        case "priority": return priorityOrder[t.priority];
        case "dueAt": return t.dueAt ? Date.parse(t.dueAt) : Number.MAX_SAFE_INTEGER;
      }
    };
    return [...tasks].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va === vb) return 0;
      return va < vb ? -sort.dir : sort.dir;
    });
  }, [tasks, sort]);

  function startTitleEdit(t: Task) {
    setEditingTitleId(t.id);
    setTitleDraft(t.title);
  }
  function commitTitle(t: Task) {
    const next = titleDraft.trim();
    if (next && next !== t.title) updateTask(t.id, { title: next });
    setEditingTitleId(null);
  }

  function sortHeader(label: string, k: SortKey, className?: string) {
    const active = sort?.key === k;
    return (
      <th className={cn("px-3 py-2 font-semibold", className)}>
        <button onClick={() => toggleSort(k)} className={cn("inline-flex items-center gap-1 uppercase tracking-wide transition-colors", active ? "text-[var(--primary)]" : "hover:text-[var(--foreground)]")}>
          {label}
          {active ? (sort!.dir === 1 ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
        </button>
      </th>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="w-8 px-3 py-2 font-semibold text-[var(--muted-2)]">#</th>
              {sortHeader("Task", "title")}
              {sortHeader("Assignee", "assignee", "w-44")}
              {sortHeader("Status", "status", "w-36")}
              {sortHeader("Priority", "priority", "w-32")}
              {sortHeader("Due", "dueAt", "w-36")}
              <th className="w-40 px-3 py-2 font-semibold">Project</th>
              <th className="w-20 px-3 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => {
              const assignee = userById(t.assigneeId);
              const editable = canEdit(t);
              const overdue = t.status !== "done" && isPast(t.dueAt);
              return (
                <tr key={t.id} className={cn("group border-b border-[var(--border)] transition-colors last:border-b-0 hover:bg-[var(--surface-2)]/60", i % 2 === 1 && "bg-[var(--surface-2)]/30")}>
                  <td className="px-3 py-1.5 text-xs text-[var(--muted-2)]">{i + 1}</td>

                  {/* title — click to edit inline */}
                  <td className="max-w-xs px-3 py-1.5">
                    {editingTitleId === t.id ? (
                      <input
                        autoFocus
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onBlur={() => commitTitle(t)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitTitle(t);
                          if (e.key === "Escape") setEditingTitleId(null);
                        }}
                        className="h-8 w-full rounded-md border border-[var(--primary)] bg-[var(--surface)] px-2 text-sm outline-none ring-2 ring-[var(--ring)]"
                      />
                    ) : (
                      <button
                        onClick={() => editable && startTitleEdit(t)}
                        className={cn("block w-full truncate rounded-md px-1.5 py-1 text-left text-sm", editable ? "cursor-text hover:bg-[var(--surface-2)]" : "cursor-default")}
                        title={t.description || t.title}
                      >
                        {t.title}
                      </button>
                    )}
                  </td>

                  {/* assignee */}
                  <td className="px-3 py-1.5">
                    {editable ? (
                      <select
                        value={t.assigneeId}
                        onChange={(e) => updateTask(t.id, { assigneeId: e.target.value })}
                        className={selectCellCls(true)}
                      >
                        {assignable.map((u) => (
                          <option key={u.id} value={u.id}>{u.id === me.id ? "Me" : u.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-1.5 px-1.5">{assignee && <><Avatar name={assignee.name} size={20} /><span className="text-xs text-[var(--muted)]">{assignee.id === me.id ? "Me" : assignee.name}</span></>}</div>
                    )}
                  </td>

                  {/* status */}
                  <td className="px-1.5 py-1.5">
                    <select
                      value={t.status}
                      disabled={!editable}
                      onChange={(e) => moveTask(t.id, e.target.value as TaskStatus)}
                      className={selectCellCls(editable)}
                    >
                      {taskColumns.map((c) => <option key={c} value={c}>{taskStatusLabel[c]}</option>)}
                    </select>
                  </td>

                  {/* priority */}
                  <td className="px-1.5 py-1.5">
                    <select
                      value={t.priority}
                      disabled={!editable}
                      onChange={(e) => updateTask(t.id, { priority: e.target.value as TaskPriority })}
                      className={selectCellCls(editable)}
                    >
                      {(["low", "medium", "high", "urgent"] as const).map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </td>

                  {/* due date */}
                  <td className={cn("px-3 py-1.5", overdue && "text-[var(--danger)]")}>
                    <input
                      type="date"
                      value={t.dueAt ? t.dueAt.slice(0, 10) : ""}
                      disabled={!editable}
                      onChange={(e) => updateTask(t.id, { dueAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className={cn(selectCellCls(editable), "px-2")}
                    />
                  </td>

                  {/* project */}
                  <td className="px-3 py-1.5 text-xs text-[var(--muted)]">
                    {projects.find((p) => p.id === t.projectId)?.name ?? "—"}
                  </td>

                  {/* actions */}
                  <td className="px-3 py-1.5">
                    <div className={cn("flex items-center justify-end gap-1 transition-opacity", editable ? "opacity-0 group-hover:opacity-100 focus-within:opacity-100" : "opacity-30")}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(t)} disabled={!editable} aria-label="Open editor"><Pencil size={13} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTask(t.id)} disabled={!editable} aria-label="Delete"><Trash2 size={13} /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-[var(--muted-2)]">No tasks match the current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[11px] text-[var(--muted-2)]">
        <span>{rows.length} row{rows.length === 1 ? "" : "s"}{sort ? ` · sorted by ${sort.key} (${sort.dir === 1 ? "asc" : "desc"})` : ""}</span>
        <span>Click a cell to edit · changes sync with the board instantly</span>
      </div>
    </div>
  );
}
