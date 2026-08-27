"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/primitives";
import { FONTS, makeText, makeShape, makeImage, makePage, newElId } from "@/lib/design";
import type { Design, DesignEl, DesignPage } from "@/lib/types";
import {
  Type, Image as ImageIcon, Square, Circle as CircleIcon, Minus, Plus, Trash2, Copy, ChevronLeft,
  Download, Save, RotateCcw, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, ArrowUp,
  ArrowDown, Check, Grid3x3, Undo2, Redo2, ZoomIn, ZoomOut, Maximize,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
} from "lucide-react";

interface Api { addEl: (el: DesignEl) => void; addText: (text: string, partial?: Partial<DesignEl>) => void; }

type Guides = { v: number[]; h: number[] };
type Box = { x: number; y: number; w: number; h: number };

const SNAP = 6;        // screen-px snap threshold
const GRID = 20;       // page-px grid step
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function CanvasEditor({
  initial, title, onSave, onDownload, onReset, backHref, renderExtras,
}: {
  initial: Design;
  title: string;
  onSave: (d: Design) => void;
  onDownload: (d: Design) => void;
  onReset?: () => void;
  backHref: string;
  renderExtras?: (api: Api) => React.ReactNode;
}) {
  const [design, setDesign] = useState<Design>(initial);
  const [pageIdx, setPageIdx] = useState(0);
  const [selId, setSelId] = useState<string | null>(null);
  const [scale, setScale] = useState(0.6);
  const [autoFit, setAutoFit] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingText, setEditingText] = useState<string | null>(null);
  const [guides, setGuides] = useState<Guides>({ v: [], h: [] });
  const [measure, setMeasure] = useState<Box | null>(null);
  const [past, setPast] = useState<Design[]>([]);
  const [future, setFuture] = useState<Design[]>([]);

  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const designRef = useRef(design);
  const scaleRef = useRef(scale);
  const pageIdxRef = useRef(pageIdx);
  useEffect(() => { designRef.current = design; scaleRef.current = scale; pageIdxRef.current = pageIdx; });

  const page = design.pages[Math.min(pageIdx, design.pages.length - 1)];
  const sel = page?.els.find((e) => e.id === selId) ?? null;

  // fit-to-width scaling (only while autoFit is on)
  useEffect(() => {
    const fit = () => {
      if (!autoFit) return;
      const w = stageRef.current?.clientWidth ?? 700;
      setScale(clamp((w - 48) / design.width, 0.1, 2));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [design.width, autoFit]);

  // ── history ──
  const snapshot = useCallback(() => {
    setPast((p) => [...p.slice(-59), designRef.current]);
    setFuture([]);
  }, []);
  const setDesignHist = useCallback((updater: (d: Design) => Design) => { snapshot(); setDesign(updater); }, [snapshot]);
  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      setFuture((f) => [designRef.current, ...f].slice(0, 60));
      setDesign(p[p.length - 1]);
      return p.slice(0, -1);
    });
  }, []);
  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      setPast((p) => [...p.slice(-59), designRef.current]);
      setDesign(f[0]);
      return f.slice(1);
    });
  }, []);

  // ── mutations (each = one history step) ──
  const updatePage = (patch: Partial<DesignPage>) =>
    setDesignHist((d) => ({ ...d, pages: d.pages.map((p, i) => (i === pageIdx ? { ...p, ...patch } : p)) }));
  const updateEl = (id: string, patch: Partial<DesignEl>, hist = true) => {
    const fn = (d: Design): Design => ({ ...d, pages: d.pages.map((p, i) => (i === pageIdxRef.current ? { ...p, els: p.els.map((e) => (e.id === id ? { ...e, ...patch } : e)) } : p)) });
    if (hist) setDesignHist(fn); else setDesign(fn);
  };
  const addEl = useCallback((el: DesignEl) => {
    setDesignHist((d) => ({ ...d, pages: d.pages.map((p, i) => (i === pageIdx ? { ...p, els: [...p.els, el] } : p)) }));
    setSelId(el.id);
  }, [setDesignHist, pageIdx]);
  const removeEl = (id: string) =>
    setDesignHist((d) => ({ ...d, pages: d.pages.map((p, i) => (i === pageIdx ? { ...p, els: p.els.filter((e) => e.id !== id) } : p)) }));
  const duplicateEl = (id: string) => {
    const e = designRef.current.pages[pageIdxRef.current].els.find((x) => x.id === id);
    if (!e) return;
    addEl({ ...e, id: newElId(), x: e.x + 16, y: e.y + 16 });
  };
  const reorder = (id: string, dir: 1 | -1) => updateEl(id, { z: ((sel?.z ?? 0) + dir) });

  // align selected element to the page
  const alignToPage = (dir: "l" | "c" | "r" | "t" | "m" | "b") => {
    if (!sel) return;
    if (dir === "l") updateEl(sel.id, { x: 0 });
    if (dir === "c") updateEl(sel.id, { x: Math.round((design.width - sel.w) / 2) });
    if (dir === "r") updateEl(sel.id, { x: design.width - sel.w });
    if (dir === "t") updateEl(sel.id, { y: 0 });
    if (dir === "m") updateEl(sel.id, { y: Math.round((design.height - sel.h) / 2) });
    if (dir === "b") updateEl(sel.id, { y: design.height - sel.h });
  };

  const api: Api = useMemo(() => ({
    addEl,
    addText: (text, partial) => addEl(makeText({ text, ...partial })),
  }), [addEl]);

  // page ops
  const addPage = () => { setDesignHist((d) => ({ ...d, pages: [...d.pages, makePage(page?.bg ?? "#ffffff")] })); setPageIdx(design.pages.length); };
  const dupPage = () => setDesignHist((d) => { const p = d.pages[pageIdx]; const copy: DesignPage = { id: `pg-${Date.now()}`, bg: p.bg, els: p.els.map((e) => ({ ...e, id: newElId() })) }; const pages = [...d.pages]; pages.splice(pageIdx + 1, 0, copy); return { ...d, pages }; });
  const delPage = () => { if (design.pages.length <= 1) return; setDesignHist((d) => ({ ...d, pages: d.pages.filter((_, i) => i !== pageIdx) })); setPageIdx((i) => Math.max(0, i - 1)); };

  // ── zoom ──
  const zoomBy = (f: number) => { setAutoFit(false); setScale((s) => clamp(s * f, 0.1, 3)); };
  const fit = () => setAutoFit(true);

  // ── drag / resize with snapping ──
  type ResizeDir = "nw" | "ne" | "sw" | "se";
  function beginDrag(e: React.PointerEvent, el: DesignEl, mode: "move" | "resize", dir: ResizeDir = "se") {
    if (editingText) return;
    e.stopPropagation();
    setSelId(el.id);
    snapshot(); // one undo step per gesture
    const startX = e.clientX, startY = e.clientY;
    const o: Box = { x: el.x, y: el.y, w: el.w, h: el.h };
    const S = scaleRef.current;
    const others = designRef.current.pages[pageIdxRef.current].els.filter((x) => x.id !== el.id);
    const pageW = designRef.current.width, pageH = designRef.current.height;
    const id = el.id;

    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / S, dy = (ev.clientY - startY) / S;
      if (mode === "move") {
        let nx = Math.round(o.x + dx), ny = Math.round(o.y + dy);
        if (!ev.altKey) {
          const s = computeSnap(nx, ny, o.w, o.h, others, pageW, pageH, SNAP / S);
          nx = s.x; ny = s.y; setGuides(s.guides);
        } else setGuides({ v: [], h: [] });
        setMeasure({ x: nx, y: ny, w: o.w, h: o.h });
        updateEl(id, { x: nx, y: ny }, false);
      } else {
        let x = o.x, y = o.y, w = o.w, h = o.h;
        if (dir.includes("e")) w = Math.max(24, Math.round(o.w + dx));
        if (dir.includes("s")) h = Math.max(16, Math.round(o.h + dy));
        if (dir.includes("w")) { const right = o.x + o.w; x = Math.min(Math.round(o.x + dx), right - 24); w = right - x; }
        if (dir.includes("n")) { const bottom = o.y + o.h; y = Math.min(Math.round(o.y + dy), bottom - 16); h = bottom - y; }
        setMeasure({ x, y, w, h });
        updateEl(id, { x, y, w, h }, false);
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setGuides({ v: [], h: [] });
      setMeasure(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || editingText;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (mod && (e.key === "=" || e.key === "+")) { e.preventDefault(); zoomBy(1.1); return; }
      if (mod && e.key === "-") { e.preventDefault(); zoomBy(0.9); return; }
      if (typing || !selId) return;
      if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateEl(selId); return; }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeEl(selId); setSelId(null); return; }
      if (e.key === "Escape") { setSelId(null); return; }
      const nudge = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft" && sel) { e.preventDefault(); updateEl(selId, { x: sel.x - nudge }); }
      if (e.key === "ArrowRight" && sel) { e.preventDefault(); updateEl(selId, { x: sel.x + nudge }); }
      if (e.key === "ArrowUp" && sel) { e.preventDefault(); updateEl(selId, { y: sel.y - nudge }); }
      if (e.key === "ArrowDown" && sel) { e.preventDefault(); updateEl(selId, { y: sel.y + nudge }); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }); // re-bind each render for fresh sel

  function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => addEl(makeImage(String(reader.result), { w: 220, h: 140 }));
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function save() { onSave(design); setSaved(true); setTimeout(() => setSaved(false), 1800); }

  const S = scale;
  const cx = measure ? measure.x + measure.w / 2 : 0;
  const cy = measure ? measure.y + measure.h / 2 : 0;

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col">
      {/* top bar */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
        <Link href={backHref}><Button variant="ghost" size="sm"><ChevronLeft size={16} /></Button></Link>
        <div className="truncate text-sm font-semibold">{title}</div>

        <div className="mx-3 flex items-center gap-0.5">
          <IconBtn title="Undo (Ctrl+Z)" onClick={undo} disabled={!past.length}><Undo2 size={15} /></IconBtn>
          <IconBtn title="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!future.length}><Redo2 size={15} /></IconBtn>
          <div className="mx-1 h-5 w-px bg-[var(--border)]" />
          <IconBtn title="Toggle grid" on={showGrid} onClick={() => setShowGrid((g) => !g)}><Grid3x3 size={15} /></IconBtn>
          <div className="mx-1 h-5 w-px bg-[var(--border)]" />
          <IconBtn title="Zoom out" onClick={() => zoomBy(0.9)}><ZoomOut size={15} /></IconBtn>
          <button onClick={fit} title="Fit to width" className="min-w-[46px] rounded px-1 text-center text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-2)]">{Math.round(scale * 100)}%</button>
          <IconBtn title="Zoom in" onClick={() => zoomBy(1.1)}><ZoomIn size={15} /></IconBtn>
          <IconBtn title="Fit to width" onClick={fit}><Maximize size={15} /></IconBtn>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {onReset && <Button variant="ghost" size="sm" onClick={onReset}><RotateCcw size={14} /> Reset</Button>}
          <Button variant="outline" size="sm" onClick={() => onDownload(design)}><Download size={14} /> Download</Button>
          <Button size="sm" onClick={save}>{saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save</>}</Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* left rail — add tools + pages + extras */}
        <div className="w-56 shrink-0 space-y-4 overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] p-3">
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-2)]">Add</div>
            <div className="grid grid-cols-3 gap-1.5">
              <ToolBtn icon={<Type size={16} />} label="Text" onClick={() => addEl(makeText())} />
              <ToolBtn icon={<ImageIcon size={16} />} label="Image" onClick={() => fileRef.current?.click()} />
              <ToolBtn icon={<Square size={16} />} label="Rect" onClick={() => addEl(makeShape())} />
              <ToolBtn icon={<CircleIcon size={16} />} label="Circle" onClick={() => addEl(makeShape({ w: 120, h: 120, radius: 999 }))} />
              <ToolBtn icon={<Minus size={16} />} label="Line" onClick={() => addEl(makeShape({ w: 220, h: 4, radius: 2, bg: "#111111" }))} />
              <ToolBtn icon={<Square size={16} className="rounded" />} label="Round" onClick={() => addEl(makeShape({ radius: 20 }))} />
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadImage} />
          </div>

          {renderExtras && <div className="border-t border-[var(--border)] pt-3">{renderExtras(api)}</div>}

          <div className="border-t border-[var(--border)] pt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-2)]">Pages ({design.pages.length})</span>
              <button onClick={addPage} className="text-[var(--primary)] hover:opacity-80" title="Add page"><Plus size={15} /></button>
            </div>
            <div className="space-y-1.5">
              {design.pages.map((p, i) => (
                <button key={p.id} onClick={() => { setPageIdx(i); setSelId(null); }} className={`flex w-full items-center gap-2 rounded-lg border p-1.5 text-left text-xs ${i === pageIdx ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--border)] hover:bg-[var(--surface-2)]"}`}>
                  <span className="flex h-9 w-7 shrink-0 items-center justify-center rounded border border-[var(--border)] text-[10px]" style={{ background: p.bg }}>{i + 1}</span>
                  <span className="flex-1">Page {i + 1}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
              <Button variant="outline" size="sm" onClick={dupPage} className="flex-1"><Copy size={13} /> Dup</Button>
              <Button variant="outline" size="sm" onClick={delPage} disabled={design.pages.length <= 1}><Trash2 size={13} /></Button>
            </div>
          </div>
        </div>

        {/* center — artboard */}
        <div ref={stageRef} className="min-w-0 flex-1 overflow-auto bg-[var(--surface-2)] p-6" onPointerDown={() => setSelId(null)}>
          <div style={{ position: "relative", width: design.width * S, height: design.height * S, margin: "0 auto" }}>
            {/* the page (scaled) */}
            <div
              className="absolute left-0 top-0 origin-top-left shadow-[var(--shadow-lg)]"
              style={{ width: design.width, height: design.height, background: page.bg, transform: `scale(${S})` }}
            >
              {page.els.slice().sort((a, b) => (a.z ?? 0) - (b.z ?? 0)).map((el) => (
                <ElView
                  key={el.id}
                  el={el}
                  selected={el.id === selId}
                  editing={editingText === el.id}
                  onPointerDown={(e) => beginDrag(e, el, "move")}
                  onResizeDown={(e, dir) => beginDrag(e, el, "resize", dir)}
                  onDoubleClick={() => el.type === "text" && setEditingText(el.id)}
                  onTextCommit={(text) => { updateEl(el.id, { text }); setEditingText(null); }}
                />
              ))}
            </div>

            {/* overlay — grid, snap guides, distance badges (screen coords, constant size) */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {showGrid && (
                <div className="absolute inset-0" style={{
                  backgroundImage:
                    `linear-gradient(to right, rgba(120,120,140,.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,120,140,.18) 1px, transparent 1px)`,
                  backgroundSize: `${GRID * S}px ${GRID * S}px`,
                }} />
              )}
              {guides.v.map((p, i) => <div key={`v${i}`} className="absolute top-0 bottom-0" style={{ left: p * S, width: 1, background: "#e5177b" }} />)}
              {guides.h.map((p, i) => <div key={`h${i}`} className="absolute left-0 right-0" style={{ top: p * S, height: 1, background: "#e5177b" }} />)}

              {measure && (() => {
                const gLeft = measure.x, gRight = design.width - (measure.x + measure.w);
                const gTop = measure.y, gBottom = design.height - (measure.y + measure.h);
                return (
                  <>
                    {gLeft > 0 && <DistLine horizontal from={0} to={measure.x} at={cy} S={S} value={gLeft} />}
                    {gRight > 0 && <DistLine horizontal from={measure.x + measure.w} to={design.width} at={cy} S={S} value={gRight} />}
                    {gTop > 0 && <DistLine from={0} to={measure.y} at={cx} S={S} value={gTop} />}
                    {gBottom > 0 && <DistLine from={measure.y + measure.h} to={design.height} at={cx} S={S} value={gBottom} />}
                    <div className="absolute" style={{ left: measure.x * S, top: measure.y * S, width: measure.w * S, height: measure.h * S, outline: "1px solid #e5177b", outlineOffset: 0 }} />
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* right rail — properties */}
        <div className="w-64 shrink-0 overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-3">
          {sel ? (
            <ElProps el={sel} onChange={(patch) => updateEl(sel.id, patch)} onDelete={() => { removeEl(sel.id); setSelId(null); }} onReorder={(d) => reorder(sel.id, d)} onDuplicate={() => duplicateEl(sel.id)} onReplaceImage={() => fileRef.current?.click()} onAlign={alignToPage} />
          ) : (
            <PageProps page={page} onChange={updatePage} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── smart-snap engine ──
function computeSnap(x: number, y: number, w: number, h: number, others: DesignEl[], pageW: number, pageH: number, thresh: number) {
  const vT = [0, pageW / 2, pageW];
  const hT = [0, pageH / 2, pageH];
  others.forEach((o) => { vT.push(o.x, o.x + o.w / 2, o.x + o.w); hT.push(o.y, o.y + o.h / 2, o.y + o.h); });
  const vA = [x, x + w / 2, x + w];
  const hA = [y, y + h / 2, y + h];
  let bv: { d: number; pos: number } | null = null;
  let bh: { d: number; pos: number } | null = null;
  vA.forEach((a) => vT.forEach((t) => { const d = t - a; if (Math.abs(d) <= thresh && (!bv || Math.abs(d) < Math.abs(bv.d))) bv = { d, pos: t }; }));
  hA.forEach((a) => hT.forEach((t) => { const d = t - a; if (Math.abs(d) <= thresh && (!bh || Math.abs(d) < Math.abs(bh.d))) bh = { d, pos: t }; }));
  const bvv = bv as { d: number; pos: number } | null;
  const bhh = bh as { d: number; pos: number } | null;
  return {
    x: bvv ? Math.round(x + bvv.d) : x,
    y: bhh ? Math.round(y + bhh.d) : y,
    guides: { v: bvv ? [bvv.pos] : [], h: bhh ? [bhh.pos] : [] } as Guides,
  };
}

function DistLine({ horizontal, from, to, at, S, value }: { horizontal?: boolean; from: number; to: number; at: number; S: number; value: number }) {
  const len = (to - from) * S;
  const style: React.CSSProperties = horizontal
    ? { left: from * S, top: at * S, width: len, height: 0, borderTop: "1px dashed #e5177b" }
    : { left: at * S, top: from * S, height: len, width: 0, borderLeft: "1px dashed #e5177b" };
  return (
    <div className="absolute" style={style}>
      <span
        className="absolute rounded bg-[#e5177b] px-1 text-[9px] font-semibold leading-[14px] text-white"
        style={horizontal
          ? { left: len / 2, top: 0, transform: "translate(-50%,-50%)" }
          : { top: len / 2, left: 0, transform: "translate(-50%,-50%)" }}
      >{value}</span>
    </div>
  );
}

function IconBtn({ title, onClick, disabled, on, children }: { title: string; onClick: () => void; disabled?: boolean; on?: boolean; children: React.ReactNode }) {
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded disabled:opacity-30 ${on ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--muted)] hover:bg-[var(--surface-2)]"}`}>
      {children}
    </button>
  );
}

function ToolBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 rounded-lg border border-[var(--border)] py-2 text-[10px] font-medium text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]">
      {icon}{label}
    </button>
  );
}

function ElView({ el, selected, editing, onPointerDown, onResizeDown, onDoubleClick, onTextCommit }: {
  el: DesignEl; selected: boolean; editing: boolean;
  onPointerDown: (e: React.PointerEvent) => void; onResizeDown: (e: React.PointerEvent, dir: "nw" | "ne" | "sw" | "se") => void;
  onDoubleClick: () => void; onTextCommit: (text: string) => void;
}) {
  const style: React.CSSProperties = { position: "absolute", left: el.x, top: el.y, width: el.w };
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); } }, [editing]);

  let inner: React.ReactNode = null;
  if (el.type === "image") {
    inner = <div style={{ width: "100%", height: el.h, overflow: "hidden", borderRadius: el.radius || 0, background: el.bg }}>{el.src && <img src={el.src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />}</div>;
  } else if (el.type === "shape") {
    inner = <div style={{ width: "100%", height: el.h, background: el.bg || "#111", borderRadius: el.radius || 0 }} />;
  } else {
    const ts: React.CSSProperties = {
      minHeight: el.h, background: el.bg, borderRadius: el.radius || 0, padding: "2px 6px",
      fontFamily: el.fontFamily || FONTS[0], fontSize: el.fontSize || 16, fontWeight: el.fontWeight || 400,
      fontStyle: el.italic ? "italic" : undefined, textDecoration: el.underline ? "underline" : undefined,
      textAlign: el.align || "left", color: el.color || "#111", lineHeight: el.lineHeight || 1.3,
      whiteSpace: "pre-wrap", wordBreak: "break-word", outline: "none",
    };
    inner = (
      <div
        ref={ref}
        style={ts}
        contentEditable={editing}
        suppressContentEditableWarning
        onBlur={(e) => editing && onTextCommit(e.currentTarget.innerText)}
      >
        {el.text}
      </div>
    );
  }

  const handle = (dir: "nw" | "ne" | "sw" | "se", pos: React.CSSProperties): React.ReactNode => (
    <div
      onPointerDown={(e) => { e.stopPropagation(); onResizeDown(e, dir); }}
      style={{ position: "absolute", width: 12, height: 12, background: "var(--primary)", border: "2px solid #fff", borderRadius: 3, ...pos }}
    />
  );

  return (
    <div
      style={{ ...style, cursor: editing ? "text" : "move", outline: selected ? "2px solid var(--primary)" : "none" }}
      onPointerDown={editing ? undefined : onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      {inner}
      {selected && !editing && (
        <>
          {handle("nw", { left: -6, top: -6, cursor: "nwse-resize" })}
          {handle("ne", { right: -6, top: -6, cursor: "nesw-resize" })}
          {handle("sw", { left: -6, bottom: -6, cursor: "nesw-resize" })}
          {handle("se", { right: -6, bottom: -6, cursor: "nwse-resize" })}
        </>
      )}
    </div>
  );
}

const SWATCHES = ["#111111", "#ffffff", "#F5B301", "#667085", "#16a34a", "#c0392b", "#1e3a8a", "#7c3aed", "#f4f4f5", "transparent"];

function ColorRow({ label, value, onChange, allowNone }: { label: string; value?: string; onChange: (v: string) => void; allowNone?: boolean }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium text-[var(--muted)]">{label}</div>
      <div className="flex flex-wrap gap-1">
        {SWATCHES.filter((s) => allowNone || s !== "transparent").map((s) => (
          <button key={s} onClick={() => onChange(s)} title={s} className={`h-6 w-6 rounded border ${value === s ? "ring-2 ring-[var(--ring)]" : "border-[var(--border)]"}`} style={{ background: s === "transparent" ? "repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 50%/8px 8px" : s }} />
        ))}
        <input type="color" value={value && value !== "transparent" ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="h-6 w-6 cursor-pointer rounded border border-[var(--border)] bg-transparent p-0" />
      </div>
    </div>
  );
}

function NumRow({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <label className="flex items-center justify-between gap-2 text-[11px] text-[var(--muted)]">
      {label}
      <input type="number" value={Math.round(value)} min={min} onChange={(e) => onChange(Number(e.target.value))} className="h-7 w-20 rounded border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-xs" />
    </label>
  );
}

function ElProps({ el, onChange, onDelete, onReorder, onDuplicate, onReplaceImage, onAlign }: {
  el: DesignEl; onChange: (patch: Partial<DesignEl>) => void; onDelete: () => void; onReorder: (d: 1 | -1) => void;
  onDuplicate: () => void; onReplaceImage: () => void; onAlign: (dir: "l" | "c" | "r" | "t" | "m" | "b") => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold capitalize">{el.type}</span>
        <div className="flex gap-1">
          <button onClick={onDuplicate} title="Duplicate (Ctrl+D)" className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)]"><Copy size={14} /></button>
          <button onClick={() => onReorder(1)} title="Bring forward" className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)]"><ArrowUp size={14} /></button>
          <button onClick={() => onReorder(-1)} title="Send back" className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)]"><ArrowDown size={14} /></button>
          <button onClick={onDelete} title="Delete" className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--danger)]"><Trash2 size={14} /></button>
        </div>
      </div>

      {/* align-to-page */}
      <div>
        <div className="mb-1 text-[11px] font-medium text-[var(--muted)]">Align to page</div>
        <div className="flex gap-1">
          <AlignBtn title="Left" onClick={() => onAlign("l")}><AlignStartVertical size={14} /></AlignBtn>
          <AlignBtn title="Center" onClick={() => onAlign("c")}><AlignCenterVertical size={14} /></AlignBtn>
          <AlignBtn title="Right" onClick={() => onAlign("r")}><AlignEndVertical size={14} /></AlignBtn>
          <div className="mx-1 w-px bg-[var(--border)]" />
          <AlignBtn title="Top" onClick={() => onAlign("t")}><AlignStartHorizontal size={14} /></AlignBtn>
          <AlignBtn title="Middle" onClick={() => onAlign("m")}><AlignCenterHorizontal size={14} /></AlignBtn>
          <AlignBtn title="Bottom" onClick={() => onAlign("b")}><AlignEndHorizontal size={14} /></AlignBtn>
        </div>
      </div>

      {el.type === "text" && (
        <>
          <div>
            <div className="mb-1 text-[11px] font-medium text-[var(--muted)]">Text</div>
            <textarea value={el.text ?? ""} onChange={(e) => onChange({ text: e.target.value })} rows={3} className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1.5 text-xs" />
          </div>
          <label className="block">
            <div className="mb-1 text-[11px] font-medium text-[var(--muted)]">Font</div>
            <select value={el.fontFamily || FONTS[0]} onChange={(e) => onChange({ fontFamily: e.target.value })} className="h-8 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-xs">
              {FONTS.map((f) => <option key={f} value={f}>{f.split(",")[0].replace(/'/g, "")}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <NumRow label="Size" value={el.fontSize || 16} onChange={(v) => onChange({ fontSize: v })} min={6} />
            <NumRow label="Line" value={el.lineHeight || 1.3} onChange={(v) => onChange({ lineHeight: v })} min={0} />
          </div>
          <div className="flex gap-1">
            <IconToggle on={(el.fontWeight ?? 400) >= 700} onClick={() => onChange({ fontWeight: (el.fontWeight ?? 400) >= 700 ? 400 : 800 })}><Bold size={14} /></IconToggle>
            <IconToggle on={!!el.italic} onClick={() => onChange({ italic: !el.italic })}><Italic size={14} /></IconToggle>
            <IconToggle on={!!el.underline} onClick={() => onChange({ underline: !el.underline })}><Underline size={14} /></IconToggle>
            <div className="mx-1 w-px bg-[var(--border)]" />
            <IconToggle on={el.align === "left" || !el.align} onClick={() => onChange({ align: "left" })}><AlignLeft size={14} /></IconToggle>
            <IconToggle on={el.align === "center"} onClick={() => onChange({ align: "center" })}><AlignCenter size={14} /></IconToggle>
            <IconToggle on={el.align === "right"} onClick={() => onChange({ align: "right" })}><AlignRight size={14} /></IconToggle>
          </div>
          <ColorRow label="Text color" value={el.color} onChange={(v) => onChange({ color: v })} />
          <ColorRow label="Background" value={el.bg ?? "transparent"} onChange={(v) => onChange({ bg: v === "transparent" ? undefined : v })} allowNone />
        </>
      )}

      {el.type === "shape" && (
        <>
          <ColorRow label="Fill" value={el.bg} onChange={(v) => onChange({ bg: v })} />
          <NumRow label="Corner radius" value={el.radius || 0} onChange={(v) => onChange({ radius: v })} />
        </>
      )}

      {el.type === "image" && (
        <>
          <Button variant="outline" size="sm" className="w-full" onClick={onReplaceImage}><ImageIcon size={14} /> Replace image</Button>
          <NumRow label="Corner radius" value={el.radius || 0} onChange={(v) => onChange({ radius: v })} />
        </>
      )}

      <div className="border-t border-[var(--border)] pt-3">
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-2)]">Position &amp; size</div>
        <div className="space-y-1.5">
          <NumRow label="X" value={el.x} onChange={(v) => onChange({ x: v })} min={-9999} />
          <NumRow label="Y" value={el.y} onChange={(v) => onChange({ y: v })} min={-9999} />
          <NumRow label="Width" value={el.w} onChange={(v) => onChange({ w: v })} min={8} />
          <NumRow label="Height" value={el.h} onChange={(v) => onChange({ h: v })} min={8} />
        </div>
      </div>
    </div>
  );
}

function AlignBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return <button title={title} onClick={onClick} className="flex h-7 w-7 items-center justify-center rounded border border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]">{children}</button>;
}

function IconToggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`flex h-7 w-7 items-center justify-center rounded ${on ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--muted)] hover:bg-[var(--surface-2)]"}`}>{children}</button>;
}

function PageProps({ page, onChange }: { page: DesignPage; onChange: (patch: Partial<DesignPage>) => void }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold">Page</div>
      <p className="text-[11px] text-[var(--muted)]">Click an element to edit it, or double-click text to type. Drag to move — smart guides &amp; spacing appear automatically. Hold <b>Alt</b> to disable snapping.</p>
      <ColorRow label="Page background" value={page.bg} onChange={(v) => onChange({ bg: v })} />
    </div>
  );
}
