"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { WORKSPACE_MODULES, DEFAULT_WORKSPACE_ID } from "@/lib/workspace";
import { APP_ICON_NAMES, appIconComponent } from "@/lib/branding";
import { Card, Button, SectionTitle, Badge } from "@/components/ui/primitives";
import type { Workspace, WorkspaceModule } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check, Plus, Pencil, LogIn, Trash2 } from "lucide-react";

export default function WorkspacesPage() {
  const router = useRouter();
  const actingUserId = useApp((s) => s.actingUserId);
  const authReady = useApp((s) => s.authReady);
  const workspaces = useApp((s) => s.workspaces);
  const activeWorkspaceId = useApp((s) => s.activeWorkspaceId);
  const switchWorkspace = useApp((s) => s.switchWorkspace);
  const archiveWs = useApp((s) => s.archiveWorkspace);
  const user = userById(actingUserId);

  useEffect(() => {
    if (authReady && user && user.accessLevel !== "admin") router.replace("/my");
  }, [authReady, user, router]);

  const [editingId, setEditingId] = useState<string | null>(null);

  if (authReady && user && user.accessLevel !== "admin") return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your businesses</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Switch between businesses, tailor their modules, or add a new one.</p>
        </div>
        <Button onClick={() => router.push("/workspaces/new")}><Plus size={16} /> New business</Button>
      </div>

      <div className="space-y-3">
        {workspaces.map((w) => (
          <WorkspaceRow
            key={w.id}
            ws={w}
            active={w.id === activeWorkspaceId}
            editing={editingId === w.id}
            onEdit={() => setEditingId(editingId === w.id ? null : w.id)}
            onOpen={() => void switchWorkspace(w.id).then(() => router.push("/my"))}
            onArchive={() => { if (confirm(`Remove “${w.name}” from your businesses? Its data is kept but it disappears from the switcher.`)) archiveWs(w.id); }}
            onDone={() => setEditingId(null)}
          />
        ))}
      </div>
    </div>
  );
}

function WorkspaceRow({
  ws, active, editing, onEdit, onOpen, onArchive, onDone,
}: {
  ws: Workspace; active: boolean; editing: boolean;
  onEdit: () => void; onOpen: () => void; onArchive: () => void; onDone: () => void;
}) {
  const updateWorkspace = useApp((s) => s.updateWorkspace);
  const updateWorkspaceModules = useApp((s) => s.updateWorkspaceModules);
  const [name, setName] = useState(ws.name);
  const [icon, setIcon] = useState(ws.icon ?? "Sparkles");
  const [modules, setModules] = useState<Set<WorkspaceModule>>(new Set(ws.modules));
  const Icon = appIconComponent(ws.icon);
  const isDefault = ws.id === DEFAULT_WORKSPACE_ID;

  const toggle = (m: WorkspaceModule) =>
    setModules((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });

  const save = () => {
    const nm = name.trim() || ws.name;
    if (nm !== ws.name || icon !== ws.icon) updateWorkspace(ws.id, { name: nm, icon });
    updateWorkspaceModules(ws.id, [...modules]);
    onDone();
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{ws.name}</span>
            {active && <Badge color="success">Active</Badge>}
            {isDefault && <Badge color="slate">Primary</Badge>}
          </div>
          <div className="mt-0.5 text-xs text-[var(--muted)]">{ws.modules.length} module{ws.modules.length === 1 ? "" : "s"} enabled</div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!active && <Button size="sm" variant="outline" onClick={onOpen}><LogIn size={14} /> Open</Button>}
          <Button size="sm" variant="ghost" onClick={onEdit}><Pencil size={14} /> {editing ? "Close" : "Manage"}</Button>
        </div>
      </div>

      {editing && (
        <div className="space-y-4 border-t border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Mark</label>
              <div className="flex flex-wrap gap-1.5">
                {APP_ICON_NAMES.map((n) => {
                  const I = appIconComponent(n);
                  return (
                    <button
                      key={n}
                      onClick={() => setIcon(n)}
                      aria-label={n}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                        icon === n ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface)]"
                      )}
                    >
                      <I size={15} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <SectionTitle>Modules</SectionTitle>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {WORKSPACE_MODULES.map((m) => {
                const MI = appIconComponent(m.icon);
                const on = modules.has(m.key);
                return (
                  <button
                    key={m.key}
                    onClick={() => toggle(m.key)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
                      on ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]"
                    )}
                  >
                    <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", on ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)]")}>
                      <MI size={14} />
                    </span>
                    <span className="flex-1 truncate text-sm font-medium">{m.label}</span>
                    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", on ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border-strong)]")}>
                      {on && <Check size={12} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            {!isDefault ? (
              <Button variant="ghost" size="sm" className="text-[var(--danger)]" onClick={onArchive}><Trash2 size={14} /> Remove business</Button>
            ) : <span className="text-xs text-[var(--muted-2)]">Your primary business can&apos;t be removed.</span>}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
              <Button size="sm" onClick={save}>Save changes</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
