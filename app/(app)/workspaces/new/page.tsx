"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { WORKSPACE_MODULES, WORKSPACE_TEMPLATES, type WorkspaceTemplate } from "@/lib/workspace";
import { APP_ICON_NAMES, appIconComponent } from "@/lib/branding";
import { Card, Button, SectionTitle } from "@/components/ui/primitives";
import type { WorkspaceModule } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

export default function NewWorkspacePage() {
  const router = useRouter();
  const actingUserId = useApp((s) => s.actingUserId);
  const authReady = useApp((s) => s.authReady);
  const createWorkspace = useApp((s) => s.createWorkspace);
  const user = userById(actingUserId);

  // Creating a business is an owner/admin action.
  useEffect(() => {
    if (authReady && user && user.accessLevel !== "admin") router.replace("/my");
  }, [authReady, user, router]);

  const [templateKey, setTemplateKey] = useState<string>("full");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>("Sparkles");
  const [modules, setModules] = useState<Set<WorkspaceModule>>(new Set(WORKSPACE_TEMPLATES[0].modules));
  const [busy, setBusy] = useState(false);

  const applyTemplate = (t: WorkspaceTemplate) => {
    setTemplateKey(t.key);
    setModules(new Set(t.modules));
    setIcon(t.icon);
  };

  const toggleModule = (m: WorkspaceModule) => {
    setTemplateKey("custom");
    setModules((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });
  };

  const canCreate = name.trim().length > 0 && modules.size > 0 && !busy;

  const submit = async () => {
    if (!canCreate) return;
    setBusy(true);
    try {
      await createWorkspace({ name: name.trim(), modules: [...modules], icon });
      router.push("/my");
    } catch {
      setBusy(false);
    }
  };

  const Preview = useMemo(() => appIconComponent(icon), [icon]);

  if (authReady && user && user.accessLevel !== "admin") return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create a business</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Each business is its own workspace — separate employees, data and the modules you turn on.
        </p>
      </div>

      {/* Templates */}
      <section className="space-y-3">
        <SectionTitle>Start from a template</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {WORKSPACE_TEMPLATES.map((t) => {
            const Icon = appIconComponent(t.icon);
            const selected = templateKey === t.key;
            return (
              <button
                key={t.key}
                onClick={() => applyTemplate(t)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                  selected ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--border)] hover:bg-[var(--surface-2)]"
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--primary)]">
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{t.name}</span>
                  <span className="mt-0.5 block text-xs text-[var(--muted)]">{t.description}</span>
                </span>
                {selected && <Check size={16} className="ml-auto shrink-0 text-[var(--primary)]" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Name + mark */}
      <Card className="space-y-4 p-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Business name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Northwind Studios"
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Workspace mark</label>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
              <Preview size={22} />
            </span>
            <div className="flex flex-wrap gap-1.5">
              {APP_ICON_NAMES.map((n) => {
                const Icon = appIconComponent(n);
                return (
                  <button
                    key={n}
                    onClick={() => setIcon(n)}
                    aria-label={n}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                      icon === n ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)]"
                    )}
                  >
                    <Icon size={15} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Modules */}
      <section className="space-y-3">
        <SectionTitle>Modules</SectionTitle>
        <p className="-mt-1 text-xs text-[var(--muted)]">Turn on only what this business needs — you can change this later.</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {WORKSPACE_MODULES.map((m) => {
            const Icon = appIconComponent(m.icon);
            const on = modules.has(m.key);
            return (
              <button
                key={m.key}
                onClick={() => toggleModule(m.key)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors",
                  on ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--border)] hover:bg-[var(--surface-2)]"
                )}
              >
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", on ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)]")}>
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{m.label}</span>
                  <span className="mt-0.5 block text-xs text-[var(--muted)]">{m.description}</span>
                </span>
                <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", on ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border-strong)]")}>
                  {on && <Check size={13} />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
        <Button variant="ghost" onClick={() => router.back()} disabled={busy}>Cancel</Button>
        <Button onClick={submit} disabled={!canCreate}>
          {busy ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : "Create business"}
        </Button>
      </div>
    </div>
  );
}
