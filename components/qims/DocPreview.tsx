"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { printDocument, mailto, whatsapp } from "@/lib/documents";
import { Download, Mail, MessageCircle } from "lucide-react";

const DOC_W = 794; // A4 width @96dpi
const MAX_H_VH = 0.78; // fit-mode preview area = 78% of viewport height
const PAD = 12; // p-3 padding around the page (px)

// Live document preview: renders the ACTUAL send-ready document in an isolated
// iframe. The page is always scaled to fit the panel WIDTH so the whole page is
// visible (never clipped left/right). In "scrollable" mode (multi-page docs) the
// panel then scrolls vertically through the pages; in default "fit" mode the
// scale is further capped so the whole (single) page fits without scrolling.
// Toolbar = Download / Email / WhatsApp.
export function DocPreview({
  docKey, baseHtml, filename, label, message, contact, scrollable,
}: {
  docKey: string;
  baseHtml: string;
  filename: string;
  label: string;
  message: { subject: string; body: string };
  contact: { email?: string; phone?: string };
  scrollable?: boolean;
}) {
  const logDocumentSend = useApp((s) => s.logDocumentSend);
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [docH, setDocH] = useState(600);

  // Scale to fit the panel width. Fit mode additionally caps by height so the
  // whole page is visible; scrollable mode fits width only and scrolls vertically.
  // In scrollable mode we reserve room for the vertical scrollbar — otherwise the
  // scrollbar steals ~16px after scaling and clips the right edge of the page.
  const recompute = useCallback((h: number = docH) => {
    const w = wrapRef.current?.clientWidth ?? 0;
    if (w < 40) return; // panel not laid out yet — the ResizeObserver will re-fire
    const scrollbar = scrollable ? 18 : 0;
    const fitW = Math.max(0.1, Math.min(1, (w - PAD * 2 - scrollbar) / DOC_W));
    if (scrollable) {
      setScale(fitW);
    } else {
      const maxH = window.innerHeight * MAX_H_VH - PAD * 2;
      setScale(Math.max(0.1, Math.min(fitW, maxH / h)));
    }
  }, [docH, scrollable]);

  // Recompute on any size change of the panel (covers the 0-width → laid-out
  // transition during hydration, sidebar toggles, and window resizes).
  useEffect(() => {
    const node = wrapRef.current;
    const ro = node && typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => recompute()) : null;
    if (node && ro) ro.observe(node);
    const onResize = () => recompute();
    window.addEventListener("resize", onResize);
    recompute();
    return () => { ro?.disconnect(); window.removeEventListener("resize", onResize); };
  }, [recompute]);

  const measure = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      const h = Math.max(200, doc.documentElement.scrollHeight);
      setDocH(h);
      recompute(h);
    }
  }, [recompute]);

  function download() { printDocument(baseHtml, filename); }
  function send(channel: "email" | "whatsapp") {
    const href = channel === "email" ? mailto({ to: contact.email, subject: message.subject, body: message.body }) : whatsapp({ phone: contact.phone, text: `${message.subject}\n\n${message.body}` });
    window.open(href, "_blank");
    logDocumentSend(docKey.split(":").slice(-1)[0], label, channel);
  }

  return (
    <div className={scrollable ? "flex h-[78vh] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]" : "overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]"}>
      <div className="flex items-center justify-end gap-1 border-b border-[var(--border)] bg-[var(--surface)] p-1.5">
        <ToolBtn onClick={download} icon={<Download size={14} />} label="Download" />
        <ToolBtn onClick={() => send("email")} icon={<Mail size={14} />} label="Email" disabled={!contact.email} />
        <ToolBtn onClick={() => send("whatsapp")} icon={<MessageCircle size={14} />} label="WhatsApp" />
      </div>
      <div
        ref={wrapRef}
        className={scrollable ? "flex-1 overflow-y-scroll overflow-x-hidden p-3" : "flex justify-center overflow-hidden p-3"}
        style={scrollable ? undefined : { maxHeight: `${MAX_H_VH * 100}vh` }}
      >
        <div className="mx-auto" style={{ width: DOC_W * scale, height: docH * scale }}>
          <iframe
            ref={iframeRef}
            title={label}
            srcDoc={baseHtml}
            onLoad={measure}
            style={{ width: DOC_W, height: docH, border: 0, transform: `scale(${scale})`, transformOrigin: "top left", display: "block", background: "#fff", boxShadow: "var(--shadow-md)" }}
          />
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ onClick, icon, label, disabled }: { onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={label} className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] disabled:opacity-40">
      {icon}<span className="hidden sm:inline">{label}</span>
    </button>
  );
}
