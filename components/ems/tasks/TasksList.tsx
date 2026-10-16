"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Badge, Avatar, Card } from "@/components/ui/primitives";
import { TagChips } from "@/components/ems/tasks/TagInput";
import { priorityColor, taskAssignees } from "@/lib/ems";
import { groupTasks, sortTasks, priorityLabel, subtaskProgress, type GroupBy, type SortKey } from "@/lib/tasks";
import { cn, formatDate, isPast } from "@/lib/utils";
import { ChevronRight, ListChecks, MessageSquare } from "lucide-react";
import type { Task } from "@/lib/types";

interface TasksListProps {
  tasks: Task[];
  groupBy: GroupBy;
  sort: { key: SortKey; dir: 1 | -1 };
  canEdit: (t: Task) => boolean;
  onOpen: (t: Task) => void;
}

export function TasksList({ tasks, groupBy, sort, onOpen }: TasksListProps) {
  const projects = useApp((s) => s.projects);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const g = groupTasks(tasks, groupBy, { projects });
    return g
      .map((grp) => ({ ...grp, tasks: sortTasks(grp.tasks, sort.key, sort.dir) }))
      .filter((grp) => grp.tasks.length > 0 || groupBy === "none");
  }, [tasks, groupBy, sort, projects]);

  if (tasks.length === 0) {
    return <Card className="py-12 text-center text-sm text-[var(--muted-2)]">No tasks match the current filters.</Card>;
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isCollapsed = collapsed[group.key];
        return (
          <Card key={group.key} className="overflow-hidden">
            <button
              onClick={() => setCollapsed((c) => ({ ...c, [group.key]: !c[group.key] }))}
              className="flex w-full items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)]/50 px-3 py-2 text-left"
            >
              <ChevronRight size={15} className={cn("shrink-0 text-[var(--muted-2)] transition-transform", !isCollapsed && "rotate-90")} />
              {group.avatarName ? (
                <Avatar name={group.avatarName} size={18} />
              ) : group.color ? (
                <Badge color={group.color} dot>{group.label}</Badge>
              ) : (
                <span className="text-sm font-semibold">{group.label}</span>
              )}
              {group.avatarName && <span className="text-sm font-semibold">{group.label}</span>}
              <span className="ml-auto text-xs text-[var(--muted-2)]">{group.tasks.length}</span>
            </button>

            {!isCollapsed && (
              <div className="divide-y divide-[var(--border)]">
                {group.tasks.map((t) => {
                  const assignees = taskAssignees(t);
                  const { done, total } = subtaskProgress(t);
                  const overdue = t.status !== "done" && isPast(t.dueAt);
                  return (
                    <button
                      key={t.id}
                      onClick={() => onOpen(t)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--surface-2)]/60"
                    >
                      {t.icon && <span className="shrink-0 text-sm">{t.icon}</span>}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</span>

                      {t.tags && t.tags.length > 0 && <TagChips tags={t.tags.slice(0, 3)} className="hidden sm:flex" />}

                      {total > 0 && (
                        <span className={cn("hidden items-center gap-0.5 text-[11px] sm:inline-flex", done === total ? "text-[var(--success)]" : "text-[var(--muted-2)]")}>
                          <ListChecks size={12} /> {done}/{total}
                        </span>
                      )}
                      {(t.comments?.length ?? 0) > 0 && (
                        <span className="hidden items-center gap-0.5 text-[11px] text-[var(--muted-2)] sm:inline-flex">
                          <MessageSquare size={12} /> {t.comments!.length}
                        </span>
                      )}

                      <Badge color={priorityColor[t.priority]} className="hidden shrink-0 md:inline-flex">{priorityLabel[t.priority]}</Badge>

                      {t.dueAt && (
                        <span className={cn("hidden shrink-0 text-[11px] sm:block", overdue ? "font-medium text-[var(--danger)]" : "text-[var(--muted-2)]")}>
                          {formatDate(t.dueAt)}
                        </span>
                      )}

                      <div className="flex shrink-0 items-center -space-x-1.5">
                        {assignees.slice(0, 3).map((id) => {
                          const u = userById(id);
                          return <span key={id} className="rounded-full ring-2 ring-[var(--surface)]" title={u?.name}><Avatar name={u?.name ?? "?"} size={20} src={u?.avatarUrl} /></span>;
                        })}
                      </div>
                    </button>
                  );
                })}
                {group.tasks.length === 0 && <div className="px-3 py-4 text-center text-xs text-[var(--muted-2)]">Nothing here.</div>}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
