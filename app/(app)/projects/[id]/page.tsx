"use client";

import { useState } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { departmentById } from "@/lib/seed/org";
import { Card, Badge, Avatar, ProgressBar, Stat } from "@/components/ui/primitives";
import { Tabs, InfoRow } from "@/components/ems/kit";
import { projectStatusColor, projectStatusLabel, priorityColor, taskStatusColor, taskStatusLabel, roleLabel } from "@/lib/ems";
import { formatDate, relativeTime } from "@/lib/utils";
import { ChevronLeft, ExternalLink, GitCommit, GitBranch, Plus, Minus, Building2, Mail, Pencil, ListPlus } from "lucide-react";
import { EditProjectModal } from "@/components/tech/EditProjectModal";
import { AddTaskModal } from "@/components/tech/AddTaskModal";

type Tab = "overview" | "git" | "tasks" | "team";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projects = useApp((s) => s.projects);
  const tasks = useApp((s) => s.tasks);
  const actingUserId = useApp((s) => s.actingUserId);
  const [tab, setTab] = useState<Tab>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const p = projects.find((x) => x.id === params.id);
  if (!p) return notFound();

  const me = userById(actingUserId);
  const canEdit = me?.accessLevel === "admin" || me?.accessLevel === "manager";

  const manager = p.managerId ? userById(p.managerId) : undefined;
  const projTasks = tasks.filter((t) => t.projectId === p.id);
  const sortedCommits = [...p.commits].sort((a, b) => (a.at < b.at ? 1 : -1));

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "git", label: "Git history", count: p.commits.length },
    { key: "tasks", label: "Tasks", count: projTasks.length },
    { key: "team", label: "Team", count: p.memberIds.length },
  ];

  return (
    <div className="space-y-5">
      <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"><ChevronLeft size={16} /> All projects</Link>

      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{p.name}</h1>
              <Badge color={projectStatusColor[p.status]} dot>{projectStatusLabel[p.status]}</Badge>
              <Badge color={priorityColor[p.priority]}>{p.priority}</Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{p.description}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--border)]"><ExternalLink size={12} /> Live preview</a>}
              {p.repoUrl && <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium"><GitBranch size={12} /> {p.repoUrl}</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex flex-wrap gap-2">
              {(canEdit) && (
                <button onClick={() => setEditOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--surface-2)]"><Pencil size={13} /> Edit project</button>
              )}
              <button onClick={() => setAddTaskOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--primary-hover)]"><ListPlus size={13} /> Add task</button>
            </div>
            <div className="w-48">
              <div className="mb-1 flex justify-between text-xs"><span className="text-[var(--muted)]">Progress</span><span className="font-semibold">{p.progress}%</span></div>
              <ProgressBar value={p.progress} />
            </div>
          </div>
        </div>
      </Card>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h3 className="mb-2 text-sm font-semibold">Project details</h3>
            <InfoRow label="Client">{p.clientCompany}</InfoRow>
            <InfoRow label="Status"><Badge color={projectStatusColor[p.status]}>{projectStatusLabel[p.status]}</Badge></InfoRow>
            <InfoRow label="Priority"><Badge color={priorityColor[p.priority]}>{p.priority}</Badge></InfoRow>
            <InfoRow label="Lead">{manager?.name ?? "—"}</InfoRow>
            <InfoRow label="Started">{formatDate(p.startedAt)}</InfoRow>
            {p.dueAt && <InfoRow label="Due">{formatDate(p.dueAt)}</InfoRow>}
            <div className="mt-3">
              <div className="mb-1 text-xs font-medium text-[var(--muted)]">Tech stack</div>
              <div className="flex flex-wrap gap-1.5">{p.techStack.map((t) => <Badge key={t} color="info">{t}</Badge>)}</div>
            </div>
          </Card>
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Building2 size={15} /> Client</h3>
              <InfoRow label="Company">{p.clientCompany}</InfoRow>
              {p.clientContact && <InfoRow label="Contact">{p.clientContact}</InfoRow>}
              {p.clientEmail && <InfoRow label="Email"><span className="inline-flex items-center gap-1"><Mail size={12} /> {p.clientEmail}</span></InfoRow>}
              {p.leadId && <InfoRow label="Origin"><Link href={`/leads/${p.leadId}`} className="text-[var(--primary)]">View lead →</Link></InfoRow>}
            </Card>
            <Card className="p-5">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Commits" value={p.commits.length} />
                <Stat label="Open tasks" value={projTasks.filter((t) => t.status !== "done").length} />
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "git" && (
        <Card className="overflow-hidden">
          <div className="divide-y divide-[var(--border)]">
            {sortedCommits.map((c) => (
              <div key={c.sha} className="flex items-start gap-3 p-4">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)]"><GitCommit size={15} className="text-[var(--muted)]" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{c.message}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted-2)]">
                    <span className="font-mono">{c.sha}</span>
                    <span className="inline-flex items-center gap-0.5"><GitBranch size={11} /> {c.branch}</span>
                    <span>{c.authorName}</span>
                    <span>{relativeTime(c.at)}</span>
                    <span className="inline-flex items-center gap-0.5 text-[var(--success)]"><Plus size={11} />{c.additions}</span>
                    <span className="inline-flex items-center gap-0.5 text-[var(--danger)]"><Minus size={11} />{c.deletions}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "tasks" && (
        <Card className="overflow-hidden">
          {projTasks.length === 0 ? <div className="py-12 text-center text-sm text-[var(--muted)]">No tasks linked to this project.</div> : (
            <div className="divide-y divide-[var(--border)]">
              {projTasks.map((t) => {
                const a = userById(t.assigneeId);
                return (
                  <div key={t.id} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1"><div className="text-sm font-medium">{t.title}</div></div>
                    <Badge color={priorityColor[t.priority]}>{t.priority}</Badge>
                    <Badge color={taskStatusColor[t.status]} dot>{taskStatusLabel[t.status]}</Badge>
                    {a && <Avatar name={a.name} size={26} />}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {tab === "team" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...(p.managerId ? [p.managerId] : []), ...p.memberIds].map((id) => {
            const u = userById(id);
            if (!u) return null;
            return (
              <Link key={id} href={`/employees/${id}`}>
                <Card className="lift flex items-center gap-3 p-4">
                  <Avatar name={u.name} size={40} />
                  <div>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-[var(--muted)]">{id === p.managerId ? "Project lead" : roleLabel(u, departmentById(u.departmentId))}</div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <EditProjectModal project={p} open={editOpen} onClose={() => setEditOpen(false)} />
      <AddTaskModal projectId={p.id} open={addTaskOpen} onClose={() => setAddTaskOpen(false)} />
    </div>
  );
}
