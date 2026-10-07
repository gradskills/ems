"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Modal, Field, Input, Textarea } from "@/components/ui/modal";
import { Button, Avatar } from "@/components/ui/primitives";
import { visibleEmployees, taskColumns, taskStatusLabel, taskAssignees } from "@/lib/ems";
import { cn } from "@/lib/utils";
import { Check, Pencil, Lock } from "lucide-react";
import type { Task, TaskPriority, TaskStatus } from "@/lib/types";

const selectCls = "h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]";

export function TaskModal({ open, onClose, task, defaultStatus }: { open: boolean; onClose: () => void; task?: Task; defaultStatus?: TaskStatus }) {
  const actingUserId = useApp((s) => s.actingUserId);
  const employees = useApp((s) => s.employees);
  const projects = useApp((s) => s.projects);
  const createTask = useApp((s) => s.createTask);
  const updateTask = useApp((s) => s.updateTask);
  const me = userById(actingUserId)!;
  const canAssignOthers = me.accessLevel !== "employee";
  const assignable = canAssignOthers ? visibleEmployees(me, employees) : [me];

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task ? taskAssignees(task) : [me.id]);
  const [editorIds, setEditorIds] = useState<string[]>(task?.editorIds ?? []);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus ?? "todo");
  const [due, setDue] = useState(task?.dueAt ? task.dueAt.slice(0, 10) : "");
  const [projectId, setProjectId] = useState(task?.projectId ?? "");

  const valid = title.trim().length > 0 && assigneeIds.length > 0;

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // drop edit grants for anyone no longer assigned
      setEditorIds((e) => e.filter((x) => next.includes(x)));
      return next;
    });
  }
  function toggleEditor(id: string) {
    setEditorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submit() {
    if (!valid) return;
    const ids = Array.from(new Set(assigneeIds));
    const primary = userById(ids[0]) ?? me;
    const dueAt = due ? new Date(due).toISOString() : undefined;
    const editors = editorIds.filter((x) => ids.includes(x));
    if (task) {
      updateTask(task.id, { title, description, assigneeIds: ids, editorIds: editors, priority, status, dueAt, projectId: projectId || undefined });
    } else {
      createTask({ title, description, assigneeIds: ids, editorIds: editors, departmentId: primary.departmentId, priority, status, dueAt, projectId: projectId || undefined });
    }
    onClose();
    if (!task) { setTitle(""); setDescription(""); setDue(""); setProjectId(""); setStatus(defaultStatus ?? "todo"); setAssigneeIds([me.id]); setEditorIds([]); }
  }

  // The creator always keeps edit rights, so they're shown as a locked "Owner".
  // Everyone else who is assigned can be toggled between view-only and can-edit.
  const creatorId = task?.createdById ?? me.id;
  const grantable = assigneeIds.filter((id) => id !== creatorId);

  return (
    <Modal open={open} onClose={onClose} title={task ? "Edit task" : "New task"} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={!valid}>{task ? "Save changes" : "Create task"}</Button></>}>
      <div className="space-y-4">
        <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" /></Field>
        <Field label="Description"><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details…" /></Field>

        <Field label={`Assignees${assigneeIds.length ? ` · ${assigneeIds.length}` : ""}`}>
          {canAssignOthers ? (
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5">
              {assignable.map((u) => {
                const checked = assigneeIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleAssignee(u.id)}
                    className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors", checked ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--surface-2)]")}
                  >
                    <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", checked ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border-strong)]")}>
                      {checked && <Check size={12} />}
                    </span>
                    <Avatar name={u.name} size={22} src={u.avatarUrl} />
                    <span className="truncate">{u.id === me.id ? "Me" : u.name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--muted)]">
              <Avatar name={me.name} size={22} src={me.avatarUrl} /> Me
            </div>
          )}
        </Field>

        {canAssignOthers && grantable.length > 0 && (
          <Field label="Who can edit this task?">
            <div className="space-y-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5">
              <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[var(--muted-2)]">
                <Lock size={12} /> You (owner) can always edit. Grant edit to the assignees below — others get a read-only view.
              </div>
              {grantable.map((id) => {
                const u = userById(id);
                const can = editorIds.includes(id);
                return (
                  <div key={id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-[var(--surface-2)]">
                    <span className="flex items-center gap-2 truncate"><Avatar name={u?.name ?? "?"} size={22} src={u?.avatarUrl} /><span className="truncate">{u?.name ?? id}</span></span>
                    <button
                      type="button"
                      onClick={() => toggleEditor(id)}
                      className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors", can ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]")}
                    >
                      {can ? <><Pencil size={12} /> Can edit</> : <>View only</>}
                    </button>
                  </div>
                );
              })}
            </div>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority">
            <select className={selectCls} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </Field>
          <Field label="Status">
            <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {taskColumns.map((s) => <option key={s} value={s}>{taskStatusLabel[s]}</option>)}
            </select>
          </Field>
          <Field label="Due date"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
          <Field label="Project (optional)">
            <select className={selectCls} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">— None —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}
