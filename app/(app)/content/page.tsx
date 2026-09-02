"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Card, Badge, Avatar } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ems/kit";
import { formatDate } from "@/lib/utils";
import { Plus, Pencil, ExternalLink, GitBranch, ChevronRight } from "lucide-react";
import type { ContentPost, ContentStatus } from "@/lib/types";
import { PostModal } from "@/components/media/PostModal";

const statusColor: Record<ContentStatus, "slate" | "info" | "warning" | "success" | "purple"> = {
  idea: "slate",
  draft: "info",
  pending_approval: "warning",
  approved: "success",
  scheduled: "purple",
  published: "success",
};

// the intended pipeline order for a post
const flow: ContentStatus[] = ["idea", "draft", "pending_approval", "approved", "scheduled", "published"];

export default function ContentPage() {
  const content = useApp((s) => s.content);
  const clients = useApp((s) => s.clients);
  const actingUserId = useApp((s) => s.actingUserId);
  const moveContent = useApp((s) => s.moveContent);
  const [editing, setEditing] = useState<ContentPost | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // post cards and status actions are for everyone reading; only managers/admins manage
  const me = userById(actingUserId);
  const canManage = me?.accessLevel === "admin" || me?.accessLevel === "manager";

  const sorted = [...content].sort((a, b) => (a.scheduledAt < b.scheduledAt ? -1 : 1));
  const byClient = clients.map((c) => ({ client: c, posts: sorted.filter((p) => p.clientId === c.id) })).filter((g) => g.posts.length);

  const nextStatus = (s: ContentStatus): ContentStatus | undefined => flow[flow.indexOf(s) + 1];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Content Calendar" subtitle={`${content.length} posts`} />
        {canManage && (
          <button onClick={() => setCreateOpen(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3.5 py-2 text-sm font-medium text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]">
            <Plus size={16} /> New post
          </button>
        )}
      </div>

      <div className="space-y-5">
        {byClient.length === 0 && <Card className="py-12 text-center text-sm text-[var(--muted)]">No posts yet.</Card>}
        {byClient.map(({ client, posts }) => (
          <div key={client.id}>
            <h3 className="mb-2 text-sm font-semibold">{client.company}</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => {
                const owner = userById(p.ownerId);
                const next = nextStatus(p.status);
                return (
                  <Card key={p.id} className="flex flex-col p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[var(--muted)]">{formatDate(p.scheduledAt)}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge color={statusColor[p.status]}>{p.status.replace("_", " ")}</Badge>
                        {canManage && (
                          <button onClick={() => setEditing(p)} className="rounded p-0.5 text-[var(--muted-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]" title="Edit post">
                            <Pencil size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 text-sm font-medium">{p.title}</div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--muted-2)]"><Avatar name={owner?.name ?? "?"} size={16} /> {p.channel}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {p.checkUrl && <a href={p.checkUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-2)] px-2 py-1 text-[11px] font-medium hover:bg-[var(--border)]"><GitBranch size={12} /> Check</a>}
                      {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-2)] px-2 py-1 text-[11px] font-medium hover:bg-[var(--border)]"><ExternalLink size={12} /> Live</a>}
                      {next && p.status !== "published" && canManage && (
                        <button onClick={() => moveContent(p.id, next)} className="ml-auto inline-flex items-center gap-1 rounded-md bg-[var(--surface-2)] px-2 py-1 text-[11px] font-medium hover:bg-[var(--border)]">
                          {next.replace("_", " ")} <ChevronRight size={12} />
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <PostModal post={null} open={createOpen} onClose={() => setCreateOpen(false)} />
      <PostModal key={editing?.id ?? "none"} post={editing} open={!!editing} onClose={() => setEditing(null)} />
    </div>
  );
}
