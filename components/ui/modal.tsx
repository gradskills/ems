"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Modals only open via client interaction (never during SSR), so guarding on
  // `document` is enough to keep createPortal client-only without a mount effect.
  if (!open || typeof document === "undefined") return null;
  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  // Render into <body> so the overlay's `position: fixed` is relative to the
  // viewport. A page-level ancestor with a transform (e.g. the .page-enter
  // entrance animation) would otherwise become the containing block and drop the
  // centered dialog far down a tall page, leaving only the blurred backdrop.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px] animate-in" onClick={onClose} />
      <div
        className={cn(
          // A guaranteed gutter (the container's sm:p-6) + a dvh-based cap keeps the
          // dialog fully on-screen on any height: header and footer never clip, and
          // only the middle scrolls. dvh (not vh) tracks mobile browser chrome.
          "relative z-10 flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-[var(--surface)] shadow-[var(--shadow-lg)] animate-in sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl",
          widths[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h3 className="text-base font-semibold">{title}</h3>
            <button onClick={onClose} className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--surface-2)]">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface-2)] px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--muted)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[var(--muted-2)]">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]",
        props.className
      )}
    />
  );
}
