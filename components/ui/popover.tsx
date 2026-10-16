"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight anchored popover — a trigger plus a floating panel that closes on
 * outside-click or Escape. Replaces the click-outside effect copy-pasted across
 * the app. Positioned under the trigger, aligned to its start or end edge.
 */
export function Popover({
  trigger,
  children,
  align = "start",
  width,
  panelClassName,
}: {
  trigger: (o: { open: boolean; toggle: () => void }) => ReactNode;
  children: (o: { close: () => void }) => ReactNode;
  align?: "start" | "end";
  width?: number;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={cn(
            "absolute z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-lg)] animate-in",
            align === "end" ? "right-0" : "left-0",
            panelClassName,
          )}
          style={width ? { width } : undefined}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}
