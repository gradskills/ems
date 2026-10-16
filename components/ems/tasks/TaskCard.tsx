"use client";

import { Card, Badge, Avatar } from "@/components/ui/primitives";
import { TagChips } from "@/components/ems/tasks/TagInput";
import { priorityColor, taskAssignees } from "@/lib/ems";
import { priorityLabel, subtaskProgress } from "@/lib/tasks";
import { userById } from "@/lib/seed/users";
import { cn, formatDate, isPast } from "@/lib/utils";
import { GripVertical, Trash2, MessageSquare, ListChecks } from "lucide-react";
import type { Task } from "@/lib/types";

interface TaskCardProps {
  task: Task;
  editable: boolean;
  showAssignees?: boolean;
  onOpen: (t: Task) => void;
  onDelete?: (t: Task) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
  dragging?: boolean;
  className?: string;
}

export function TaskCard({
  task,
  editable,
  showAssignees = true,
  onOpen,
  onDelete,
  draggable,
  onDragStart,
  onDragEnd,
  dragging,
  className,
}: TaskCardProps) {
  const assignees = taskAssignees(task);
  const { done, total } = subtaskProgress(task);
  const comments = task.comments?.length ?? 0;
  const overdue = task.status !== "done" && isPast(task.dueAt);

  return (
    <Card
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(task)}
      className={cn(
        "group cursor-pointer p-3 transition-shadow hover:border-[var(--border-strong)] hover:shadow-md",
        draggable && "active:cursor-grabbing",
        dragging && "opacity-40",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1.5">
          {draggable && <GripVertical size={13} className="mt-0.5 shrink-0 cursor-grab text-[var(--muted-2)] opacity-0 transition-opacity group-hover:opacity-100" />}
          {task.icon && <span className="shrink-0 text-sm leading-5">{task.icon}</span>}
          <div className="text-sm font-medium break-words">{task.title}</div>
        </div>
        {editable && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            className="shrink-0 rounded p-1 text-[var(--muted-2)] opacity-0 transition-opacity hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] group-hover:opacity-100"
            aria-label="Delete"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {task.description && <div className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">{task.description}</div>}

      {task.tags && task.tags.length > 0 && <TagChips tags={task.tags} className="mt-2" />}

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Badge color={priorityColor[task.priority]}>{priorityLabel[task.priority]}</Badge>
        {task.dueAt && (
          <span className={cn("text-[10px]", overdue ? "font-medium text-[var(--danger)]" : "text-[var(--muted-2)]")}>
            {formatDate(task.dueAt)}
          </span>
        )}
        {total > 0 && (
          <span className={cn("inline-flex items-center gap-0.5 text-[10px]", done === total ? "text-[var(--success)]" : "text-[var(--muted-2)]")}>
            <ListChecks size={11} /> {done}/{total}
          </span>
        )}
        {comments > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--muted-2)]">
            <MessageSquare size={11} /> {comments}
          </span>
        )}
        {showAssignees && assignees.length > 0 && (
          <div className="ml-auto flex items-center -space-x-1.5">
            {assignees.slice(0, 3).map((id) => {
              const u = userById(id);
              return <span key={id} className="rounded-full ring-2 ring-[var(--surface)]" title={u?.name}><Avatar name={u?.name ?? "?"} size={20} src={u?.avatarUrl} /></span>;
            })}
            {assignees.length > 3 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--surface-2)] px-1 text-[9px] font-semibold text-[var(--muted)] ring-2 ring-[var(--surface)]">+{assignees.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
