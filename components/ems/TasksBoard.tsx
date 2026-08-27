"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Card, Badge, Avatar } from "@/components/ui/primitives";
import { taskColumns, taskStatusLabel, taskStatusColor, priorityColor } from "@/lib/ems";
import { cn, formatDate } from "@/lib/utils";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/types";

interface TasksBoardProps {
  tasks: Task[];
  scope: "mine" | "team";
  canEdit: (t: Task) => boolean;
  onEdit: (t: Task) => void;
  onNew?: (status: TaskStatus) => void;
}

export function TasksBoard({ tasks, scope, canEdit, onEdit, onNew }: TasksBoardProps) {
  const moveTask = useApp((s) => s.moveTask);
  const deleteTask = useApp((s) => s.deleteTask);

  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, t: Task) {
    setDragId(t.id);
    e.dataTransfer.setData("text/plain", t.id);
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragEnd() {
    setDragId(null);
    setOverCol(null);
  }
  function handleDragOver(e: React.DragEvent<HTMLDivElement>, col: TaskStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overCol !== col) setOverCol(col);
  }
  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    const col = e.currentTarget.dataset.col as TaskStatus | undefined;
    if (!col || e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setOverCol((c) => (c === col ? null : c));
  }
  function handleDrop(e: React.DragEvent<HTMLDivElement>, col: TaskStatus) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    if (id) moveTask(id, col);
    setDragId(null);
    setOverCol(null);
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
      {taskColumns.map((col) => {
        const items = tasks.filter((t) => t.status === col);
        const isOver = overCol === col && dragId !== null;
        return (
          <div
            key={col}
            data-col={col}
            onDragOver={(e) => handleDragOver(e, col)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col)}
            className={cn(
              "space-y-2 rounded-xl border p-1.5 transition-colors",
              isOver ? "border-[var(--primary)] bg-[var(--primary-soft)]/50" : "border-transparent"
            )}
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Badge color={taskStatusColor[col]} dot>{taskStatusLabel[col]}</Badge>
              </div>
              <div className="flex items-center gap-1">
                {onNew && (
                  <button onClick={() => onNew(col)} className="rounded p-1 text-[var(--muted-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]" aria-label={`Add task to ${taskStatusLabel[col]}`}>
                    <Plus size={13} />
                  </button>
                )}
                <span className="text-xs text-[var(--muted-2)]">{items.length}</span>
              </div>
            </div>

            <div className="min-h-[80px] space-y-2">
              {items.map((t) => {
                const assignee = userById(t.assigneeId);
                const editable = canEdit(t);
                const dragging = dragId === t.id;
                return (
                  <Card
                    key={t.id}
                    draggable={editable}
                    onDragStart={(e) => handleDragStart(e, t)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "group cursor-grab p-3 active:cursor-grabbing",
                      editable && "hover:border-[var(--border-strong)] hover:shadow-md",
                      dragging && "opacity-40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-1.5">
                        {editable && <GripVertical size={13} className="mt-0.5 shrink-0 text-[var(--muted-2)] opacity-0 transition-opacity group-hover:opacity-100" />}
                        <div className="text-sm font-medium break-words">{t.title}</div>
                      </div>
                      {editable && (
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button onClick={() => onEdit(t)} className="rounded p-1 text-[var(--muted-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]" aria-label="Edit"><Pencil size={13} /></button>
                          <button onClick={() => deleteTask(t.id)} className="rounded p-1 text-[var(--muted-2)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]" aria-label="Delete"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </div>
                    {t.description && <div className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">{t.description}</div>}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Badge color={priorityColor[t.priority]}>{t.priority}</Badge>
                        {t.dueAt && <span className="text-[10px] text-[var(--muted-2)]">{formatDate(t.dueAt)}</span>}
                      </div>
                      {scope === "team" && assignee && <Avatar name={assignee.name} size={22} />}
                    </div>
                  </Card>
                );
              })}
              {items.length === 0 && (
                <div className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center transition-colors", isOver ? "border-[var(--primary)]" : "border-[var(--border)]")}>
                  <span className="text-[11px] text-[var(--muted-2)]">{isOver ? "Drop here" : "Empty"}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
