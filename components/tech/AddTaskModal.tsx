"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Modal, Field, Input, Textarea } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import type { TaskPriority, TaskStatus } from "@/lib/types";

const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];
const statuses: TaskStatus[] = ["todo", "in_progress", "review", "blocked", "done"];

export function AddTaskModal({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const createTask = useApp((s) => s.createTask);
  const employees = useApp((s) => s.employees);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueAt, setDueAt] = useState("");

  const pool = useMemo(() => employees.filter((e) => e.status !== "inactive"), [employees]);

  const valid = title.trim() && assigneeId;

  function save() {
    if (!valid) return;
    createTask({
      title: title.trim(),
      description: description.trim() || undefined,
      assigneeId,
      departmentId: "dept-tech",
      priority,
      status,
      dueAt: dueAt || undefined,
      projectId,
    });
    onClose();
    setTitle("");
    setDescription("");
    setAssigneeId("");
    setPriority("medium");
    setStatus("todo");
    setDueAt("");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add task to project"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid} onClick={save}>Add task</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Title *"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Wire Razorpay webhook → order status" autoFocus /></Field>
        <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Anything the assignee should know…" rows={2} /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Assignee *">
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
              <option value="">Assign to…</option>
              {pool.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
          <Field label="Due date"><Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Priority">
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
              {priorities.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
              {statuses.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </Field>
        </div>
        <p className="text-xs text-[var(--muted-2)]">Anyone can add tasks to a project.</p>
      </div>
    </Modal>
  );
}
