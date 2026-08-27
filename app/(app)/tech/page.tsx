"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { Card, Badge, Avatar, ProgressBar, SectionTitle, Stat } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ems/kit";
import { projectStatusColor, projectStatusLabel } from "@/lib/ems";
import { Code2, GitCommit, ChevronRight, CheckSquare } from "lucide-react";

export default function TechDashboardPage() {
  const projects = useApp((s) => s.projects);
  const tasks = useApp((s) => s.tasks);
  const employees = useApp((s) => s.employees);

  const techProjects = projects.filter((p) => p.departmentId === "dept-tech");
  const techTasks = tasks.filter((t) => t.departmentId === "dept-tech");
  const team = employees.filter((u) => u.departmentId === "dept-tech");

  const active = techProjects.filter((p) => p.status === "active");
  const onHold = techProjects.filter((p) => p.status === "on_hold");
  const openTasks = techTasks.filter((t) => t.status !== "done");
  const avgProgress = techProjects.length ? Math.round(techProjects.reduce((s, p) => s + p.progress, 0) / techProjects.length) : 0;

  const recentCommits = useMemo(
    () =>
      techProjects
        .flatMap((p) => p.commits.map((c) => ({ ...c, project: p.name, projectId: p.id })))
        .sort((a, b) => (a.at < b.at ? 1 : -1))
        .slice(0, 6),
    [techProjects]
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Tech Dashboard" subtitle={`${techProjects.length} projects · ${team.length} engineers`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4"><Stat label="Active projects" value={active.length} sub={`${techProjects.length} total`} /></Card>
        <Card className="p-4"><Stat label="Avg. progress" value={`${avgProgress}%`} accent="var(--primary)" /></Card>
        <Card className="p-4"><Stat label="Open tasks" value={openTasks.length} sub={`${techTasks.length} total`} /></Card>
        <Card className="p-4"><Stat label="On hold" value={onHold.length} accent={onHold.length ? "var(--warning)" : undefined} /></Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionTitle action={<Link href="/projects" className="text-xs text-[var(--primary)] hover:underline">All projects</Link>}>
            <span className="flex items-center gap-1.5"><Code2 size={15} /> Projects</span>
          </SectionTitle>
          <div className="space-y-2">
            {techProjects.slice(0, 6).map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-2.5 hover:bg-[var(--surface-2)]">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="truncate text-xs text-[var(--muted)]">{p.clientCompany}</div>
                </div>
                <Badge color={projectStatusColor[p.status]} dot>{projectStatusLabel[p.status]}</Badge>
                <div className="w-24"><ProgressBar value={p.progress} /><div className="mt-0.5 text-right text-[10px] text-[var(--muted-2)]">{p.progress}%</div></div>
                <ChevronRight size={15} className="shrink-0 text-[var(--muted-2)]" />
              </Link>
            ))}
            {techProjects.length === 0 && <p className="text-xs text-[var(--muted)]">No projects yet.</p>}
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle><span className="flex items-center gap-1.5"><GitCommit size={15} /> Recent commits</span></SectionTitle>
          <div className="space-y-2">
            {recentCommits.map((c) => (
              <div key={c.sha} className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-xs">
                <div className="truncate font-medium">{c.message}</div>
                <div className="text-[11px] text-[var(--muted-2)]"><code>{c.sha}</code> · {c.project} · {c.authorName}</div>
              </div>
            ))}
            {recentCommits.length === 0 && <p className="text-xs text-[var(--muted)]">No commits recorded.</p>}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <SectionTitle><span className="flex items-center gap-1.5"><CheckSquare size={15} /> Team task load</span></SectionTitle>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {team.map((u) => {
            const mine = techTasks.filter((t) => t.assigneeId === u.id);
            const open = mine.filter((t) => t.status !== "done").length;
            return (
              <Link key={u.id} href={`/employees/${u.id}`} className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] p-2.5 hover:bg-[var(--surface-2)]">
                <Avatar name={u.name} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{u.name}</div>
                  <div className="text-[11px] text-[var(--muted-2)]">{u.designation}</div>
                </div>
                <Badge color={open > 4 ? "warning" : "slate"}>{open} open</Badge>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
