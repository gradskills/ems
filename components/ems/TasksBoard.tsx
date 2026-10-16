"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Badge, Avatar } from "@/components/ui/primitives";
import { TaskCard } from "@/components/ems/tasks/TaskCard";
import { groupTasks, sortTasks, dropPatch, type GroupBy, type SortKey, type TaskGroup } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import type { Task } from "@/lib/types";

interface TasksBoardProps {
  tasks: Task[];
  groupBy: GroupBy;
  sort: { key: SortKey; dir: 1 | -1 };
  canEdit: (t: Task) => boolean;
  onOpen: (t: Task) => void;
  onQuickAdd: (groupBy: GroupBy, groupKey: string, title: string) => void;
}

export function TasksBoard({ tasks, groupBy, sort, canEdit, onOpen, onQuickAdd }: TasksBoardProps) {
  const projects = useApp((s) => s.projects);
  const reorderBoard = useApp((s) => s.reorderBoard);
  const deleteTask = useApp((s) => s.deleteTask);

  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ key: string; index: number } | null>(null);

  const groups = useMemo(() => {
    const g = groupTasks(tasks, groupBy, { projects });
    return g.map((grp) => ({ ...grp, tasks: sortTasks(grp.tasks, sort.key, sort.dir) }));
  }, [tasks, groupBy, sort, projects]);

  function commitDrop(group: TaskGroup, index: number) {
    if (!dragId) return;
    const ids = group.tasks.map((t) => t.id).filter((id) => id !== dragId);
    const clamped = Math.max(0, Math.min(index, ids.length));
    ids.splice(clamped, 0, dragId);
    reorderBoard(dragId, dropPatch(groupBy, group.key), ids);
    setDragId(null);
    setOver(null);
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {groups.map((group) => {
        const isOverCol = over?.key === group.key && dragId !== null;
        return (
          <div
            key={group.key}
            onDragOver={(e) => {
              if (!dragId) return;
              e.preventDefault();
              // default insertion point = end of column unless a card set a finer index
              setOver((o) => (o?.key === group.key ? o : { key: group.key, index: group.tasks.length }));
            }}
            onDrop={(e) => {
              e.preventDefault();
              commitDrop(group, over?.key === group.key ? over.index : group.tasks.length);
            }}
            className={cn(
              "flex w-[300px] shrink-0 flex-col rounded-xl border p-1.5 transition-colors",
              isOverCol ? "border-[var(--primary)] bg-[var(--primary-soft)]/40" : "border-[var(--border)] bg-[var(--surface-2)]/40",
            )}
          >
            <div className="flex items-center justify-between px-1.5 py-1">
              <div className="flex min-w-0 items-center gap-1.5">
                {group.avatarName ? (
                  <Avatar name={group.avatarName} size={18} />
                ) : group.color ? (
                  <Badge color={group.color} dot>{group.label}</Badge>
                ) : (
                  <span className="text-sm font-medium">{group.label}</span>
                )}
                {group.avatarName && <span className="truncate text-sm font-medium">{group.label}</span>}
              </div>
              <span className="text-xs text-[var(--muted-2)]">{group.tasks.length}</span>
            </div>

            <div className="min-h-[40px] flex-1 space-y-2 px-0.5 py-1">
              {group.tasks.map((t, i) => {
                const editable = canEdit(t);
                const showBar = over?.key === group.key && over.index === i && dragId && dragId !== t.id;
                return (
                  <div
                    key={t.id}
                    onDragOver={(e) => {
                      if (!dragId) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setOver({ key: group.key, index: i });
                    }}
                  >
                    {showBar && <div className="mb-2 h-0.5 rounded-full bg-[var(--primary)]" />}
                    <TaskCard
                      task={t}
                      editable={editable}
                      onOpen={onOpen}
                      onDelete={(tt) => deleteTask(tt.id)}
                      draggable={editable}
                      dragging={dragId === t.id}
                      onDragStart={(e) => {
                        setDragId(t.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", t.id);
                      }}
                      onDragEnd={() => { setDragId(null); setOver(null); }}
                    />
                  </div>
                );
              })}
              {over?.key === group.key && over.index >= group.tasks.length && dragId && (
                <div className="h-0.5 rounded-full bg-[var(--primary)]" />
              )}
              {group.tasks.length === 0 && !isOverCol && (
                <div className="rounded-lg border border-dashed border-[var(--border)] py-6 text-center text-[11px] text-[var(--muted-2)]">Empty</div>
              )}
            </div>

            <QuickAdd groupBy={groupBy} groupKey={group.key} onAdd={onQuickAdd} />
          </div>
        );
      })}
    </div>
  );
}

function QuickAdd({ groupBy, groupKey, onAdd }: { groupBy: GroupBy; groupKey: string; onAdd: (g: GroupBy, k: string, title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  function commit(keepOpen: boolean) {
    const t = title.trim();
    if (t) onAdd(groupBy, groupKey, t);
    setTitle("");
    if (!keepOpen) setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-1 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--muted-2)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
      >
        <Plus size={14} /> New task
      </button>
    );
  }
  return (
    <div className="mt-1 rounded-lg border border-[var(--primary)] bg-[var(--surface)] p-1.5">
      <textarea
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(true); }
          if (e.key === "Escape") { setTitle(""); setOpen(false); }
        }}
        onBlur={() => commit(false)}
        rows={2}
        placeholder="Task title… (Enter to add)"
        className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-[var(--muted-2)]"
      />
      <div className="flex items-center justify-end">
        <button onClick={() => { setTitle(""); setOpen(false); }} className="rounded p-1 text-[var(--muted-2)] hover:text-[var(--foreground)]" aria-label="Close">
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
