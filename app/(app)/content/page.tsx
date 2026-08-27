"use client";

import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Card, Badge, Avatar } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ems/kit";
import { formatDate } from "@/lib/utils";
import type { ContentStatus } from "@/lib/types";

const statusColor: Record<ContentStatus, "slate" | "info" | "warning" | "success" | "purple"> = {
  idea: "slate",
  draft: "info",
  pending_approval: "warning",
  approved: "success",
  scheduled: "purple",
  published: "success",
};

export default function ContentPage() {
  const content = useApp((s) => s.content);
  const clients = useApp((s) => s.clients);

  const sorted = [...content].sort((a, b) => (a.scheduledAt < b.scheduledAt ? -1 : 1));
  const byClient = clients.map((c) => ({ client: c, posts: sorted.filter((p) => p.clientId === c.id) })).filter((g) => g.posts.length);

  return (
    <div className="space-y-5">
      <PageHeader title="Content Calendar" subtitle={`${content.length} posts scheduled`} />

      <div className="space-y-5">
        {byClient.map(({ client, posts }) => (
          <div key={client.id}>
            <h3 className="mb-2 text-sm font-semibold">{client.company}</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => {
                const owner = userById(p.ownerId);
                return (
                  <Card key={p.id} className="p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[var(--muted)]">{formatDate(p.scheduledAt)}</span>
                      <Badge color={statusColor[p.status]}>{p.status.replace("_", " ")}</Badge>
                    </div>
                    <div className="text-sm font-medium">{p.title}</div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--muted-2)]"><Avatar name={owner?.name ?? "?"} size={16} /> {p.channel}</div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
