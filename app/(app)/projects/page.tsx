"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Card, Badge, Avatar, ProgressBar } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ems/kit";
import { projectStatusColor, projectStatusLabel, priorityColor } from "@/lib/ems";
import { formatDate } from "@/lib/utils";
import { GitBranch } from "lucide-react";
import type { ProjectStatus } from "@/lib/types";

export default function ProjectsPage() {
  const projects = useApp((s) => s.projects);
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");

  const shown = filter === "all" ? projects : projects.filter((p) => p.status === filter);
  const active = projects.filter((p) => p.status === "active").length;
  const filters: (ProjectStatus | "all")[] = ["all", "active", "planning", "on_hold", "completed"];

  return (
    <div className="space-y-5">
      <PageHeader title="Projects" subtitle={`${active} active · ${projects.length} total`} />

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize ${filter === f ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)] hover:bg-[var(--border)]"}`}>
            {f === "all" ? "All" : projectStatusLabel[f as ProjectStatus]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {shown.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`}>
            <Card className="lift h-full p-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="text-xs text-[var(--muted)]">{p.clientCompany}</div>
                </div>
                <Badge color={projectStatusColor[p.status]} dot>{projectStatusLabel[p.status]}</Badge>
              </div>
              <p className="mb-3 line-clamp-2 text-sm text-[var(--muted)]">{p.description}</p>
              <div className="mb-3 flex items-center gap-2">
                <ProgressBar value={p.progress} className="flex-1" />
                <span className="text-xs font-medium">{p.progress}%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {p.memberIds.map((id) => { const u = userById(id); return <div key={id} className="rounded-full ring-2 ring-[var(--surface)]"><Avatar name={u?.name ?? "?"} size={26} /></div>; })}
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={priorityColor[p.priority]}>{p.priority}</Badge>
                  <span className="flex items-center gap-1 text-[11px] text-[var(--muted-2)]"><GitBranch size={12} /> {p.commits.length}</span>
                </div>
              </div>
              {p.dueAt && <div className="mt-2 text-[11px] text-[var(--muted-2)]">Due {formatDate(p.dueAt)}</div>}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
