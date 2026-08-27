"use client";

import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, active, onChange }: { tabs: { key: T; label: string; count?: number }[]; active: T; onChange: (t: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors -mb-px",
            active === t.key
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", active === t.key ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "bg-[var(--surface-2)] text-[var(--muted-2)]")}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function useTabs<T extends string>(initial: T) {
  return useState<T>(initial);
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="shrink-0 text-[var(--muted)]">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

/** simple full-width data table shell to match the sales screens */
export function TableShell({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {head}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
    />
  );
}

/** pill-style segmented switch (scope, view mode, …) */
export function SegmentedControl<T extends string>({ items, value, onChange }: { items: { key: T; label: string; icon?: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-lg bg-[var(--surface-2)] p-1">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
            value === it.key ? "bg-[var(--surface)] shadow-[var(--shadow-sm)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
          )}
        >
          {it.icon}
          {it.label}
        </button>
      ))}
    </div>
  );
}
