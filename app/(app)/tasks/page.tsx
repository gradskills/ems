"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Button } from "@/components/ui/primitives";
import { PageHeader, SegmentedControl } from "@/components/ems/kit";
import { TaskModal } from "@/components/ems/TaskModal";
import { TasksBoard } from "@/components/ems/TasksBoard";
import { TasksSheet } from "@/components/ems/TasksSheet";
import { taskAssignees, teammateIds, canEditTask } from "@/lib/ems";
import { Plus, LayoutGrid, Table2, Search } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/types";

type ViewMode = "board" | "sheet";

export default function TasksPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const employees = useApp((s) => s.employees);
  const tasks = useApp((s) => s.tasks);
  const me = userById(actingUserId)!;

  // Everyone gets both a "Mine" and a "Team" view now.
  const [scope, setScope] = useState<"mine" | "team">("mine");
  const [view, setView] = useState<ViewMode>("board");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | undefined>(undefined);
  const [newStatus, setNewStatus] = useState<TaskStatus>("todo");

  const teamIds = useMemo(() => teammateIds(me, employees), [me, employees]);
  const shown = useMemo(() => {
    const mine = (t: Task) => taskAssignees(t).includes(me.id) || t.createdById === me.id;
    const team = (t: Task) => taskAssignees(t).some((id) => teamIds.has(id)) || teamIds.has(t.createdById);
    const base = tasks.filter((t) => (scope === "mine" ? mine(t) : team(t)));
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        taskAssignees(t).some((id) => (userById(id)?.name ?? "").toLowerCase().includes(q))
    );
  }, [tasks, scope, query, teamIds, me.id]);

  function canEdit(t: Task) {
    return canEditTask(t, me, employees);
  }
  function openNew(status: TaskStatus = "todo") {
    setEditing(undefined);
    setNewStatus(status);
    setModalOpen(true);
  }
  function openEdit(t: Task) {
    setEditing(t);
    setModalOpen(true);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tasks"
        subtitle={`${shown.length} task${shown.length === 1 ? "" : "s"} · ${view === "board" ? "drag cards between columns" : "click any cell to edit"} — both views stay in sync`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks…"
                className="h-10 w-52 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] pl-8 pr-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
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
                { key: "sheet", label: "Sheet", icon: <Table2 size={14} /> },
              ]}
              value={view}
              onChange={setView}
            />
            <Button onClick={() => openNew()}><Plus size={16} /> New task</Button>
          </div>
        }
      />

      {view === "board" ? (
        <TasksBoard tasks={shown} scope={scope} canEdit={canEdit} onEdit={openEdit} onNew={openNew} />
      ) : (
        <TasksSheet tasks={shown} me={me} canEdit={canEdit} onEdit={openEdit} />
      )}

      {/* key remounts the create-modal when the target column changes so defaults reset */}
      <TaskModal
        key={editing ? editing.id : `new-${newStatus}`}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        task={editing}
        defaultStatus={newStatus}
      />
    </div>
  );
}
