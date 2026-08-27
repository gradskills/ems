import type { Design, DesignEl, DesignPage, DocType, CompanySettings } from "@/lib/types";

export const A4_W = 794;
export const A4_H = 1123;
const AMBER = "#F5B301";

const esc = (s: string | undefined) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

let dc = 0;
export const newElId = () => `el-${Date.now().toString(36)}-${dc++}`;
export const newPageId = () => `pg-${Date.now().toString(36)}-${dc++}`;

// curated font list (all web-safe so no external deps)
export const FONTS = [
  "Arial, sans-serif",
  "'Segoe UI', sans-serif",
  "Georgia, serif",
  "'Times New Roman', serif",
  "'Courier New', monospace",
  "Verdana, sans-serif",
  "'Trebuchet MS', sans-serif",
  "Impact, sans-serif",
];

// ── element → inline HTML ──
function elStyle(e: DesignEl) {
  return `position:absolute;left:${e.x}px;top:${e.y}px;width:${e.w}px;`;
}
function elHtml(e: DesignEl) {
  if (e.type === "image") {
    return `<div style="${elStyle(e)}height:${e.h}px;overflow:hidden;border-radius:${e.radius || 0}px;${e.bg ? `background:${e.bg};` : ""}">${e.src ? `<img src="${e.src}" style="width:100%;height:100%;object-fit:contain" />` : ""}</div>`;
  }
  if (e.type === "shape") {
    return `<div style="${elStyle(e)}height:${e.h}px;background:${e.bg || "#111111"};border-radius:${e.radius || 0}px"></div>`;
  }
  // text
  return `<div style="${elStyle(e)}min-height:${e.h}px;${e.bg ? `background:${e.bg};` : ""}${e.radius ? `border-radius:${e.radius}px;` : ""}padding:2px 6px;font-family:${e.fontFamily || FONTS[0]};font-size:${e.fontSize || 16}px;font-weight:${e.fontWeight || 400};${e.italic ? "font-style:italic;" : ""}${e.underline ? "text-decoration:underline;" : ""}text-align:${e.align || "left"};color:${e.color || "#111111"};line-height:${e.lineHeight || 1.3};white-space:pre-wrap;word-break:break-word;box-sizing:border-box">${esc(e.text)}</div>`;
}

function pageHtml(p: DesignPage, d: Design) {
  const els = p.els.slice().sort((a, b) => (a.z ?? 0) - (b.z ?? 0)).map(elHtml).join("");
  return `<div class="page" style="width:${d.width}px;height:${d.height}px;background:${p.bg};position:relative;overflow:hidden">${els}</div>`;
}

export function renderDesignHtml(d: Design, opts: { embed?: boolean; title?: string } = {}) {
  const pages = d.pages.map((p) => pageHtml(p, d)).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(opts.title || "Document")}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background:${opts.embed ? "#fff" : "#e9eaed"}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { margin:${opts.embed ? "0 auto" : "12px auto"}; box-shadow:${opts.embed ? "none" : "0 6px 24px rgba(0,0,0,.14)"}; }
  .print-btn { position:fixed; top:16px; right:16px; z-index:99; background:${AMBER}; color:#111; border:0; border-radius:9px; padding:11px 18px; font-weight:700; cursor:pointer; box-shadow:0 4px 14px rgba(0,0,0,.2); font-size:14px; }
  @media print { .print-btn { display:none; } body { background:#fff; } .page { margin:0; box-shadow:none; page-break-after: always; } .page:last-child { page-break-after:auto; } }
</style></head><body>
${opts.embed ? "" : `<button class="print-btn" onclick="window.print()">⬇ Save as PDF</button>`}
${pages}
</body></html>`;
}

// ── element factories (used by the editor's Add tools) ──
export function makeText(partial: Partial<DesignEl> = {}): DesignEl {
  return { id: newElId(), type: "text", x: 80, y: 80, w: 300, h: 40, text: "Text", fontFamily: FONTS[0], fontSize: 18, fontWeight: 400, align: "left", color: "#111111", ...partial };
}
export function makeShape(partial: Partial<DesignEl> = {}): DesignEl {
  return { id: newElId(), type: "shape", x: 80, y: 80, w: 200, h: 80, bg: AMBER, radius: 8, ...partial };
}
export function makeImage(src: string, partial: Partial<DesignEl> = {}): DesignEl {
  return { id: newElId(), type: "image", x: 80, y: 80, w: 200, h: 120, src, ...partial };
}
export function makePage(bg = "#ffffff"): DesignPage {
  return { id: newPageId(), bg, els: [] };
}

// ─────────────────────────────────────────────────────────────
// Starter designs per document type — branded, editable blocks
// `f` carries pre-formatted values from the caller (real data or placeholders)
// ─────────────────────────────────────────────────────────────
type Fields = Record<string, string>;

function logoEl(c: CompanySettings, x: number, y: number, light = false): DesignEl {
  if (c.logoDataUrl) return { id: newElId(), type: "image", x, y, w: 200, h: 56, src: c.logoDataUrl };
  return makeText({ x, y, w: 320, h: 40, text: c.brandName, fontSize: 30, fontWeight: 800, color: light ? "#ffffff" : "#111111" });
}
const T = (x: number, y: number, w: number, text: string, extra: Partial<DesignEl> = {}): DesignEl =>
  makeText({ x, y, w, h: 24, text, fontSize: 13, ...extra });

export function starterDesign(type: DocType, c: CompanySettings, f: Fields): Design {
  if (type === "receipt") return receiptStarter(c, f);
  if (type === "audit") return auditStarter(c, f);
  if (type === "invoice") return invoiceStarter(c, f);
  return quotationStarter(c, f);
}

function footerBar(c: CompanySettings): DesignEl[] {
  return [
    { id: newElId(), type: "shape", x: 0, y: A4_H - 60, w: A4_W, h: 60, bg: "#111111", radius: 0 },
    T(40, A4_H - 40, A4_W - 80, `${c.phone}      ${c.email}      ${c.website}`, { fontSize: 12, color: "#ffffff", align: "center" }),
  ];
}
function bankBlock(c: CompanySettings, x: number, y: number): DesignEl[] {
  return [
    T(x, y, 300, "BANK DETAILS", { fontSize: 15, fontWeight: 800 }),
    T(x, y + 26, 340, `Bank: ${c.bankName}\nA/C holder: ${c.accountHolder}\nA/C no: ${c.accountNo}\nType: ${c.accountType}\nIFSC: ${c.ifsc}`, { fontSize: 12, lineHeight: 1.9, h: 120 }),
  ];
}

function quotationStarter(c: CompanySettings, f: Fields): Design {
  const els: DesignEl[] = [
    { id: newElId(), type: "shape", x: A4_W * 0.66, y: 0, w: A4_W * 0.34, h: 12, bg: AMBER, radius: 0 },
    logoEl(c, 40, 44),
    { id: newElId(), type: "shape", x: 52, y: 96, w: 200, h: 22, bg: "#111111", radius: 6 },
    T(60, 99, 190, c.tagline, { fontSize: 11, color: "#ffffff", fontWeight: 600 }),
    T(430, 44, 324, `COMPANY: ${c.brandName.toUpperCase()}\nReg. ID: ${c.regId}\n${c.address}\n${c.city}, ${c.state}-${c.pincode}`, { fontSize: 12, align: "right", lineHeight: 1.7, h: 90 }),
    { id: newElId(), type: "shape", x: 40, y: 170, w: 4, h: 60, bg: AMBER },
    T(56, 168, 300, "BILLED TO", { fontSize: 13, fontWeight: 800, color: "#9a7400" }),
    T(56, 192, 400, `Customer Name: ${f.customerName || ""}\nCompany: ${f.customerCompany || ""}`, { fontSize: 15, lineHeight: 1.6, h: 44 }),
    T(430, 170, 324, `QUOTE: ${f.number || ""}\nDATE: ${f.date || ""}\nPROJECT COST: ${f.projectCost || ""}`, { fontSize: 13, align: "right", lineHeight: 1.9, h: 70 }),
    // items header
    { id: newElId(), type: "shape", x: 40, y: 270, w: A4_W - 80, h: 44, bg: "#111111", radius: 0 },
    T(56, 282, 400, "ITEM DESCRIPTION", { fontSize: 14, color: "#ffffff", fontWeight: 700 }),
    T(A4_W - 200, 282, 140, "PRICE", { fontSize: 14, color: "#ffffff", fontWeight: 700, align: "right" }),
    T(56, 330, 500, f.itemsText || "Service line 1\nService line 2", { fontSize: 14, lineHeight: 2.2, h: 160 }),
    // grand total
    { id: newElId(), type: "shape", x: A4_W - 260, y: 500, w: 130, h: 44, bg: "#f4f4f5", radius: 0 },
    { id: newElId(), type: "shape", x: A4_W - 130, y: 500, w: 90, h: 44, bg: AMBER, radius: 0 },
    T(A4_W - 250, 512, 110, "GRAND TOTAL", { fontSize: 15, fontWeight: 800 }),
    T(A4_W - 130, 512, 84, f.grandTotal || "", { fontSize: 15, fontWeight: 800, align: "center" }),
    ...bankBlock(c, 40, 600),
    T(430, 600, 300, "PAYMENT MILESTONES", { fontSize: 15, fontWeight: 800 }),
    T(430, 626, 320, f.milestonesText || "Project kickoff - 50%\nDelivery - 50%", { fontSize: 13, lineHeight: 1.9, h: 60 }),
    T(430, 720, 300, "TERMS", { fontSize: 15, fontWeight: 800 }),
    T(430, 746, 320, c.quotationTerms, { fontSize: 12, lineHeight: 1.6, h: 60, color: "#667085" }),
    ...footerBar(c),
  ];
  return { width: A4_W, height: A4_H, pages: [{ id: newPageId(), bg: "#ffffff", els }] };
}

function invoiceStarter(c: CompanySettings, f: Fields): Design {
  const els: DesignEl[] = [
    logoEl(c, 40, 40),
    T(300, 44, 300, `COMPANY: ${c.brandName.toUpperCase()}\nReg ID: ${c.regId}\n${c.address}\n${c.city}, ${c.state}-${c.pincode}`, { fontSize: 12, lineHeight: 1.7, h: 90 }),
    T(A4_W - 240, 40, 200, `INVOICE: ${f.number || ""}\nDATE: ${f.date || ""}\nDUE DATE: ${f.dueDate || ""}\nTOTAL DUE: ${f.totalDue || ""}`, { fontSize: 13, lineHeight: 1.7, h: 90, align: "right" }),
    T(40, 170, 300, "BILLED TO", { fontSize: 13, fontWeight: 800, color: "#9a7400" }),
    T(40, 196, 400, `Customer: ${f.customerName || ""}\nCompany: ${f.customerCompany || ""}\nEmail: ${f.customerEmail || ""}\nPhone: ${f.customerPhone || ""}`, { fontSize: 12, lineHeight: 1.8, h: 90 }),
    { id: newElId(), type: "shape", x: A4_W - 240, y: 170, w: 200, h: 70, bg: "#f4f4f5", radius: 12 },
    T(A4_W - 240, 184, 200, "INVOICE STATUS", { fontSize: 12, fontWeight: 700, align: "center", color: "#667085" }),
    T(A4_W - 240, 208, 200, f.status || "UNPAID", { fontSize: 15, fontWeight: 800, align: "center", color: "#9a7400" }),
    { id: newElId(), type: "shape", x: 40, y: 300, w: A4_W - 80, h: 44, bg: "#111111", radius: 0 },
    T(56, 312, 300, "ITEM DESCRIPTION", { fontSize: 13, color: "#ffffff", fontWeight: 700 }),
    T(A4_W - 200, 312, 160, "AMOUNT", { fontSize: 13, color: "#ffffff", fontWeight: 700, align: "right" }),
    T(56, 360, 460, f.itemsText || "Professional services", { fontSize: 13, lineHeight: 2.2, h: 120 }),
    T(A4_W - 320, 520, 130, "SUBTOTAL\nTAX\nGRAND TOTAL", { fontSize: 13, lineHeight: 2, align: "right", h: 80 }),
    T(A4_W - 180, 520, 140, `${f.subtotal || ""}\n${f.tax || ""}\n${f.grandTotal || ""}`, { fontSize: 13, lineHeight: 2, align: "right", fontWeight: 700, h: 80 }),
    ...bankBlock(c, 40, 640),
    T(430, 640, 300, "TERMS", { fontSize: 15, fontWeight: 800 }),
    T(430, 666, 320, c.invoiceTerms, { fontSize: 12, lineHeight: 1.6, h: 80, color: "#667085" }),
    ...footerBar(c),
  ];
  return { width: A4_W, height: A4_H, pages: [{ id: newPageId(), bg: "#ffffff", els }] };
}

function receiptStarter(c: CompanySettings, f: Fields): Design {
  const els: DesignEl[] = [
    { id: newElId(), type: "shape", x: 0, y: 0, w: A4_W, h: A4_H, bg: "#111111", radius: 0 },
    T(40, 44, 400, "RECEIPT", { fontSize: 60, fontWeight: 800, color: "#ffffff", h: 70 }),
    T(40, 120, 400, `Receipt No: ${f.number || ""}`, { fontSize: 16, fontWeight: 700, color: "#ffffff" }),
    logoEl(c, A4_W - 260, 44, true),
    T(A4_W - 260, 120, 220, `Date: ${f.date || ""}`, { fontSize: 15, fontWeight: 700, color: "#ffffff", align: "right" }),
    { id: newElId(), type: "shape", x: 40, y: 200, w: A4_W - 80, h: 120, bg: "#f7f7f8", radius: 16 },
    T(64, 220, 300, "Billed To", { fontSize: 17, fontWeight: 800 }),
    T(64, 250, 360, `Name: ${f.customerName || ""}\nCompany: ${f.customerCompany || ""}`, { fontSize: 14, lineHeight: 1.9, h: 50 }),
    T(A4_W / 2, 220, 260, "Payment Method", { fontSize: 17, fontWeight: 800 }),
    T(A4_W / 2, 250, 260, f.paymentMethod || "", { fontSize: 14, lineHeight: 1.9, h: 50 }),
    { id: newElId(), type: "shape", x: 40, y: 344, w: A4_W - 80, h: 260, bg: "#ffffff", radius: 16 },
    { id: newElId(), type: "shape", x: 64, y: 368, w: A4_W - 128, h: 40, bg: "#111111", radius: 8 },
    T(80, 378, 60, "No", { fontSize: 13, color: "#ffffff", fontWeight: 700 }),
    T(160, 378, 300, "Item Name", { fontSize: 13, color: "#ffffff", fontWeight: 700 }),
    T(A4_W - 220, 378, 120, "Total", { fontSize: 13, color: "#ffffff", fontWeight: 700, align: "right" }),
    T(80, 430, 60, "1", { fontSize: 14 }),
    T(160, 430, 320, f.itemName || "Payment received", { fontSize: 14 }),
    T(A4_W - 240, 430, 140, f.amount || "", { fontSize: 14, align: "right" }),
    T(A4_W - 320, 520, 130, "Total", { fontSize: 16, fontWeight: 800, align: "right" }),
    T(A4_W - 180, 520, 120, f.amount || "", { fontSize: 16, fontWeight: 800, align: "right" }),
    T(40, 660, 300, "Contact Us:", { fontSize: 15, fontWeight: 800, color: AMBER }),
    T(40, 688, 400, `${c.phone}\n${c.email}\n${c.address}, ${c.city}`, { fontSize: 13, color: "#ffffff", lineHeight: 2, h: 80 }),
    T(A4_W - 300, 700, 260, c.signatureName.toUpperCase(), { fontSize: 15, fontWeight: 800, color: "#ffffff", align: "right" }),
    T(A4_W - 300, 726, 260, "Authorized Signatory", { fontSize: 12, color: "#aaaaaa", align: "right" }),
  ];
  return { width: A4_W, height: A4_H, pages: [{ id: newPageId(), bg: "#111111", els }] };
}

// section header (page number tag + section label + logo) shared by audit body pages
function auditHead(c: CompanySettings, num: string, label: string): DesignEl[] {
  return [
    logoEl(c, A4_W - 220, 40),
    T(40, 44, 300, `${num}  ${label}`, { fontSize: 12, color: "#999999" }),
  ];
}
function auditFoot(c: CompanySettings, pageNo: string): DesignEl[] {
  return [
    { id: newElId(), type: "shape", x: 40, y: A4_H - 58, w: A4_W - 80, h: 1, bg: "#eeeeee", radius: 0 },
    T(40, A4_H - 46, 300, c.brandName, { fontSize: 11, color: "#999999" }),
    T(A4_W - 160, A4_H - 46, 120, pageNo, { fontSize: 11, color: "#999999", align: "right" }),
  ];
}

function auditStarter(c: CompanySettings, f: Fields): Design {
  const cover: DesignPage = {
    id: newPageId(), bg: "#111111",
    els: [
      logoEl(c, 40, 44, true),
      T(40, 220, 500, "DIGITAL", { fontSize: 52, fontWeight: 800, color: "#ffffff", h: 60 }),
      T(40, 278, 500, "AUDIT", { fontSize: 52, fontWeight: 800, color: AMBER, h: 60 }),
      T(40, 336, 500, "REPORT", { fontSize: 52, fontWeight: 800, color: "#ffffff", h: 60 }),
      T(40, 430, 500, f.company || "", { fontSize: 22, fontWeight: 800, color: "#ffffff" }),
      T(40, 466, 600, c.auditTagline, { fontSize: 13, color: "#bbbbbb" }),
      T(40, A4_H - 120, 240, `Prepared For\n${f.company || ""}`, { fontSize: 13, color: "#ffffff", lineHeight: 1.7, h: 50 }),
      T(300, A4_H - 120, 240, `Prepared By\n${c.brandName}`, { fontSize: 13, color: "#ffffff", lineHeight: 1.7, h: 50 }),
      T(560, A4_H - 120, 200, `Date\n${f.date || ""}`, { fontSize: 13, color: "#ffffff", lineHeight: 1.7, h: 50 }),
    ],
  };
  const summary: DesignPage = {
    id: newPageId(), bg: "#ffffff",
    els: [
      ...auditHead(c, "01", "EXECUTIVE SUMMARY"),
      T(40, 100, 460, "Your Digital Presence", { fontSize: 30, fontWeight: 800, h: 40 }),
      T(40, 140, 460, "At a Glance.", { fontSize: 30, fontWeight: 800, color: AMBER, h: 40 }),
      T(40, 200, 440, f.summary || "", { fontSize: 14, color: "#667085", lineHeight: 1.7, h: 120 }),
      { id: newElId(), type: "shape", x: A4_W - 220, y: 120, w: 160, h: 160, bg: "#fdf3d6", radius: 999 },
      T(A4_W - 220, 175, 160, f.overallScore || "0", { fontSize: 44, fontWeight: 800, align: "center", color: "#111111" }),
      T(A4_W - 220, 300, 160, "Overall Health Score", { fontSize: 12, color: "#999999", align: "center" }),
      { id: newElId(), type: "shape", x: 40, y: 400, w: A4_W - 80, h: 120, bg: "#111111", radius: 14 },
      T(64, 420, 300, "Key Takeaway", { fontSize: 15, fontWeight: 800, color: AMBER }),
      T(64, 450, A4_W - 130, f.takeaway || "", { fontSize: 14, color: "#ffffff", lineHeight: 1.6, h: 60 }),
      ...auditFoot(c, "02"),
    ],
  };

  // sample areas so every body page has real, editable content to redesign
  const sampleAreas = [
    { name: "SEO & Visibility", score: 62, status: "Needs Work", color: "#d97706" },
    { name: "Website Experience", score: 71, status: "Average", color: "#666666" },
    { name: "Social Media", score: 58, status: "Needs Work", color: "#d97706" },
    { name: "Google Business Profile", score: 84, status: "Strong", color: "#16a34a" },
    { name: "Online Reputation", score: 66, status: "Average", color: "#666666" },
  ];

  const scorecard: DesignPage = {
    id: newPageId(), bg: "#ffffff",
    els: [
      ...auditHead(c, "02", "PERFORMANCE SCORECARD"),
      T(40, 100, 520, "How We Scored", { fontSize: 30, fontWeight: 800, h: 40 }),
      T(40, 140, 520, "Each Area.", { fontSize: 30, fontWeight: 800, color: AMBER, h: 40 }),
      T(40, 190, 600, "Scores are based on industry standards and best practices.", { fontSize: 13, color: "#667085" }),
      T(40, 244, 240, "AREA", { fontSize: 12, fontWeight: 700, color: "#999999" }),
      T(A4_W - 340, 244, 120, "SCORE", { fontSize: 12, fontWeight: 700, color: "#999999" }),
      T(A4_W - 180, 244, 140, "STATUS", { fontSize: 12, fontWeight: 700, color: "#999999", align: "right" }),
      { id: newElId(), type: "shape", x: 40, y: 268, w: A4_W - 80, h: 1, bg: "#eeeeee", radius: 0 },
      ...sampleAreas.flatMap((a, i) => {
        const y = 288 + i * 64;
        return [
          T(40, y + 8, 240, a.name, { fontSize: 15, fontWeight: 600, h: 24 }),
          { id: newElId(), type: "shape", x: A4_W - 470, y: y + 16, w: 120, h: 8, bg: "#f0f0f0", radius: 999 } as DesignEl,
          { id: newElId(), type: "shape", x: A4_W - 470, y: y + 16, w: Math.round(120 * a.score / 100), h: 8, bg: AMBER, radius: 999 } as DesignEl,
          T(A4_W - 340, y + 8, 120, `${a.score}/100`, { fontSize: 14, h: 24 }),
          T(A4_W - 180, y + 8, 140, a.status, { fontSize: 14, fontWeight: 700, color: a.color, align: "right", h: 24 }),
          { id: newElId(), type: "shape", x: 40, y: y + 52, w: A4_W - 80, h: 1, bg: "#f2f2f2", radius: 0 } as DesignEl,
        ];
      }),
      ...auditFoot(c, "03"),
    ],
  };

  const findings: DesignPage = {
    id: newPageId(), bg: "#ffffff",
    els: [
      ...auditHead(c, "03", "KEY FINDINGS OVERVIEW"),
      T(40, 100, 520, "What We Found.", { fontSize: 30, fontWeight: 800, h: 40 }),
      T(40, 140, 520, "At a High Level.", { fontSize: 30, fontWeight: 800, color: AMBER, h: 40 }),
      ...[
        { t: "SEO & Visibility", d: "Ranking for only a handful of low-intent keywords; missing meta structure and local schema." },
        { t: "Website Experience", d: "Solid foundation, but slow mobile load times and unclear calls-to-action reduce conversions." },
        { t: "Social Media", d: "Inconsistent posting cadence and low engagement; no cohesive brand voice across channels." },
        { t: "Google Business Profile", d: "Well maintained and complete — a genuine strength that drives most current inbound." },
        { t: "Online Reputation", d: "Positive reviews exist but are unmanaged; no active review-generation strategy in place." },
        { t: "Paid & Retargeting", d: "No active paid funnel; a clear untapped channel for predictable, scalable lead flow." },
      ].map((card, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const x = 40 + col * ((A4_W - 80 - 32) / 3 + 16);
        const y = 210 + row * 190;
        const w = (A4_W - 80 - 32) / 3;
        return [
          { id: newElId(), type: "shape", x, y, w, h: 168, bg: "#f7f7f8", radius: 14 } as DesignEl,
          T(x + 18, y + 18, w - 36, card.t, { fontSize: 15, fontWeight: 800, h: 22 }),
          T(x + 18, y + 48, w - 36, card.d, { fontSize: 12.5, color: "#667085", lineHeight: 1.6, h: 100 }),
        ];
      }).flat(),
      { id: newElId(), type: "shape", x: 40, y: 600, w: A4_W - 80, h: 96, bg: "#111111", radius: 14 },
      T(64, 620, 300, "Overall Opportunity", { fontSize: 15, fontWeight: 800, color: AMBER }),
      T(64, 648, A4_W - 130, "Closing these gaps could realistically double qualified inbound leads within two quarters.", { fontSize: 14, color: "#ffffff", lineHeight: 1.6, h: 40 }),
      ...auditFoot(c, "04"),
    ],
  };

  const detailed: DesignPage = {
    id: newPageId(), bg: "#ffffff",
    els: [
      ...auditHead(c, "04", "DETAILED AUDIT"),
      { id: newElId(), type: "shape", x: 40, y: 96, w: 220, h: 420, bg: "#111111", radius: 16 },
      T(60, 130, 180, "SEO & VISIBILITY", { fontSize: 22, fontWeight: 800, color: AMBER, align: "center", h: 60 }),
      { id: newElId(), type: "shape", x: 90, y: 240, w: 120, h: 120, bg: "#222222", radius: 999 },
      T(90, 278, 120, "62", { fontSize: 40, fontWeight: 800, color: "#ffffff", align: "center", h: 44 }),
      T(60, 380, 180, "Score", { fontSize: 12, color: "#aaaaaa", align: "center" }),
      T(60, 420, 180, "PRIORITY", { fontSize: 12, color: "#aaaaaa", align: "center" }),
      { id: newElId(), type: "shape", x: 90, y: 444, w: 120, h: 34, bg: "#c0392b", radius: 8 },
      T(90, 452, 120, "High", { fontSize: 14, fontWeight: 700, color: "#ffffff", align: "center" }),
      T(290, 110, 300, "What's Working", { fontSize: 15, fontWeight: 800, h: 22 }),
      T(290, 138, A4_W - 340, "✓  Domain has established age and authority\n✓  Clean, crawlable URL structure", { fontSize: 13, color: "#16a34a", lineHeight: 1.9, h: 60 }),
      T(290, 230, 300, "Issues Found", { fontSize: 15, fontWeight: 800, h: 22 }),
      T(290, 258, A4_W - 340, "✕  Thin content on key service pages\n✕  Missing local business schema\n✕  Few high-intent keywords ranked", { fontSize: 13, color: "#c0392b", lineHeight: 1.9, h: 90 }),
      T(290, 380, 300, "Recommendations", { fontSize: 15, fontWeight: 800, h: 22 }),
      T(290, 408, A4_W - 340, "→  Build out service & location landing pages\n→  Add schema and optimise meta structure\n→  Target a focused high-intent keyword set", { fontSize: 13, color: "#9a7400", lineHeight: 1.9, h: 90 }),
      ...auditFoot(c, "05"),
    ],
  };

  const roadmap: DesignPage = {
    id: newPageId(), bg: "#ffffff",
    els: [
      ...auditHead(c, "05", "90-DAY ROADMAP"),
      T(40, 100, 520, "Your 90-Day", { fontSize: 30, fontWeight: 800, h: 40 }),
      T(40, 140, 520, "Growth Roadmap.", { fontSize: 30, fontWeight: 800, color: AMBER, h: 40 }),
      ...[
        { t: "Foundation", r: "0–30 Days", items: "• Website & SEO technical fixes\n• Google Business Profile optimisation\n• Analytics & conversion tracking setup" },
        { t: "Momentum", r: "30–60 Days", items: "• Content & landing page rollout\n• Social media cadence & templates\n• Review-generation workflow" },
        { t: "Scale", r: "60–90 Days", items: "• Launch paid & retargeting funnel\n• Ongoing optimisation & reporting\n• Monthly performance reviews" },
      ].map((p, i) => {
        const y = 210 + i * 140;
        return [
          { id: newElId(), type: "shape", x: 40, y, w: A4_W - 80, h: 120, bg: "#f7f7f8", radius: 14 } as DesignEl,
          { id: newElId(), type: "shape", x: 40, y, w: 5, h: 120, bg: AMBER, radius: 0 } as DesignEl,
          T(64, y + 18, 400, p.t, { fontSize: 17, fontWeight: 800, h: 24 }),
          T(A4_W - 220, y + 20, 160, p.r, { fontSize: 13, color: "#999999", align: "right", h: 22 }),
          T(64, y + 48, A4_W - 130, p.items, { fontSize: 13, color: "#444444", lineHeight: 1.8, h: 60 }),
        ];
      }).flat(),
      ...auditFoot(c, "06"),
    ],
  };

  const impact: DesignPage = {
    id: newPageId(), bg: "#ffffff",
    els: [
      ...auditHead(c, "06", "THE IMPACT"),
      T(40, 100, 520, "The Opportunity", { fontSize: 30, fontWeight: 800, h: 40 }),
      T(40, 140, 520, "Is Significant.", { fontSize: 30, fontWeight: 800, color: AMBER, h: 40 }),
      ...[
        { v: "+120%", l: "Projected organic traffic in 6 months" },
        { v: "2×", l: "Qualified inbound leads per month" },
        { v: "-35%", l: "Cost per acquisition via owned channels" },
        { v: "Top 3", l: "Local ranking for core service terms" },
      ].map((m, i) => {
        const w = (A4_W - 80 - 48) / 4;
        const x = 40 + i * (w + 16);
        return [
          { id: newElId(), type: "shape", x, y: 220, w, h: 150, bg: "#f7f7f8", radius: 14 } as DesignEl,
          T(x + 10, 250, w - 20, m.v, { fontSize: 26, fontWeight: 800, color: AMBER, align: "center", h: 34 }),
          T(x + 14, 296, w - 28, m.l, { fontSize: 12, color: "#667085", align: "center", lineHeight: 1.4, h: 60 }),
        ];
      }).flat(),
      { id: newElId(), type: "shape", x: 40, y: 430, w: A4_W - 80, h: 110, bg: "#111111", radius: 14 },
      T(64, 452, A4_W - 130, "Your growth starts with the right strategy and consistent execution.", { fontSize: 16, fontWeight: 800, color: AMBER, lineHeight: 1.4, h: 44 }),
      T(64, 500, A4_W - 130, "We're here to make it happen.", { fontSize: 14, color: "#ffffff", h: 24 }),
      ...auditFoot(c, "07"),
    ],
  };

  return { width: A4_W, height: A4_H, pages: [cover, summary, scorecard, findings, detailed, roadmap, impact] };
}
