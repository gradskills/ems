"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Button } from "@/components/ui/primitives";
import { PageHeader, SegmentedControl } from "@/components/ems/kit";
import { TaskModal } from "@/components/ems/TaskModal";
import { TasksBoard } from "@/components/ems/TasksBoard";
import { TasksSheet } from "@/components/ems/TasksSheet";
import { TasksList } from "@/components/ems/tasks/TasksList";
import { TasksCalendar } from "@/components/ems/tasks/TasksCalendar";
import { TaskDetail } from "@/components/ems/tasks/TaskDetail";
import { TaskToolbar } from "@/components/ems/tasks/TaskToolbar";
import { taskAssignees, teammateIds, canEditTask, visibleEmployees } from "@/lib/ems";
import { applyFilter, allTags, emptyFilter, type GroupBy, type SortKey, type TaskFilter } from "@/lib/tasks";
import { Plus, LayoutGrid, Table2, List as ListIcon, CalendarDays, Search } from "lucide-react";
import type { Task, TaskStatus, TaskPriority } from "@/lib/types";

type ViewMode = "board" | "table" | "list" | "calendar";

export default function TasksPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const employees = useApp((s) => s.employees);
  const tasks = useApp((s) => s.tasks);
  const projects = useApp((s) => s.projects);
  const createTask = useApp((s) => s.createTask);
  const me = userById(actingUserId)!;

  const [scope, setScope] = useState<"mine" | "team">("mine");
  const [view, setView] = useState<ViewMode>("board");
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "manual", dir: 1 });
  const [filter, setFilter] = useState<TaskFilter>(emptyFilter);

  const [modalOpen, setModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<TaskStatus>("todo");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const teamIds = useMemo(() => teammateIds(me, employees), [me, employees]);

  // scope → search → filter
  const scopeBase = useMemo(() => {
    const mine = (t: Task) => taskAssignees(t).includes(me.id) || t.createdById === me.id;
    const team = (t: Task) => taskAssignees(t).some((id) => teamIds.has(id)) || teamIds.has(t.createdById);
    return tasks.filter((t) => (scope === "mine" ? mine(t) : team(t)));
  }, [tasks, scope, teamIds, me.id]);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scopeBase;
    return scopeBase.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q)) ||
        taskAssignees(t).some((id) => (userById(id)?.name ?? "").toLowerCase().includes(q)),
    );
  }, [scopeBase, query]);

  const shown = useMemo(() => applyFilter(searched, filter), [searched, filter]);
  const tagList = useMemo(() => allTags(scopeBase), [scopeBase]);
  const filterEmployees = useMemo(() => visibleEmployees(me, employees), [me, employees]);

  const canEdit = (t: Task) => canEditTask(t, me, employees);

  function openNew(status: TaskStatus = "todo") {
    setNewStatus(status);
    setModalOpen(true);
  }

  // Board / list inline quick-add: new task adopts the group it was added under.
  function quickAdd(gb: GroupBy, groupKey: string, title: string) {
    const base: Parameters<typeof createTask>[0] = {
      title,
      assigneeIds: [me.id],
      departmentId: me.departmentId,
      priority: "medium",
      status: "todo",
    };
    if (gb === "status") base.status = groupKey as TaskStatus;
    else if (gb === "priority") base.priority = groupKey as TaskPriority;
    else if (gb === "project" && groupKey !== "__none") base.projectId = groupKey;
    else if (gb === "assignee" && groupKey !== "__none" && me.accessLevel !== "employee") {
      base.assigneeIds = [groupKey];
      base.departmentId = userById(groupKey)?.departmentId ?? me.departmentId;
    }
    createTask(base);
  }

  // Calendar "+" on a day: create a stub with that due date, then open its peek.
  function addOnDay(dateISO: string) {
    const id = createTask({ title: "Untitled task", assigneeIds: [me.id], departmentId: me.departmentId, priority: "medium", status: "todo", dueAt: dateISO });
    setDetailId(id);
  }

  const subtitle =
    view === "board" ? "Drag cards between columns · click a card to open it"
    : view === "table" ? "Click a cell to edit inline, or open any task"
    : view === "list" ? "Grouped list · click to open"
    : "Tasks on their due dates";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tasks"
        subtitle={`${shown.length} task${shown.length === 1 ? "" : "s"} · ${subtitle}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks…"
                className="h-10 w-48 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] pl-8 pr-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <SegmentedControl
              items={[
                { key: "mine", label: "Mine" },
                { key: "team", label: "Team" },
              ]}
              value={scope}
              onChange={setScope}
            />
            <SegmentedControl
              items={[
                { key: "board", label: "Board", icon: <LayoutGrid size={14} /> },
                { key: "table", label: "Table", icon: <Table2 size={14} /> },
                { key: "list", label: "List", icon: <ListIcon size={14} /> },
                { key: "calendar", label: "Calendar", icon: <CalendarDays size={14} /> },
              ]}
              value={view}
              onChange={setView}
            />
            <Button onClick={() => openNew()}><Plus size={16} /> New task</Button>
          </div>
        }
      />

      <TaskToolbar
        groupBy={groupBy}
        onGroupBy={setGroupBy}
        sort={sort}
        onSort={setSort}
        filter={filter}
        onFilter={setFilter}
        employees={filterEmployees}
        projects={projects}
        tags={tagList}
        hideGroup={view === "table" || view === "calendar"}
        hideSort={view === "table" || view === "calendar"}
      />

      {view === "board" && (
        <TasksBoard tasks={shown} groupBy={groupBy} sort={sort} canEdit={canEdit} onOpen={(t) => setDetailId(t.id)} onQuickAdd={quickAdd} />
      )}
      {view === "table" && (
        <TasksSheet tasks={shown} me={me} canEdit={canEdit} onOpen={(t) => setDetailId(t.id)} />
      )}
      {view === "list" && (
        <TasksList tasks={shown} groupBy={groupBy} sort={sort} canEdit={canEdit} onOpen={(t) => setDetailId(t.id)} />
      )}
      {view === "calendar" && (
        <TasksCalendar tasks={shown} onOpen={(t) => setDetailId(t.id)} onDayAdd={addOnDay} />
      )}

      <TaskModal key={`new-${newStatus}`} open={modalOpen} onClose={() => setModalOpen(false)} defaultStatus={newStatus} />

      {editTask && <TaskModal key={editTask.id} open task={editTask} onClose={() => setEditTask(null)} />}

      <TaskDetail taskId={detailId} onClose={() => setDetailId(null)} onEdit={(t) => { setDetailId(null); setEditTask(t); }} />
    </div>
  );
}
