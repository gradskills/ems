"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Avatar, Badge } from "@/components/ui/primitives";
import { Popover } from "@/components/ui/popover";
import { TagInput } from "@/components/ems/tasks/TagInput";
import { TaskChecklist } from "@/components/ems/tasks/TaskChecklist";
import { TaskComments } from "@/components/ems/tasks/TaskComments";
import {
  visibleEmployees,
  taskColumns,
  taskStatusLabel,
  taskStatusColor,
  taskAssignees,
  canEditTask,
} from "@/lib/ems";
import { priorityLabel, allTags } from "@/lib/tasks";
import { cn, formatDate, isPast } from "@/lib/utils";
import {
  X, Check, Copy, Trash2, MoreHorizontal, Circle, Flag, Users, Calendar,
  FolderGit2, Tag as TagIcon, Clock, MessageSquare, ListChecks, Smile,
  Pencil, Lock, ShieldCheck, Timer,
} from "lucide-react";
import type { Task, TaskPriority, TaskStatus } from "@/lib/types";

const EMOJIS = ["📝", "✅", "🚀", "🐛", "🔥", "⭐", "📌", "💡", "📅", "🎯", "🧩", "📣", "🛠️", "🔧", "🎨", "📦", "🧪", "🔍", "💬", "⚡"];

const chipCls = "inline-flex h-7 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm hover:bg-[var(--surface-2)]";

/** Right-hand slide-over "peek" with every task property inline-editable. */
export function TaskDetail({ taskId, onClose, onEdit }: { taskId: string | null; onClose: () => void; onEdit?: (task: Task) => void }) {
  const actingUserId = useApp((s) => s.actingUserId);
  const employees = useApp((s) => s.employees);
  const projects = useApp((s) => s.projects);
  const tasks = useApp((s) => s.tasks);
  const updateTask = useApp((s) => s.updateTask);
  const moveTask = useApp((s) => s.moveTask);
  const deleteTask = useApp((s) => s.deleteTask);
  const duplicateTask = useApp((s) => s.duplicateTask);
  const setTaskTags = useApp((s) => s.setTaskTags);

  const me = userById(actingUserId)!;
  const task = tasks.find((t) => t.id === taskId) ?? null;

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  // reset local drafts whenever a different task opens
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDesc(task.description ?? "");
    }
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!taskId) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [taskId, onClose]);

  if (!taskId || !task || typeof document === "undefined") return null;

  const editable = canEditTask(task, me, employees);
  const canAssignOthers = me.accessLevel !== "employee";
  const assignable = canAssignOthers ? visibleEmployees(me, employees) : [me];
  const assignees = taskAssignees(task);
  // Edit-access grants: only the owner (creator) or an admin may change them.
  // The owner always keeps edit rights; other assignees are view-only until granted.
  const canGrant = me.id === task.createdById || me.accessLevel === "admin";
  const editorIds = task.editorIds ?? [];
  const grantable = assignees.filter((id) => id !== task.createdById);
  const creator = userById(task.createdById);
  const suggestions = allTags(tasks);
  const overdue = task.status !== "done" && isPast(task.dueAt);

  function commitTitle() {
    const next = title.trim();
    if (next && next !== task!.title) updateTask(task!.id, { title: next });
    else setTitle(task!.title);
  }
  function commitDesc() {
    if (desc !== (task!.description ?? "")) updateTask(task!.id, { description: desc });
  }
  function toggleAssignee(id: string) {
    const has = assignees.includes(id);
    const next = has ? assignees.filter((x) => x !== id) : [...assignees, id];
    if (next.length === 0) return; // keep at least one assignee
    updateTask(task!.id, { assigneeIds: next });
  }
  function toggleEditor(id: string) {
    const next = editorIds.includes(id) ? editorIds.filter((x) => x !== id) : [...editorIds, id];
    updateTask(task!.id, { editorIds: next });
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px] animate-in" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-[540px] flex-col bg-[var(--surface)] shadow-[var(--shadow-lg)] animate-in">
        {/* header */}
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-[var(--muted-2)]">
            <Badge color={taskStatusColor[task.status]} dot>{taskStatusLabel[task.status]}</Badge>
            {!editable && <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5">Read-only</span>}
          </div>
          <div className="flex items-center gap-1">
            {editable && (
              <Popover
                align="end"
                width={180}
                trigger={({ toggle }) => (
                  <button onClick={toggle} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)]" aria-label="More">
                    <MoreHorizontal size={18} />
                  </button>
                )}
              >
                {({ close }) => (
                  <div className="text-sm">
                    {onEdit && (
                      <button
                        onClick={() => { close(); onEdit(task); }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--surface-2)]"
                      >
                        <Pencil size={14} /> Edit in full editor
                      </button>
                    )}
                    <button
                      onClick={() => { duplicateTask(task.id); close(); }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--surface-2)]"
                    >
                      <Copy size={14} /> Duplicate
                    </button>
                    <button
                      onClick={() => { if (confirm("Delete this task?")) { deleteTask(task.id); onClose(); } close(); }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </Popover>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)]" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* emoji + title */}
          <div className="mb-4 flex items-start gap-2">
            <Popover
              width={236}
              trigger={({ toggle }) => (
                <button
                  onClick={() => editable && toggle()}
                  className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-2xl", editable && "hover:bg-[var(--surface-2)]")}
                  aria-label="Task icon"
                >
                  {task.icon || <Smile size={20} className="text-[var(--muted-2)]" />}
                </button>
              )}
            >
              {({ close }) => (
                <div className="grid grid-cols-6 gap-1">
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => { updateTask(task.id, { icon: e }); close(); }} className="flex h-8 w-8 items-center justify-center rounded-md text-xl hover:bg-[var(--surface-2)]">
                      {e}
                    </button>
                  ))}
                  <button onClick={() => { updateTask(task.id, { icon: undefined }); close(); }} className="col-span-6 mt-1 rounded-md px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--surface-2)]">
                    Remove icon
                  </button>
                </div>
              )}
            </Popover>
            <textarea
              value={title}
              disabled={!editable}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
              rows={1}
              placeholder="Untitled task"
              className="min-h-[36px] flex-1 resize-none bg-transparent text-xl font-bold leading-snug outline-none placeholder:text-[var(--muted-2)] disabled:cursor-default"
            />
          </div>

          {/* property grid */}
          <div className="space-y-0.5 rounded-xl border border-[var(--border)] p-1.5">
            <PropRow icon={<Circle size={14} />} label="Status">
              <StatusSelect value={task.status} disabled={!editable} onChange={(v) => moveTask(task.id, v)} />
            </PropRow>
            <PropRow icon={<Flag size={14} />} label="Priority">
              <PrioritySelect value={task.priority} disabled={!editable} onChange={(v) => updateTask(task.id, { priority: v })} />
            </PropRow>
            <PropRow icon={<Users size={14} />} label="Assignees">
              {canAssignOthers ? (
                <Popover
                  width={240}
                  trigger={({ toggle }) => (
                    <button onClick={toggle} className="flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-[var(--surface-2)]">
                      <span className="flex -space-x-1.5">
                        {assignees.slice(0, 4).map((id) => {
                          const u = userById(id);
                          return <span key={id} className="rounded-full ring-2 ring-[var(--surface)]"><Avatar name={u?.name ?? "?"} size={22} src={u?.avatarUrl} /></span>;
                        })}
                      </span>
                      <span className="ml-1 truncate text-sm">{assignees.map((id) => userById(id)?.name).filter(Boolean).join(", ") || "Unassigned"}</span>
                    </button>
                  )}
                >
                  {() => (
                    <div className="max-h-60 space-y-0.5 overflow-y-auto">
                      {assignable.map((u) => {
                        const checked = assignees.includes(u.id);
                        return (
                          <button
                            key={u.id}
                            onClick={() => toggleAssignee(u.id)}
                            className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm", checked ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--surface-2)]")}
                          >
                            <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", checked ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border-strong)]")}>
                              {checked && <Check size={11} />}
                            </span>
                            <Avatar name={u.name} size={22} src={u.avatarUrl} />
                            <span className="truncate">{u.id === me.id ? "Me" : u.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Popover>
              ) : (
                <div className="flex items-center gap-1 px-1.5 py-1 text-sm">
                  {assignees.map((id) => { const u = userById(id); return <Avatar key={id} name={u?.name ?? "?"} size={22} src={u?.avatarUrl} />; })}
                  <span className="ml-1 truncate">{assignees.map((id) => userById(id)?.name).filter(Boolean).join(", ")}</span>
                </div>
              )}
            </PropRow>
            {canGrant && grantable.length > 0 && (
              <PropRow icon={<ShieldCheck size={14} />} label="Can edit">
                <Popover
                  width={264}
                  trigger={({ toggle }) => (
                    <button onClick={toggle} className="flex items-center gap-1 rounded-md px-1.5 py-1 text-sm hover:bg-[var(--surface-2)]">
                      {editorIds.length ? `Owner + ${editorIds.length}` : "Owner only"}
                    </button>
                  )}
                >
                  {() => (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-[var(--muted-2)]">
                        <Lock size={12} /> {creator?.id === me.id ? "You" : creator?.name ?? "Owner"} (owner) can always edit.
                      </div>
                      {grantable.map((id) => {
                        const u = userById(id);
                        const can = editorIds.includes(id);
                        return (
                          <button
                            key={id}
                            onClick={() => toggleEditor(id)}
                            className={cn("flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm", can ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--surface-2)]")}
                          >
                            <span className="flex min-w-0 items-center gap-2"><Avatar name={u?.name ?? "?"} size={20} src={u?.avatarUrl} /><span className="truncate">{u?.name ?? id}</span></span>
                            <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-medium", can ? "text-[var(--primary)]" : "text-[var(--muted-2)]")}>{can ? <><Pencil size={11} /> Can edit</> : "View only"}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Popover>
              </PropRow>
            )}
            <PropRow icon={<Calendar size={14} />} label="Due date">
              <input
                type="date"
                disabled={!editable}
                value={task.dueAt ? task.dueAt.slice(0, 10) : ""}
                onChange={(e) => updateTask(task.id, { dueAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                className={cn(chipCls, overdue && "border-[var(--danger-soft)] text-[var(--danger)]", "disabled:opacity-70")}
              />
            </PropRow>
            <PropRow icon={<Calendar size={14} />} label="Start date">
              <input
                type="date"
                disabled={!editable}
                value={task.startAt ? task.startAt.slice(0, 10) : ""}
                onChange={(e) => updateTask(task.id, { startAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                className={cn(chipCls, "disabled:opacity-70")}
              />
            </PropRow>
            <PropRow icon={<FolderGit2 size={14} />} label="Project">
              <select
                disabled={!editable}
                value={task.projectId ?? ""}
                onChange={(e) => updateTask(task.id, { projectId: e.target.value || undefined })}
                className={cn(chipCls, "cursor-pointer disabled:opacity-70")}
              >
                <option value="">— None —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </PropRow>
            <PropRow icon={<Clock size={14} />} label="Estimate">
              <div className="flex items-center gap-1 px-1.5">
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  disabled={!editable}
                  value={task.estimateHrs ?? ""}
                  onChange={(e) => updateTask(task.id, { estimateHrs: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0"
                  className="h-7 w-16 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm outline-none focus:border-[var(--primary)] disabled:opacity-70"
                />
                <span className="text-xs text-[var(--muted-2)]">hrs</span>
              </div>
            </PropRow>
            <PropRow icon={<Timer size={14} />} label="Logged">
              <div className="flex items-center gap-1 px-1.5">
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  disabled={!editable}
                  value={task.loggedHrs ?? ""}
                  onChange={(e) => updateTask(task.id, { loggedHrs: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0"
                  className="h-7 w-16 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm outline-none focus:border-[var(--primary)] disabled:opacity-70"
                />
                <span className="text-xs text-[var(--muted-2)]">hrs{task.estimateHrs ? ` / ${task.estimateHrs} est` : ""}</span>
              </div>
            </PropRow>
            <PropRow icon={<TagIcon size={14} />} label="Tags" align="start">
              <div className="flex-1 px-1">
                <TagInput tags={task.tags ?? []} suggestions={suggestions} disabled={!editable} onChange={(t) => setTaskTags(task.id, t)} />
              </div>
            </PropRow>
          </div>

          {/* description */}
          <div className="mt-5">
            <SectionLabel icon={<MessageSquare size={14} />}>Description</SectionLabel>
            <textarea
              value={desc}
              disabled={!editable}
              onChange={(e) => setDesc(e.target.value)}
              onBlur={commitDesc}
              rows={4}
              placeholder={editable ? "Add more detail…" : "No description"}
              className="mt-1 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-80"
            />
          </div>

          {/* sub-tasks */}
          <div className="mt-5">
            <SectionLabel icon={<ListChecks size={14} />}>Sub-tasks</SectionLabel>
            <div className="mt-1">
              <TaskChecklist task={task} editable={editable} />
            </div>
          </div>

          {/* comments */}
          <div className="mt-6">
            <SectionLabel icon={<MessageSquare size={14} />}>Comments</SectionLabel>
            <div className="mt-2">
              <TaskComments task={task} me={me} />
            </div>
          </div>

          {/* meta */}
          <div className="mt-6 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--muted-2)]">
            Created by {creator?.name ?? "—"} · {formatDate(task.createdAt, true)}
            {task.updatedAt && task.updatedAt !== task.createdAt && <> · edited {formatDate(task.updatedAt, true)}</>}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PropRow({ icon, label, children, align = "center" }: { icon: ReactNode; label: string; children: ReactNode; align?: "center" | "start" }) {
  return (
    <div className={cn("flex gap-2 rounded-md px-1 py-1", align === "center" ? "items-center" : "items-start")}>
      <div className={cn("flex w-28 shrink-0 items-center gap-1.5 text-sm text-[var(--muted)]", align === "start" && "pt-1.5")}>
        <span className="text-[var(--muted-2)]">{icon}</span>
        {label}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function SectionLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
      <span className="text-[var(--muted-2)]">{icon}</span>
      {children}
    </div>
  );
}

function StatusSelect({ value, disabled, onChange }: { value: TaskStatus; disabled: boolean; onChange: (v: TaskStatus) => void }) {
  return (
    <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as TaskStatus)} className={cn(chipCls, "cursor-pointer disabled:opacity-70")}>
      {taskColumns.map((s) => <option key={s} value={s}>{taskStatusLabel[s]}</option>)}
    </select>
  );
}

function PrioritySelect({ value, disabled, onChange }: { value: TaskPriority; disabled: boolean; onChange: (v: TaskPriority) => void }) {
  return (
    <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as TaskPriority)} className={cn(chipCls, "cursor-pointer disabled:opacity-70")}>
      {(["low", "medium", "high", "urgent"] as TaskPriority[]).map((p) => <option key={p} value={p}>{priorityLabel[p]}</option>)}
    </select>
  );
}
