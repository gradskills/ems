"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { printDocument, mailto, whatsapp } from "@/lib/documents";
import { Download, Mail, MessageCircle } from "lucide-react";

const DOC_W = 794; // A4 width @96dpi
const MAX_H_VH = 0.78; // preview area = 78% of viewport height
const PAD = 12; // p-3 padding around the page (px)

// Live document preview: renders the ACTUAL send-ready document in an isolated
// iframe, scaled to fit the panel width and auto-sized to the content height so
// the preview grows/shrinks as content changes. Toolbar = Download / Email / WhatsApp.
export function DocPreview({
  docKey, baseHtml, filename, label, message, contact,
}: {
  docKey: string;
  baseHtml: string;
  filename: string;
  label: string;
  message: { subject: string; body: string };
  contact: { email?: string; phone?: string };
}) {
  const logDocumentSend = useApp((s) => s.logDocumentSend);
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0.9);
  const [docH, setDocH] = useState(500);

  // Scale so the WHOLE page fits the panel — constrained by both the available
  // width and the available height — so it never needs to be scrolled.
  const fit = useCallback((h: number = docH) => {
    const w = wrapRef.current?.clientWidth ?? DOC_W;
    const maxH = window.innerHeight * MAX_H_VH - PAD * 2; // minus vertical padding
    setScale(Math.min(1, (w - PAD * 2) / DOC_W, maxH / h));
  }, [docH]);
  useEffect(() => { const onResize = () => fit(); fit(); window.addEventListener("resize", onResize); return () => window.removeEventListener("resize", onResize); }, [fit]);

  const measure = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      const h = Math.max(200, doc.documentElement.scrollHeight);
      setDocH(h);
      fit(h);
    }
  }, [fit]);
  // re-measure shortly after content changes (srcDoc reloads fire onLoad too)
  useEffect(() => { const t = setTimeout(measure, 60); return () => clearTimeout(t); }, [baseHtml, measure]);

  function download() { printDocument(baseHtml, filename); }
  function send(channel: "email" | "whatsapp") {
    const href = channel === "email" ? mailto({ to: contact.email, subject: message.subject, body: message.body }) : whatsapp({ phone: contact.phone, text: `${message.subject}\n\n${message.body}` });
    window.open(href, "_blank");
    logDocumentSend(docKey.split(":").slice(-1)[0], label, channel);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
      <div className="flex items-center justify-end gap-1 border-b border-[var(--border)] bg-[var(--surface)] p-1.5">
        <ToolBtn onClick={download} icon={<Download size={14} />} label="Download" />
        <ToolBtn onClick={() => send("email")} icon={<Mail size={14} />} label="Email" disabled={!contact.email} />
        <ToolBtn onClick={() => send("whatsapp")} icon={<MessageCircle size={14} />} label="WhatsApp" />
      </div>
      <div ref={wrapRef} className="flex justify-center overflow-hidden p-3" style={{ maxHeight: `${MAX_H_VH * 100}vh` }}>
        <div style={{ width: DOC_W * scale, height: docH * scale }}>
          <iframe
            ref={iframeRef}
            title={label}
            srcDoc={baseHtml}
            onLoad={measure}
            style={{ width: DOC_W, height: docH, border: 0, transform: `scale(${scale})`, transformOrigin: "top left", display: "block", background: "#fff" }}
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
