"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { subtaskProgress } from "@/lib/tasks";
import { ProgressBar } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { Check, Plus, X } from "lucide-react";
import type { Task } from "@/lib/types";

/** Notion-style nested checklist with a progress bar, inline rename and add. */
export function TaskChecklist({ task, editable }: { task: Task; editable: boolean }) {
  const addSubtask = useApp((s) => s.addSubtask);
  const toggleSubtask = useApp((s) => s.toggleSubtask);
  const renameSubtask = useApp((s) => s.renameSubtask);
  const deleteSubtask = useApp((s) => s.deleteSubtask);

  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const subs = task.subtasks ?? [];
  const { done, total, pct } = subtaskProgress(task);

  function commitAdd() {
    if (draft.trim()) addSubtask(task.id, draft);
    setDraft("");
  }
  function commitRename(id: string) {
    if (editDraft.trim()) renameSubtask(task.id, id, editDraft.trim());
    setEditingId(null);
  }

  return (
    <div className="space-y-2">
      {total > 0 && (
        <div className="flex items-center gap-2">
          <ProgressBar value={done} max={total} className="h-1.5 flex-1" color={pct === 100 ? "var(--success)" : "var(--primary)"} />
          <span className="shrink-0 text-xs font-medium text-[var(--muted)]">{done}/{total}</span>
        </div>
      )}

      <div className="space-y-0.5">
        {subs.map((st) => (
          <div key={st.id} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-[var(--surface-2)]">
            <button
              type="button"
              disabled={!editable}
              onClick={() => toggleSubtask(task.id, st.id)}
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                st.done ? "border-[var(--success)] bg-[var(--success)] text-white" : "border-[var(--border-strong)] hover:border-[var(--primary)]",
                !editable && "cursor-default opacity-70",
              )}
              aria-label={st.done ? "Mark incomplete" : "Mark complete"}
            >
              {st.done && <Check size={11} />}
            </button>

            {editingId === st.id ? (
              <input
                autoFocus
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                onBlur={() => commitRename(st.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(st.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="h-6 flex-1 rounded border border-[var(--primary)] bg-[var(--surface)] px-1.5 text-sm outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!editable) return;
                  setEditingId(st.id);
                  setEditDraft(st.title);
                }}
                className={cn("flex-1 truncate text-left text-sm", st.done && "text-[var(--muted-2)] line-through", editable ? "cursor-text" : "cursor-default")}
              >
                {st.title}
              </button>
            )}

            {editable && (
              <button
                type="button"
                onClick={() => deleteSubtask(task.id, st.id)}
                className="shrink-0 rounded p-0.5 text-[var(--muted-2)] opacity-0 transition-opacity hover:text-[var(--danger)] group-hover:opacity-100"
                aria-label="Delete sub-task"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {editable && (
        <div className="flex items-center gap-2 rounded-md px-1">
          <Plus size={14} className="shrink-0 text-[var(--muted-2)]" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commitAdd()}
            onBlur={commitAdd}
            placeholder="Add a sub-task…"
            className="h-7 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted-2)]"
          />
        </div>
      )}

      {total === 0 && !editable && <p className="text-sm text-[var(--muted-2)]">No sub-tasks.</p>}
    </div>
  );
}
