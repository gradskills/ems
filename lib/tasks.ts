// ─────────────────────────────────────────────────────────────
// Notion-style task view logic: tag colours, grouping, filtering,
// sorting and sub-task progress. Pure helpers — no React, no store —
// so the board / table / list / calendar views all share one brain.
// ─────────────────────────────────────────────────────────────
import type { Task, TaskStatus, TaskPriority, Project } from "@/lib/types";
import { taskColumns, taskStatusLabel, taskStatusColor, priorityColor, taskAssignees } from "@/lib/ems";
import { userById } from "@/lib/seed/users";

export type TaskBadgeColor = "slate" | "primary" | "success" | "warning" | "danger" | "info" | "purple";

// ── tags ───────────────────────────────────────────────────────
const TAG_PALETTE: TaskBadgeColor[] = ["primary", "success", "warning", "danger", "info", "purple", "slate"];

/** Deterministic colour for a tag label, stable across renders/sessions. */
export function tagColor(tag: string): TaskBadgeColor {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length];
}

/** Every distinct tag used across a set of tasks, alphabetised. */
export function allTags(tasks: Task[]): string[] {
  const set = new Set<string>();
  for (const t of tasks) for (const tag of t.tags ?? []) set.add(tag);
  return [...set].sort((a, b) => a.localeCompare(b));
}

// ── sub-tasks ──────────────────────────────────────────────────
export function subtaskProgress(t: Task): { done: number; total: number; pct: number } {
  const subs = t.subtasks ?? [];
  const total = subs.length;
  const done = subs.filter((s) => s.done).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

// ── priority meta ──────────────────────────────────────────────
export const priorityLabel: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};
// smaller = more urgent (used by sort / priority grouping order)
export const priorityRank: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const priorityOrder: TaskPriority[] = ["urgent", "high", "medium", "low"];

// ── grouping ───────────────────────────────────────────────────
export type GroupBy = "status" | "priority" | "assignee" | "project" | "none";

export const groupByLabel: Record<GroupBy, string> = {
  status: "Status",
  priority: "Priority",
  assignee: "Assignee",
  project: "Project",
  none: "None",
};

export interface TaskGroup {
  key: string; // stable id used for drag targets
  label: string;
  color?: TaskBadgeColor;
  avatarName?: string; // assignee groups render an avatar instead of a dot
  tasks: Task[];
}

/** Break a flat task list into ordered groups for the board / list views. */
export function groupTasks(
  tasks: Task[],
  groupBy: GroupBy,
  ctx: { projects: Project[] },
): TaskGroup[] {
  if (groupBy === "none") {
    return [{ key: "all", label: "All tasks", tasks }];
  }

  if (groupBy === "status") {
    return taskColumns.map((s) => ({
      key: s,
      label: taskStatusLabel[s],
      color: taskStatusColor[s],
      tasks: tasks.filter((t) => t.status === s),
    }));
  }

  if (groupBy === "priority") {
    return priorityOrder.map((p) => ({
      key: p,
      label: priorityLabel[p],
      color: priorityColor[p],
      tasks: tasks.filter((t) => t.priority === p),
    }));
  }

  if (groupBy === "project") {
    const groups: TaskGroup[] = ctx.projects.map((p) => ({
      key: p.id,
      label: p.name,
      color: "info" as TaskBadgeColor,
      tasks: tasks.filter((t) => t.projectId === p.id),
    }));
    groups.push({ key: "__none", label: "No project", color: "slate", tasks: tasks.filter((t) => !t.projectId) });
    return groups.filter((g) => g.tasks.length > 0 || g.key === "__none");
  }

  // assignee — grouped by the primary (first) assignee
  const byUser = new Map<string, Task[]>();
  for (const t of tasks) {
    const primary = taskAssignees(t)[0] ?? "__none";
    const list = byUser.get(primary) ?? [];
    list.push(t);
    byUser.set(primary, list);
  }
  const groups: TaskGroup[] = [...byUser.entries()].map(([uid, list]) => {
    const u = userById(uid);
    return { key: uid, label: u?.name ?? "Unassigned", avatarName: u?.name, tasks: list };
  });
  groups.sort((a, b) => a.label.localeCompare(b.label));
  return groups;
}

/**
 * The patch a card adopts when dropped into a board group. `null` means the
 * group field can't be set by dragging (e.g. the "no assignee" bucket). Status
 * groups are applied via `moveTask` by the caller; everything else via patch.
 */
export function dropPatch(groupBy: GroupBy, groupKey: string): Partial<Task> | null {
  switch (groupBy) {
    case "status":
      return { status: groupKey as TaskStatus };
    case "priority":
      return { priority: groupKey as TaskPriority };
    case "project":
      return { projectId: groupKey === "__none" ? undefined : groupKey };
    case "assignee":
      return groupKey === "__none" ? null : { assigneeIds: [groupKey], assigneeId: groupKey };
    default:
      return null;
  }
}

// ── filtering ──────────────────────────────────────────────────
export type DueFilter = "any" | "overdue" | "today" | "week" | "none";

export interface TaskFilter {
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  assignees: string[];
  tags: string[];
  projects: string[];
  due: DueFilter;
}

export const emptyFilter: TaskFilter = {
  statuses: [],
  priorities: [],
  assignees: [],
  tags: [],
  projects: [],
  due: "any",
};

/** How many filter conditions are active — drives the toolbar badge. */
export function filterActiveCount(f: TaskFilter): number {
  return (
    f.statuses.length +
    f.priorities.length +
    f.assignees.length +
    f.tags.length +
    f.projects.length +
    (f.due !== "any" ? 1 : 0)
  );
}

function dueMatches(t: Task, due: DueFilter): boolean {
  if (due === "any") return true;
  if (due === "none") return !t.dueAt;
  if (!t.dueAt) return false;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 86_400_000;
  const d = Date.parse(t.dueAt);
  if (due === "overdue") return d < now.getTime() && t.status !== "done";
  if (due === "today") return d >= todayStart && d < todayEnd;
  if (due === "week") return d >= todayStart && d < todayStart + 7 * 86_400_000;
  return true;
}

/** Apply every active filter condition (AND across fields, OR within a field). */
export function applyFilter(tasks: Task[], f: TaskFilter): Task[] {
  return tasks.filter((t) => {
    if (f.statuses.length && !f.statuses.includes(t.status)) return false;
    if (f.priorities.length && !f.priorities.includes(t.priority)) return false;
    if (f.assignees.length && !taskAssignees(t).some((id) => f.assignees.includes(id))) return false;
    if (f.tags.length && !(t.tags ?? []).some((tag) => f.tags.includes(tag))) return false;
    if (f.projects.length && !f.projects.includes(t.projectId ?? "__none")) return false;
    if (!dueMatches(t, f.due)) return false;
    return true;
  });
}

// ── sorting ────────────────────────────────────────────────────
export type SortKey = "manual" | "title" | "priority" | "dueAt" | "created" | "updated";

export const sortLabel: Record<SortKey, string> = {
  manual: "Manual",
  title: "Name",
  priority: "Priority",
  dueAt: "Due date",
  created: "Created",
  updated: "Last edited",
};

/** Stable sort for a group's tasks. `manual` honours drag-ordered orderIndex. */
export function sortTasks(tasks: Task[], key: SortKey, dir: 1 | -1 = 1): Task[] {
  const val = (t: Task): number | string => {
    switch (key) {
      case "title":
        return t.title.toLowerCase();
      case "priority":
        return priorityRank[t.priority];
      case "dueAt":
        return t.dueAt ? Date.parse(t.dueAt) : Number.MAX_SAFE_INTEGER;
      case "created":
        return t.createdAt ? Date.parse(t.createdAt) : 0;
      case "updated":
        return Date.parse(t.updatedAt ?? t.createdAt ?? "") || 0;
      case "manual":
        return t.orderIndex ?? Number.MAX_SAFE_INTEGER;
    }
  };
  return [...tasks].sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    if (va === vb) {
      // manual ties fall back to newest-first so fresh tasks surface at the top
      if (key === "manual") return Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "");
      return 0;
    }
    return va < vb ? -dir : dir;
  });
}
