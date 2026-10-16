"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Avatar, Button } from "@/components/ui/primitives";
import { relativeTime } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import type { Task, User } from "@/lib/types";

/** Threaded discussion on a task, with a composer. Any viewer can comment. */
export function TaskComments({ task, me }: { task: Task; me: User }) {
  const addTaskComment = useApp((s) => s.addTaskComment);
  const deleteTaskComment = useApp((s) => s.deleteTaskComment);
  const [draft, setDraft] = useState("");

  const comments = task.comments ?? [];
  const canModerate = me.accessLevel === "admin" || me.id === task.createdById;

  function submit() {
    if (!draft.trim()) return;
    addTaskComment(task.id, draft);
    setDraft("");
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {comments.length === 0 && <p className="text-sm text-[var(--muted-2)]">No comments yet. Start the conversation.</p>}
        {comments.map((c) => {
          const author = userById(c.authorId);
          const mine = c.authorId === me.id;
          return (
            <div key={c.id} className="group flex gap-2.5">
              <Avatar name={author?.name ?? "?"} size={28} src={author?.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{mine ? "You" : author?.name ?? "Unknown"}</span>
                  <span className="text-[11px] text-[var(--muted-2)]">{relativeTime(c.at)}</span>
                  {(mine || canModerate) && (
                    <button
                      onClick={() => deleteTaskComment(task.id, c.id)}
                      className="ml-auto rounded p-0.5 text-[var(--muted-2)] opacity-0 transition-opacity hover:text-[var(--danger)] group-hover:opacity-100"
                      aria-label="Delete comment"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-[var(--foreground)]">{c.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2.5 border-t border-[var(--border)] pt-3">
        <Avatar name={me.name} size={28} src={me.avatarUrl} />
        <div className="flex-1 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            rows={2}
            placeholder="Add a comment…  (⌘/Ctrl + Enter to send)"
            className="w-full resize-none rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
          />
          {draft.trim() && (
            <div className="flex justify-end">
              <Button size="sm" onClick={submit}>Comment</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
