"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Card, Button } from "@/components/ui/primitives";
import { mobileNavPool, mobileNavFor } from "@/components/layout/nav";
import { ArrowUp, ArrowDown, X, Plus, Smartphone, RotateCcw } from "lucide-react";

const MAX = 5;

/**
 * Lets a user tailor their own bottom navigation bar (the mobile tab bar): pick
 * which pages appear, in what order, up to 5. Saved per user on the device.
 * Falls back to the role-prioritized default when nothing is customized.
 */
export function MobileNavCustomizer() {
  const actingUserId = useApp((s) => s.actingUserId);
  const viewLens = useApp((s) => s.viewLens);
  const departments = useApp((s) => s.departments);
  const mobileNav = useApp((s) => s.mobileNav);
  const setMobileNav = useApp((s) => s.setMobileNav);
  const user = userById(actingUserId)!;

  const effectiveDept =
    user.accessLevel === "employee"
      ? departments.find((d) => d.id === user.departmentId)
      : viewLens === "management"
        ? undefined
        : departments.find((d) => d.id === viewLens);

  const pool = useMemo(() => mobileNavPool(user, effectiveDept), [user, effectiveDept]);
  const byHref = useMemo(() => new Map(pool.map((n) => [n.href, n] as const)), [pool]);

  // current bar (saved prefs, or the resolved role default), as hrefs
  const initial = useMemo(
    () => mobileNavFor(user, effectiveDept, mobileNav).map((n) => n.href),
    [user, effectiveDept, mobileNav]
  );
  const [selected, setSelected] = useState<string[]>(initial);
  const [dirty, setDirty] = useState(false);

  const change = (next: string[]) => { setSelected(next); setDirty(true); };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= selected.length) return;
    const next = [...selected];
    [next[i], next[j]] = [next[j], next[i]];
    change(next);
  };
  const remove = (href: string) => change(selected.filter((h) => h !== href));
  const add = (href: string) => { if (selected.length < MAX) change([...selected, href]); };

  const save = () => { setMobileNav(selected); setDirty(false); };
  const reset = () => { setMobileNav(null); setSelected(mobileNavFor(user, effectiveDept, null).map((n) => n.href)); setDirty(false); };

  const available = pool.filter((n) => !selected.includes(n.href));

  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center gap-2">
        <Smartphone size={16} className="text-[var(--primary)]" />
        <h3 className="text-sm font-semibold">Bottom navigation bar</h3>
      </div>
      <p className="mb-3 text-xs text-[var(--muted)]">Choose up to {MAX} pages for the mobile tab bar and drag them into the order you use most.</p>

      {/* in the bar */}
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-2)]">Shown in bar</span>
        <span className="text-[11px] text-[var(--muted-2)]">{selected.length}/{MAX}</span>
      </div>
      <div className="space-y-1.5">
        {selected.map((href, i) => {
          const item = byHref.get(href);
          if (!item) return null;
          const Icon = item.icon;
          return (
            <div key={href} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2">
              <Icon size={16} className="shrink-0 text-[var(--muted)]" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
              <div className="flex items-center gap-0.5">
                <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="rounded-md p-1 text-[var(--muted-2)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] disabled:opacity-30"><ArrowUp size={15} /></button>
                <button onClick={() => move(i, 1)} disabled={i === selected.length - 1} aria-label="Move down" className="rounded-md p-1 text-[var(--muted-2)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] disabled:opacity-30"><ArrowDown size={15} /></button>
                <button onClick={() => remove(href)} aria-label="Remove" className="rounded-md p-1 text-[var(--muted-2)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"><X size={15} /></button>
              </div>
            </div>
          );
        })}
        {selected.length === 0 && <div className="rounded-lg border border-dashed border-[var(--border-strong)] py-4 text-center text-xs text-[var(--muted)]">Add at least one page below.</div>}
      </div>

      {/* available to add */}
      {available.length > 0 && (
        <>
          <div className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-2)]">More pages</div>
          <div className="flex flex-wrap gap-1.5">
            {available.map((item) => {
              const Icon = item.icon;
              const full = selected.length >= MAX;
              return (
                <button
                  key={item.href}
                  onClick={() => add(item.href)}
                  disabled={full}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon size={13} className="text-[var(--muted)]" /> {item.label} <Plus size={12} className="text-[var(--muted-2)]" />
                </button>
              );
            })}
          </div>
          {selected.length >= MAX && <p className="mt-2 text-[11px] text-[var(--muted-2)]">Bar is full — remove a page to add another.</p>}
        </>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-[var(--border)] pt-3">
        <Button size="sm" onClick={save} disabled={!dirty || selected.length === 0}>Save bar</Button>
        <Button size="sm" variant="ghost" onClick={reset}><RotateCcw size={14} /> Reset to default</Button>
      </div>
      <p className="mt-2 text-[11px] text-[var(--muted-2)]">Applies to the tab bar on phones. Saved on this device.</p>
    </Card>
  );
}
