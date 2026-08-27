"use client";

import { cn, initials, avatarColor } from "@/lib/utils";
import type { LeadStage, Disposition } from "@/lib/types";
import { labelStage, labelDisposition } from "@/lib/store";
import { ReactNode } from "react";

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants: Record<string, string> = {
    primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-[var(--shadow-sm)]",
    secondary: "bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--border)]",
    ghost: "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
    outline: "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-2)]",
    danger: "bg-[var(--danger)] text-white hover:brightness-95",
    success: "bg-[var(--success)] text-white hover:brightness-95",
  };
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-12 px-6 text-base gap-2",
    icon: "h-9 w-9 justify-center",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  color = "slate",
  className,
  dot,
}: {
  children: ReactNode;
  color?: "slate" | "primary" | "success" | "warning" | "danger" | "info" | "purple";
  className?: string;
  dot?: boolean;
}) {
  const colors: Record<string, string> = {
    slate: "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]",
    primary: "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary-soft)]",
    success: "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success-soft)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning-soft)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger-soft)]",
    info: "bg-[var(--info-soft)] text-[var(--info)] border-[var(--info-soft)]",
    purple: "bg-[var(--purple-soft)] text-[var(--purple)] border-[var(--purple-soft)]",
  };
  const dotColors: Record<string, string> = {
    slate: "bg-[var(--muted-2)]",
    primary: "bg-[var(--primary)]",
    success: "bg-[var(--success)]",
    warning: "bg-[var(--warning)]",
    danger: "bg-[var(--danger)]",
    info: "bg-[var(--info)]",
    purple: "bg-[var(--purple)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        colors[color],
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[color])} />}
      {children}
    </span>
  );
}

const stageColor: Record<LeadStage, "slate" | "primary" | "info" | "warning" | "purple" | "success" | "danger"> = {
  new: "info",
  contacted: "primary",
  qualified: "purple",
  proposal_sent: "warning",
  negotiation: "warning",
  won: "success",
  lost: "danger",
};

export function StageBadge({ stage }: { stage: LeadStage }) {
  return (
    <Badge color={stageColor[stage]} dot>
      {labelStage(stage)}
    </Badge>
  );
}

const dispoColor: Record<Disposition, "success" | "slate" | "warning" | "danger" | "info"> = {
  connected: "success",
  callback: "info",
  no_answer: "slate",
  busy: "warning",
  not_interested: "danger",
  wrong_number: "slate",
};

export function DispositionBadge({ d }: { d: Disposition }) {
  return <Badge color={dispoColor[d]}>{labelDisposition(d)}</Badge>;
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.38 }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}

export function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 80 ? "var(--success)" : score >= 60 ? "var(--warning)" : "var(--muted-2)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

export function ProgressBar({ value, max = 100, color = "var(--primary)", className }: { value: number; max?: number; color?: string; className?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]", className)}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Stat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-[var(--muted)]">{sub}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, sub }: { icon?: ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {icon && <div className="text-[var(--muted-2)]">{icon}</div>}
      <div className="text-sm font-medium text-[var(--foreground)]">{title}</div>
      {sub && <div className="max-w-xs text-xs text-[var(--muted)]">{sub}</div>}
    </div>
  );
}

/** borderless inline-edit select used by spreadsheet-style views */
export function selectCellCls(editable = true) {
  return cn(
    "h-8 w-full cursor-pointer rounded-md border border-transparent bg-transparent px-1.5 text-xs outline-none transition-colors",
    editable
      ? "hover:border-[var(--border)] hover:bg-[var(--surface-2)] focus:border-[var(--primary)] focus:bg-[var(--surface)]"
      : "pointer-events-none text-[var(--muted)]"
  );
}
