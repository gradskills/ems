"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Modal, Field, Input, Textarea } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import { visibleEmployees, taskColumns, taskStatusLabel } from "@/lib/ems";
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
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? me.id);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus ?? "todo");
  const [due, setDue] = useState(task?.dueAt ? task.dueAt.slice(0, 10) : "");
  const [projectId, setProjectId] = useState(task?.projectId ?? "");

  const valid = title.trim().length > 0;

  function submit() {
    if (!valid) return;
    const assignee = userById(assigneeId) ?? me;
    const dueAt = due ? new Date(due).toISOString() : undefined;
    if (task) {
      updateTask(task.id, { title, description, assigneeId, priority, status, dueAt, projectId: projectId || undefined });
    } else {
      createTask({ title, description, assigneeId, departmentId: assignee.departmentId, priority, status, dueAt, projectId: projectId || undefined });
    }
    onClose();
    if (!task) { setTitle(""); setDescription(""); setDue(""); setProjectId(""); setStatus(defaultStatus ?? "todo"); }
  }

  return (
    <Modal open={open} onClose={onClose} title={task ? "Edit task" : "New task"} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={!valid}>{task ? "Save changes" : "Create task"}</Button></>}>
      <div className="space-y-4">
        <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" /></Field>
        <Field label="Description"><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details…" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assignee">
            <select className={selectCls} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} disabled={!canAssignOthers}>
              {assignable.map((u) => <option key={u.id} value={u.id}>{u.id === me.id ? "Me" : u.name}</option>)}
            </select>
          </Field>
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
