"use client";

import { createElement } from "react";
import { useApp } from "@/lib/store";
import { appIconComponent } from "@/lib/branding";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  /** Mark size in px (the rounded square). Text scales with it. */
  size?: number;
  /** Hide the name/tagline text — show the mark only. */
  markOnly?: boolean;
  /** Stack the name under the mark and center everything (login screen). */
  stacked?: boolean;
  className?: string;
}

// Single source of truth for the app's logo + name, driven by the admin's
// Company Settings (appIcon / appLogoDataUrl / appName / appTagline). Used by the
// sidebar, top bar and login screen so rebranding the app is one place.
export function AppLogo({ size = 32, markOnly = false, stacked = false, className }: AppLogoProps) {
  const company = useApp((s) => s.company);
  const name = company.appName?.trim() || company.brandName?.trim() || "Gradskills";
  const tagline = company.appTagline?.trim();
  const iconSize = Math.round(size * 0.56);

  const mark = company.appLogoDataUrl ? (
    <div
      className="flex items-center justify-center overflow-hidden rounded-xl"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={company.appLogoDataUrl} alt={name} className="h-full w-full object-contain" />
    </div>
  ) : (
    <div
      className="flex items-center justify-center rounded-xl bg-[var(--primary)] text-white"
      style={{ width: size, height: size }}
    >
      {createElement(appIconComponent(company.appIcon), { size: iconSize })}
    </div>
  );

  if (markOnly) return <div className={className}>{mark}</div>;

  if (stacked) {
    return (
      <div className={cn("flex flex-col items-center text-center", className)}>
        {mark}
        <div className="mt-3 text-xl font-bold tracking-tight">
          {name}
          {tagline ? <span className="text-[var(--muted)]"> {tagline}</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {mark}
      <div className="leading-tight">
        <div className="text-sm font-bold">{name}</div>
        {tagline ? (
          <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-2)]">{tagline}</div>
        ) : null}
      </div>
    </div>
  );
}
