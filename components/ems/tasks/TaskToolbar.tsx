"use client";

import { ReactNode } from "react";
import { Popover } from "@/components/ui/popover";
import { Avatar } from "@/components/ui/primitives";
import { taskColumns, taskStatusLabel } from "@/lib/ems";
import {
  GroupBy, groupByLabel, SortKey, sortLabel, TaskFilter, DueFilter,
  filterActiveCount, priorityLabel,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { Group, ArrowUpDown, SlidersHorizontal, Check, ChevronUp, ChevronDown, X } from "lucide-react";
import type { TaskPriority, TaskStatus, User, Project } from "@/lib/types";

const GROUPS: GroupBy[] = ["status", "priority", "assignee", "project", "none"];
const SORTS: SortKey[] = ["manual", "title", "priority", "dueAt", "created", "updated"];
const PRIORITIES: TaskPriority[] = ["urgent", "high", "medium", "low"];
const DUE_OPTS: { key: DueFilter; label: string }[] = [
  { key: "any", label: "Any time" },
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Due today" },
  { key: "week", label: "Next 7 days" },
  { key: "none", label: "No due date" },
];

const btn = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]";

export function TaskToolbar({
  groupBy,
  onGroupBy,
  sort,
  onSort,
  filter,
  onFilter,
  employees,
  projects,
  tags,
  hideGroup,
  hideSort,
}: {
  groupBy: GroupBy;
  onGroupBy: (g: GroupBy) => void;
  sort: { key: SortKey; dir: 1 | -1 };
  onSort: (s: { key: SortKey; dir: 1 | -1 }) => void;
  filter: TaskFilter;
  onFilter: (f: TaskFilter) => void;
  employees: User[];
  projects: Project[];
  tags: string[];
  hideGroup?: boolean;
  hideSort?: boolean;
}) {
  const activeFilters = filterActiveCount(filter);

  function toggle<T>(list: T[], v: T): T[] {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* group by */}
      {!hideGroup && (
      <Popover
        width={190}
        trigger={({ toggle }) => (
          <button onClick={toggle} className={cn(btn, groupBy !== "status" && "border-[var(--primary)] text-[var(--primary)]")}>
            <Group size={14} /> Group: {groupByLabel[groupBy]}
          </button>
        )}
      >
        {({ close }) => (
          <div className="text-sm">
            {GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => { onGroupBy(g); close(); }}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 hover:bg-[var(--surface-2)]"
              >
                {groupByLabel[g]}
                {groupBy === g && <Check size={14} className="text-[var(--primary)]" />}
              </button>
            ))}
          </div>
        )}
      </Popover>
      )}

      {/* sort */}
      {!hideSort && (
      <Popover
        width={200}
        trigger={({ toggle }) => (
          <button onClick={toggle} className={cn(btn, sort.key !== "manual" && "border-[var(--primary)] text-[var(--primary)]")}>
            <ArrowUpDown size={14} /> Sort: {sortLabel[sort.key]}
          </button>
        )}
      >
        {() => (
          <div className="text-sm">
            {SORTS.map((k) => (
              <button
                key={k}
                onClick={() => onSort({ key: k, dir: sort.key === k ? (sort.dir === 1 ? -1 : 1) : 1 })}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 hover:bg-[var(--surface-2)]"
              >
                {sortLabel[k]}
                {sort.key === k && (sort.dir === 1 ? <ChevronUp size={14} className="text-[var(--primary)]" /> : <ChevronDown size={14} className="text-[var(--primary)]" />)}
              </button>
            ))}
          </div>
        )}
      </Popover>
      )}

      {/* filter */}
      <Popover
        width={264}
        trigger={({ toggle }) => (
          <button onClick={toggle} className={cn(btn, activeFilters > 0 && "border-[var(--primary)] text-[var(--primary)]")}>
            <SlidersHorizontal size={14} /> Filter
            {activeFilters > 0 && <span className="rounded-full bg-[var(--primary)] px-1.5 text-[10px] font-semibold text-white">{activeFilters}</span>}
          </button>
        )}
      >
        {() => (
          <div className="space-y-3 p-1">
            {activeFilters > 0 && (
              <button
                onClick={() => onFilter({ statuses: [], priorities: [], assignees: [], tags: [], projects: [], due: "any" })}
                className="flex items-center gap-1 text-xs font-medium text-[var(--danger)] hover:underline"
              >
                <X size={12} /> Clear all filters
              </button>
            )}

            <FilterSection label="Status">
              {taskColumns.map((s) => (
                <CheckChip key={s} checked={filter.statuses.includes(s)} onClick={() => onFilter({ ...filter, statuses: toggle(filter.statuses, s) as TaskStatus[] })}>
                  {taskStatusLabel[s]}
                </CheckChip>
              ))}
            </FilterSection>

            <FilterSection label="Priority">
              {PRIORITIES.map((p) => (
                <CheckChip key={p} checked={filter.priorities.includes(p)} onClick={() => onFilter({ ...filter, priorities: toggle(filter.priorities, p) as TaskPriority[] })}>
                  {priorityLabel[p]}
                </CheckChip>
              ))}
            </FilterSection>

            <FilterSection label="Due">
              {DUE_OPTS.map((o) => (
                <CheckChip key={o.key} checked={filter.due === o.key} onClick={() => onFilter({ ...filter, due: o.key })}>
                  {o.label}
                </CheckChip>
              ))}
            </FilterSection>

            {employees.length > 0 && (
              <FilterSection label="Assignee">
                <div className="max-h-36 w-full space-y-0.5 overflow-y-auto">
                  {employees.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => onFilter({ ...filter, assignees: toggle(filter.assignees, u.id) })}
                      className={cn("flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm", filter.assignees.includes(u.id) ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--surface-2)]")}
                    >
                      <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", filter.assignees.includes(u.id) ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border-strong)]")}>
                        {filter.assignees.includes(u.id) && <Check size={10} />}
                      </span>
                      <Avatar name={u.name} size={18} src={u.avatarUrl} />
                      <span className="truncate">{u.name}</span>
                    </button>
                  ))}
                </div>
              </FilterSection>
            )}

            {projects.length > 0 && (
              <FilterSection label="Project">
                {projects.map((p) => (
                  <CheckChip key={p.id} checked={filter.projects.includes(p.id)} onClick={() => onFilter({ ...filter, projects: toggle(filter.projects, p.id) })}>
                    {p.name}
                  </CheckChip>
                ))}
                <CheckChip checked={filter.projects.includes("__none")} onClick={() => onFilter({ ...filter, projects: toggle(filter.projects, "__none") })}>
                  No project
                </CheckChip>
              </FilterSection>
            )}

            {tags.length > 0 && (
              <FilterSection label="Tags">
                {tags.map((t) => (
                  <CheckChip key={t} checked={filter.tags.includes(t)} onClick={() => onFilter({ ...filter, tags: toggle(filter.tags, t) })}>
                    {t}
                  </CheckChip>
                ))}
              </FilterSection>
            )}
          </div>
        )}
      </Popover>
    </div>
  );
}

function FilterSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-2)]">{label}</div>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function CheckChip({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
        checked ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)]",
      )}
    >
      {checked && <Check size={10} />}
      {children}
    </button>
  );
}
