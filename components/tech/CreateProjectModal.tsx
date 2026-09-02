"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp, type NewProjectInput } from "@/lib/store";
import { Modal, Field, Input, Textarea } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import { projectStatusLabel } from "@/lib/ems";
import type { ProjectStatus, TaskPriority } from "@/lib/types";

const statuses: ProjectStatus[] = ["planning", "active", "on_hold", "completed", "cancelled"];
const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];

export function CreateProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addProject = useApp((s) => s.addProject);
  const employees = useApp((s) => s.employees);
  const router = useRouter();

  const [f, setF] = useState<NewProjectInput>({
    name: "",
    description: "",
    clientCompany: "",
    clientContact: "",
    clientEmail: "",
    status: "planning",
    priority: "medium",
    departmentId: "dept-tech",
    managerId: "",
    memberIds: [],
    repoUrl: "",
    link: "",
    dueAt: "",
    techStack: [],
  });

  const [stack, setStack] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // eligible leaders: managers + admins (people who can be a project manager)
  const leaders = useMemo(
    () => employees.filter((e) => e.status !== "inactive" && (e.accessLevel === "admin" || e.accessLevel === "manager")),
    [employees]
  );
  // assignable team members: any active employee
  const members = useMemo(() => employees.filter((e) => e.status !== "inactive"), [employees]);

  const set = (patch: Partial<NewProjectInput>) => setF((prev) => ({ ...prev, ...patch }));

  function toggleMember(id: string) {
    set({ memberIds: f.memberIds.includes(id) ? f.memberIds.filter((x) => x !== id) : [...f.memberIds, id] });
  }

  function addStack() {
    const t = stack.trim();
    if (!t) return;
    set({ techStack: [...f.techStack, t] });
    setStack("");
  }

  const valid =
    f.name.trim() && f.clientCompany.trim() && f.managerId && f.memberIds.length > 0;

  function save() {
    const next: Record<string, boolean> = {};
    if (!f.name.trim()) next.name = true;
    if (!f.clientCompany.trim()) next.clientCompany = true;
    if (!f.managerId) next.managerId = true;
    if (f.memberIds.length === 0) next.memberIds = true;
    setErrors(next);
    if (Object.keys(next).length) return;
    const id = addProject({ ...f, techStack: f.techStack });
    onClose();
    router.push(`/projects/${id}`);
  }

  const errCls = (k: string) => (errors[k] ? "border-[var(--danger)]" : "");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create new project"
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid} onClick={save} className={errCls("")}>Create project</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Project name *"><Input value={f.name} onChange={(e) => { set({ name: e.target.value }); setErrors((p) => ({ ...p, name: false })); }} placeholder="Acme — E-commerce Store" autoFocus className={errCls("name")} /></Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Description"><Textarea value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="What this project is, scope, goals…" rows={2} /></Field>
        </div>
        <Field label="Client company *"><Input value={f.clientCompany} onChange={(e) => { set({ clientCompany: e.target.value }); setErrors((p) => ({ ...p, clientCompany: false })); }} placeholder="Acme Ltd." className={errCls("clientCompany")} /></Field>
        <Field label="Client contact"><Input value={f.clientContact} onChange={(e) => set({ clientContact: e.target.value })} placeholder="Rakesh Sharma" /></Field>
        <Field label="Client email"><Input type="email" value={f.clientEmail} onChange={(e) => set({ clientEmail: e.target.value })} placeholder="rakesh@acme.in" /></Field>
        <Field label="Status">
          <select value={f.status} onChange={(e) => set({ status: e.target.value as ProjectStatus })} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
            {statuses.map((s) => <option key={s} value={s}>{projectStatusLabel[s]}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select value={f.priority} onChange={(e) => set({ priority: e.target.value as TaskPriority })} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
            {priorities.map((p) => (
              <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </Field>
        <Field label="Due date"><Input type="date" value={f.dueAt ?? ""} onChange={(e) => set({ dueAt: e.target.value || undefined })} /></Field>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Project manager / lead *" hint="Manager or admin responsible for this project.">
          <select value={f.managerId ?? ""} onChange={(e) => { set({ managerId: e.target.value }); setErrors((p) => ({ ...p, managerId: false })); }} className={`h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm ${errCls("managerId")}`}>
            <option value="">Select a manager…</option>
            {leaders.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.accessLevel})</option>)}
          </select>
        </Field>
        <Field label="Git / repo URL" hint="Link to check status of the code."><Input value={f.repoUrl} onChange={(e) => set({ repoUrl: e.target.value })} placeholder="github.com/pixelforge/acme" /></Field>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Live preview URL"><Input value={f.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://staging.acme.in" /></Field>
        <Field label="Tech stack">
          <div className="flex gap-2">
            <Input value={stack} onChange={(e) => setStack(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addStack(); } }} placeholder="Next.js" />
            <Button type="button" variant="outline" onClick={addStack}>Add</Button>
          </div>
        </Field>
      </div>
      {f.techStack.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {f.techStack.map((t) => (
            <button type="button" key={t} onClick={() => set({ techStack: f.techStack.filter((x) => x !== t) })} className="rounded-full bg-[var(--info-soft)] px-2.5 py-1 text-xs font-medium text-[var(--info)] hover:brightness-95">
              {t} ×
            </button>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Field label={`Team members * (${f.memberIds.length} selected)`}>
          <div className={`grid max-h-44 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2 ${errors.memberIds ? "border-[var(--danger)]" : "border-[var(--border-strong)]"}`}>
            {members.length === 0 && <div className="px-2 py-1 text-sm text-[var(--muted-2)]">No active employees found.</div>}
            {members.map((u) => {
              const on = f.memberIds.includes(u.id);
              return (
                <label key={u.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${on ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border)] hover:bg-[var(--surface-2)]"}`}>
                  <input type="checkbox" checked={on} onChange={() => toggleMember(u.id)} className="accent-[var(--primary)]" />
                  <span className="min-w-0 flex-1 truncate">{u.name}</span>
                  {u.id === f.managerId && <span className="text-[10px] uppercase text-[var(--muted-2)]">lead</span>}
                </label>
              );
            })}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
