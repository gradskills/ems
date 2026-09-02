import type { Proposal, Invoice, Lead, CompanySettings, PaymentRecord, PaymentMode, AuditReport, Milestone } from "@/lib/types";
import { packageById } from "@/lib/seed/users";

const rupee = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

const esc = (s: string | undefined) => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ── quotation totals ──
export function proposalTotals(p: Proposal) {
  const acc = { oneTime: 0, retainer: 0, gst: 0, base: 0 };
  for (const it of p.items) {
    const base = it.qty * it.unitPrice * (1 - it.discountPct / 100);
    const gst = base * (it.gstRate / 100);
    acc.base += base;
    acc.gst += gst;
    if (it.billingType === "retainer") acc.retainer += base + gst;
    else acc.oneTime += base + gst;
  }
  return { ...acc, grand: acc.base + acc.gst };
}

// ── open a print window (Save as PDF), with a Blob fallback if popups are blocked ──
export function printDocument(html: string, filename: string) {
  const win = window.open("", "_blank", "width=900,height=1100");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
    return;
  }
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function mailto({ to, subject, body }: { to?: string; subject: string; body: string }) {
  return `mailto:${to ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
export function whatsapp({ phone, text }: { phone?: string; text: string }) {
  const num = (phone ?? "").replace(/[^0-9]/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

// ─────────────────────────────────────────────────────────────
// Shared branding
// ─────────────────────────────────────────────────────────────
const AMBER = "#F5B301";

function logoBlock(c: CompanySettings, opts?: { light?: boolean; size?: number }) {
  const h = opts?.size ?? 40;
  const txtColor = opts?.light ? "#ffffff" : "#111111";
  if (c.logoDataUrl) {
    return `<img src="${c.logoDataUrl}" alt="${esc(c.brandName)}" style="height:${h + 8}px;max-width:230px;object-fit:contain" />`;
  }
  return `<div style="line-height:1">
    <div style="font-size:${h * 0.62}px;font-weight:800;letter-spacing:-.5px;color:${txtColor}">${esc(c.brandName)}</div>
    ${c.tagline ? `<div style="display:inline-block;margin-top:6px;font-size:11px;font-weight:600;color:${opts?.light ? "#111" : "#fff"};background:${opts?.light ? "#fff" : "#111"};border-radius:6px;padding:3px 9px">${esc(c.tagline)}</div>` : ""}
  </div>`;
}

function htmlDoc(title: string, css: string, inner: string, embed = false) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1b2330; background:${embed ? "#fff" : "#e9eaed"}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 210mm; min-height: 297mm; margin: ${embed ? "0 auto" : "12px auto"}; background:#fff; position:relative; overflow:hidden; box-shadow:${embed ? "none" : "0 6px 24px rgba(0,0,0,.14)"}; }
  .pad { padding: 20mm 16mm; }
  .right { text-align:right; } .center { text-align:center; }
  .muted { color:#667085; }
  .print-btn { position:fixed; top:16px; right:16px; z-index:99; background:${AMBER}; color:#111; border:0; border-radius:9px; padding:11px 18px; font-weight:700; cursor:pointer; box-shadow:0 4px 14px rgba(0,0,0,.2); font-size:14px; }
  @media print { .print-btn { display:none; } body { background:#fff; } .page { margin:0; box-shadow:none; page-break-after: always; } .page:last-child { page-break-after:auto; } }
  ${css}
</style></head><body>
${embed ? "" : `<button class="print-btn" onclick="window.print()">⬇ Save as PDF</button>`}
${inner}
</body></html>`;
}

// generic report/document wrapper (kept for payslips & reports pages)
export function wrapDocument(title: string, innerHtml: string) {
  return htmlDoc(title, `
    .doc{max-width:780px;margin:0 auto}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${AMBER};padding-bottom:16px;margin-bottom:24px}
    .brand{font-size:22px;font-weight:800}
    h1{font-size:18px;margin:0 0 2px}
    table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}
    th{text-align:left;background:#f1f3f6;color:#667085;font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:8px 10px}
    td{padding:9px 10px;border-bottom:1px solid #e3e7ec}
    .totrow td{font-weight:700;border-top:2px solid #1b2330}
    .box{border:1px solid #e3e7ec;border-radius:10px;padding:14px 16px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .pill{display:inline-block;background:#fff5da;color:#8a6d00;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:600}
    .note{font-size:11px;color:#98a2b3;margin-top:8px}
    .foot{margin-top:28px;border-top:1px solid #e3e7ec;padding-top:12px;font-size:11px;color:#98a2b3;text-align:center}
  `, `<div class="page"><div class="pad"><div class="doc">
    ${innerHtml}
    <div class="foot">Computer-generated document.</div>
  </div></div></div>`);
}

// icon circle used by quotation/invoice item rows
function iconCircle(svg: string) {
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:999px;background:#fdf3d6;color:#9a7400">${svg}</span>`;
}
const ICON = {
  globe: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>`,
  shield: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="m9 12 2 2 4-4"/></svg>`,
  doc: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3v5h5"/><path d="M14 3H6v18h12V8z"/></svg>`,
  bank: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10l9-6 9 6"/><path d="M4 10v9h16v-9M9 19v-6h6v6"/></svg>`,
  card: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>`,
  phone: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.4 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/></svg>`,
  mail: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7 10-7"/></svg>`,
};

function contactBar(c: CompanySettings, dark = false) {
  const col = dark ? "#fff" : "#333";
  return `<div style="display:flex;flex-wrap:wrap;gap:10px 26px;align-items:center;justify-content:center;font-size:13px;color:${col}">
    <span style="display:inline-flex;align-items:center;gap:8px;color:${col}"><span style="color:${AMBER}">${ICON.phone}</span>${esc(c.phone)}</span>
    <span style="display:inline-flex;align-items:center;gap:8px;color:${col}"><span style="color:${AMBER}">${ICON.mail}</span>${esc(c.email)}</span>
    <span style="display:inline-flex;align-items:center;gap:8px;color:${col}"><span style="color:${AMBER}">${ICON.globe}</span>${esc(c.website)}</span>
  </div>`;
}

// ─────────────────────────────────────────────────────────────
// QUOTATION  (matches provided design)
// ─────────────────────────────────────────────────────────────
export function quotationHtml(p: Proposal, lead: Lead | undefined, c: CompanySettings, opts: { embed?: boolean; milestones?: { label: string; pct: number }[] } = {}) {
  const milestones = opts.milestones;
  const t = proposalTotals(p);
  const rows = p.items
    .map((it) => {
      const pkg = packageById(it.packageId);
      const base = it.qty * it.unitPrice * (1 - it.discountPct / 100);
      return `<tr>
        <td style="padding:18px 16px;border-bottom:1px solid #eee">
          <div style="display:flex;align-items:center;gap:14px">${iconCircle(ICON.globe)}
            <div><div style="font-weight:700;text-transform:uppercase;font-size:15px">${esc(it.name)}</div>
            <div class="muted" style="font-size:12px">SAC ${esc(it.sacCode)} · ${it.billingType === "retainer" ? "monthly retainer" : "one-time"}${pkg ? ` · ${pkg.timelineDays} days` : ""}${it.discountPct ? ` · −${it.discountPct}%` : ""}</div></div>
          </div>
        </td>
        <td class="right" style="padding:18px 16px;border-bottom:1px solid #eee;font-weight:700">${rupee(base)}</td>
      </tr>`;
    })
    .join("");

  const ms = (milestones && milestones.length ? milestones : [{ label: "Project kickoff", pct: 50 }, { label: "Delivery", pct: 50 }]);
  const milestoneHtml = ms.map((m) => `<div style="font-weight:700;font-size:13px">${esc(m.label.toUpperCase())} - ${m.pct}%</div>`).join("");

  const inner = `<div class="page" style="${opts.embed ? "min-height:auto" : ""}">
    <div style="position:absolute;top:0;right:0;width:34%;height:12px;background:${AMBER}"></div>
    <div class="pad" style="padding-top:16mm;${opts.embed ? "padding-bottom:8mm" : ""}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>${logoBlock(c, { size: 42 })}</div>
        <div class="right" style="font-size:13px;line-height:1.7">
          <div style="font-weight:800">COMPANY: ${esc(c.brandName.toUpperCase())}</div>
          <div class="muted">Reg. ID: ${esc(c.regId)}</div>
          <div class="muted">Address: ${esc(c.address)},</div>
          <div class="muted">${esc(c.city)}, ${esc(c.state)}-${esc(c.pincode)}</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:34px">
        <div style="border-left:4px solid ${AMBER};padding-left:14px">
          <div style="color:${AMBER};font-weight:800;letter-spacing:.5px;margin-bottom:8px">BILLED TO</div>
          <div style="font-size:15px">Customer Name: ${esc(lead?.contactName ?? "")}</div>
          <div style="font-size:15px">Company: ${esc(lead?.company ?? "")}</div>
        </div>
        <div class="right" style="font-size:13px;line-height:2">
          <div style="display:flex;justify-content:flex-end;align-items:center;gap:10px"><span><div style="font-weight:700">QUOTE:</div><div class="muted">${esc(p.number)}</div></span>${iconCircle(ICON.doc)}</div>
          <div style="display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:6px"><span><div style="font-weight:700">DATE:</div><div class="muted">${dateFmt(p.createdAt)}</div></span>${iconCircle(ICON.doc)}</div>
          <div style="display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:6px"><span><div style="font-weight:700">PROJECT COST:</div><div class="muted">${rupee(t.grand)}</div></span>${iconCircle("₹")}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-top:26px">
        <thead><tr style="background:#111;color:#fff">
          <th style="text-align:left;padding:16px;font-size:14px;letter-spacing:.5px">ITEM DESCRIPTION</th>
          <th class="right" style="padding:16px;font-size:14px;letter-spacing:.5px">PRICE</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-top:2px">
        <div style="display:flex;background:#f4f4f5;align-items:stretch">
          <div style="padding:16px 24px;font-weight:800;font-size:17px;display:flex;align-items:center">GRAND TOTAL</div>
          <div style="padding:16px 28px;font-weight:800;font-size:17px;background:${AMBER};display:flex;align-items:center">${rupee(t.grand)}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">${iconCircle(ICON.bank)}<div style="font-weight:800;font-size:16px">BANK DETAILS</div></div>
          <div style="font-size:13px;line-height:2.1">
            <div><b>BANK NAME:</b> ${esc(c.bankName)}</div>
            <div><b>ACCOUNT HOLDER NAME:</b> ${esc(c.accountHolder)}</div>
            <div><b>ACCOUNT NUMBER:</b> ${esc(c.accountNo)}</div>
            <div><b>ACCOUNT TYPE:</b> ${esc(c.accountType)}</div>
            <div><b>IFSC CODE:</b> ${esc(c.ifsc)}</div>
          </div>
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">${iconCircle(ICON.card)}<div style="font-weight:800;font-size:16px">PAYMENT MILESTONES</div></div>
          <div style="line-height:2.1">${milestoneHtml}</div>
          <div style="display:flex;align-items:center;gap:10px;margin:22px 0 10px">${iconCircle(ICON.doc)}<div style="font-weight:800;font-size:16px">TERMS</div></div>
          <div class="muted" style="font-size:13px">${esc(c.quotationTerms)}</div>
        </div>
      </div>
    </div>
    <div style="${opts.embed ? "margin-top:32px" : "position:absolute;bottom:0;left:0;right:0"};background:#111;padding:16px">${contactBar(c, true)}</div>
  </div>`;
  return htmlDoc(`Quotation ${p.number}`, "", inner, opts.embed);
}

// ─────────────────────────────────────────────────────────────
// INVOICE  (matches provided design)
// ─────────────────────────────────────────────────────────────
export function invoiceHtml(iv: Invoice, lead: Lead | undefined, c: CompanySettings, opts: { embed?: boolean } = {}) {
  const rows = `<tr>
      <td style="padding:16px;border-bottom:1px solid #eee;font-weight:700;text-transform:uppercase">${esc(iv.milestone ?? "Professional services")}</td>
      <td class="center" style="padding:16px;border-bottom:1px solid #eee">1</td>
      <td class="right" style="padding:16px;border-bottom:1px solid #eee">${rupee(iv.subtotal)}</td>
      <td class="right" style="padding:16px;border-bottom:1px solid #eee">${rupee(iv.subtotal)}</td>
    </tr>`;
  const statusUpper = iv.status.replace("_", " ").toUpperCase();
  const paid = iv.received;
  const balance = iv.total - iv.tdsAmount - iv.received;

  const inner = `<div class="page" style="${opts.embed ? "min-height:auto" : ""}"><div class="pad" style="${opts.embed ? "padding-bottom:8mm" : ""}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div style="display:flex;gap:22px;align-items:flex-start">
        <div>${logoBlock(c, { size: 40 })}</div>
        <div style="font-size:13px;line-height:1.7;border-left:1px solid #e3e7ec;padding-left:22px">
          <div style="font-weight:800">COMPANY: ${esc(c.brandName.toUpperCase())}</div>
          <div class="muted">Reg ID: ${esc(c.regId)}</div>
          <div class="muted">Address: ${esc(c.address)},</div>
          <div class="muted">${esc(c.city)}, ${esc(c.state)}-${esc(c.pincode)}</div>
        </div>
      </div>
      <div style="font-size:13px;line-height:1.5">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="color:${AMBER}">${ICON.doc}</span><span><b>INVOICE:</b><br>${esc(iv.number)}</span></div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="color:${AMBER}">${ICON.doc}</span><span><b>DATE:</b><br>${dateFmt(iv.issuedAt)}</span></div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="color:${AMBER}">${ICON.doc}</span><span><b>DUE DATE:</b><br>${dateFmt(iv.dueAt)}</span></div>
        <div style="display:flex;align-items:center;gap:8px"><span style="color:${AMBER}">${ICON.doc}</span><span><b>TOTAL DUE:</b><br>${rupee(balance)}</span></div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:30px">
      <div>
        <div style="color:${AMBER};font-weight:800;margin-bottom:8px">BILLED TO</div>
        <div style="font-size:13px;line-height:1.9">
          <div><b>Customer Name:</b> ${esc(lead?.contactName ?? iv.company)}</div>
          <div><b>Company:</b> ${esc(iv.company)}</div>
          ${lead?.email ? `<div><b>Email:</b> ${esc(lead.email)}</div>` : ""}
          ${lead?.phone ? `<div><b>Phone:</b> ${esc(lead.phone)}</div>` : ""}
          ${lead?.city ? `<div><b>Address:</b> ${esc(lead.city)}</div>` : ""}
        </div>
      </div>
      <div style="background:#f4f4f5;border-radius:12px;padding:16px 24px;text-align:center;min-width:180px">
        <div class="muted" style="font-size:12px;font-weight:700;letter-spacing:.5px">INVOICE STATUS</div>
        <div style="margin-top:8px;display:inline-block;background:#fff2c9;color:#8a6d00;font-weight:800;padding:8px 22px;border-radius:8px">${statusUpper}</div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:26px">
      <thead><tr style="background:#111;color:#fff">
        <th style="text-align:left;padding:15px 16px">ITEM DESCRIPTION</th>
        <th class="center" style="padding:15px 16px">QTY</th>
        <th class="right" style="padding:15px 16px">RATE</th>
        <th class="right" style="padding:15px 16px">AMOUNT</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-top:6px">
      <div style="width:320px;font-size:13px">
        <div style="display:flex;justify-content:space-between;padding:6px 0"><span class="muted">SUBTOTAL</span><span>${rupee(iv.subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0"><span class="muted">TAX</span><span>${rupee(iv.gst)}</span></div>
        ${iv.tdsAmount ? `<div style="display:flex;justify-content:space-between;padding:6px 0"><span class="muted">TDS</span><span>− ${rupee(iv.tdsAmount)}</span></div>` : ""}
        <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:1px solid #ddd;font-weight:800;font-size:16px"><span>GRAND TOTAL</span><span>${rupee(iv.total)}</span></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:34px">
      <div>
        <div style="color:#1e3a8a;font-weight:800;border-bottom:2px solid ${AMBER};display:inline-block;padding-bottom:4px;margin-bottom:12px">BANK DETAILS:</div>
        <div style="font-size:13px;line-height:2">
          <div><b>BANK NAME:</b> ${esc(c.bankName)}</div>
          <div><b>ACCOUNT HOLDER NAME:</b> ${esc(c.accountHolder)}</div>
          <div><b>ACCOUNT NUMBER:</b> ${esc(c.accountNo)}</div>
          <div><b>ACCOUNT TYPE:</b> ${esc(c.accountType)}</div>
          <div><b>IFSC CODE:</b> ${esc(c.ifsc)}</div>
        </div>
      </div>
      <div>
        <div style="color:#1e3a8a;font-weight:800;border-bottom:2px solid ${AMBER};display:inline-block;padding-bottom:4px;margin-bottom:12px">PAYMENT SUMMARY:</div>
        <div style="font-size:13px">
          <div style="display:flex;justify-content:space-between;padding:6px 0"><span class="muted">INVOICE TOTAL</span><span>${rupee(iv.total)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:6px 0"><span class="muted">AMOUNT PAID</span><span>${rupee(paid)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:12px;background:#fff6d8;border-radius:8px;font-weight:800;margin-top:6px"><span>BALANCE DUE</span><span>${rupee(balance)}</span></div>
        </div>
        <div style="color:#1e3a8a;font-weight:800;margin-top:18px">TERMS:</div>
        <div class="muted" style="font-size:12px;margin-top:4px">${esc(c.invoiceTerms)}</div>
      </div>
    </div>
  </div>
  <div style="${opts.embed ? "margin-top:28px" : "position:absolute;bottom:0;left:0;right:0"};background:#f7f7f8;padding:16px">${contactBar(c)}</div>
  </div>`;
  return htmlDoc(`Invoice ${iv.number}`, "", inner, opts.embed);
}

// ─────────────────────────────────────────────────────────────
// RECEIPT  (dark theme, matches provided design)
// ─────────────────────────────────────────────────────────────
const modeLabel: Record<PaymentMode, string> = {
  cash: "CASH", upi: "UPI", cheque: "CHEQUE", netbanking: "Netbanking", card: "Card", bank_transfer: "Bank Transfer",
};

export function receiptHtml(pay: PaymentRecord, c: CompanySettings, opts: { embed?: boolean } = {}) {
  const inner = `<div class="page" style="background:#111;color:#fff">
    <div class="pad">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:60px;font-weight:800;line-height:1">RECEIPT</div>
          <div style="margin-top:8px;font-size:15px;font-weight:700">Receipt No: <span style="color:${AMBER}">${esc(pay.receiptNumber)}</span></div>
        </div>
        <div class="right">
          ${logoBlock(c, { light: true, size: 40 })}
          <div style="margin-top:14px;font-size:15px;font-weight:700">Date: <span style="color:${AMBER}">${dateFmt(pay.at)}</span></div>
        </div>
      </div>

      <div style="background:#f7f7f8;color:#111;border-radius:16px;padding:22px 26px;margin-top:28px;display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div>
          <div style="font-weight:800;font-size:17px;margin-bottom:8px">Billed To</div>
          <div style="font-size:14px;line-height:2"><b>Name:</b> ${esc(pay.contactName ?? "")}</div>
          <div style="font-size:14px;line-height:2"><b>Company:</b> ${esc(pay.company)}</div>
        </div>
        <div style="border-left:1px solid #ddd;padding-left:20px">
          <div style="font-weight:800;font-size:17px;margin-bottom:8px">Payment Method</div>
          <div style="font-size:14px;line-height:2">• ${modeLabel[pay.mode]}${pay.reference ? ` (${esc(pay.reference)})` : ""}</div>
        </div>
      </div>

      <div style="background:#fff;color:#111;border-radius:16px;padding:22px 26px;margin-top:18px">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#111;color:#fff">
            <th style="text-align:left;padding:14px 16px;border-radius:8px 0 0 8px">No</th>
            <th style="text-align:left;padding:14px 16px">Item Name</th>
            <th class="right" style="padding:14px 16px;border-radius:0 8px 8px 0">Total</th>
          </tr></thead>
          <tbody>
            <tr><td style="padding:22px 16px">1</td><td style="padding:22px 16px">${esc(pay.note || "Payment received")}</td><td class="right" style="padding:22px 16px">${rupee(pay.amount)}</td></tr>
          </tbody>
        </table>
        <div style="display:flex;justify-content:flex-end;margin-top:30px">
          <div style="width:300px;border-top:1px solid #ddd;padding-top:14px;font-size:14px">
            <div style="display:flex;justify-content:space-between;padding:6px 0"><span>Sub Total</span><span>${rupee(pay.amount)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:6px 0"><span>Tax</span><span>—</span></div>
            <div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:800;font-size:16px;border-top:1px solid #ddd"><span>Total</span><span>${rupee(pay.amount)}</span></div>
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:34px">
        <div>
          <div style="color:${AMBER};font-weight:800;margin-bottom:10px">Contact Us:</div>
          <div style="font-size:13px;line-height:2">
            <div style="display:flex;align-items:center;gap:8px"><span style="color:${AMBER}">${ICON.phone}</span>${esc(c.phone)}</div>
            <div style="display:flex;align-items:center;gap:8px"><span style="color:${AMBER}">${ICON.mail}</span>${esc(c.email)}</div>
            <div style="display:flex;align-items:center;gap:8px"><span style="color:${AMBER}">${ICON.globe}</span>${esc(c.address)}, ${esc(c.city)}</div>
          </div>
        </div>
        <div class="right">
          ${c.signatureDataUrl ? `<img src="${c.signatureDataUrl}" style="height:56px;object-fit:contain;filter:invert(1)"/>` : `<div style="font-family:cursive;font-size:26px;color:${AMBER}">${esc(c.signatureName)}</div>`}
          <div style="border-top:1px solid #444;margin-top:6px;padding-top:6px;font-weight:800">${esc(c.signatureName.toUpperCase())}</div>
          <div class="muted" style="color:#aaa;font-size:12px">Authorized Signatory</div>
        </div>
      </div>
    </div>
  </div>`;
  return htmlDoc(`Receipt ${pay.receiptNumber}`, "", inner, opts.embed);
}

// ─────────────────────────────────────────────────────────────
// AUDIT REPORT  (multi-page, matches provided 8-page design)
// Sections render only when data is present, so a BDA can skip any.
// ─────────────────────────────────────────────────────────────
function scoreRingSvg(score: number, size = 120, color = AMBER) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ - (score / 100) * circ;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#eee" stroke-width="10"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${off}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="47%" text-anchor="middle" font-size="${size * 0.26}" font-weight="800" fill="#111">${score}</text>
    <text x="50%" y="63%" text-anchor="middle" font-size="${size * 0.1}" fill="#999">/100</text>
  </svg>`;
}
function bar(score: number) {
  return `<div style="height:8px;background:#eee;border-radius:99px;width:120px;overflow:hidden"><div style="height:100%;width:${score}%;background:${AMBER}"></div></div>`;
}

export function auditReportHtml(r: AuditReport, lead: Lead | undefined, c: CompanySettings, opts: { embed?: boolean } = {}) {
  const overall = r.overallScore ?? r.score;
  const areas = r.areas ?? [];
  const findAreas = areas.filter((a) => a.summary);
  const detailed = areas.filter((a) => (a.working?.length || a.issues?.length || a.recommendations?.length));
  const statusColorOf = (s: string) => /good|strong/i.test(s) ? "#16a34a" : /average/i.test(s) ? "#666" : "#d97706";

  // Content flows section-by-section (no forced full-height pages), so the document
  // stays compact and reflows as sections are added/removed. Only the cover and the
  // closing page are full A4 pages. Sections avoid breaking across pages when printed.
  const css = `
    .flow{min-height:auto;overflow:visible;box-shadow:${opts.embed ? "none" : "0 6px 24px rgba(0,0,0,.14)"}}
    .flow .pad{padding:16mm}
    .sec{padding:22px 0}
    .sec:first-child{padding-top:2px}
    .sec + .sec{border-top:1px solid #ededed}
    .kick{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
    .kick .n{font-size:12.5px;color:#9aa1ab;letter-spacing:.02em}
    .kick .n b{color:#111;font-size:14px}
    .h{font-size:24px;font-weight:800;line-height:1.18}
    .callout{background:#111;color:#fff;border-radius:14px;padding:16px 20px;margin-top:16px}
    .callout .t{color:${AMBER};font-weight:800;margin-bottom:5px}
    @media print { .sec{ page-break-inside:avoid; } }
  `;
  const kick = (num: string, label: string) => `<div class="kick"><div class="n"><b>${num}</b> &nbsp; ${esc(label)}</div>${logoBlock(c, { size: 22 })}</div>`;

  const parts: string[] = [];

  // Cover — full page (dark)
  parts.push(`<div class="page" style="background:#111;color:#fff">
    <div class="pad" style="display:flex;flex-direction:column;min-height:297mm">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">${logoBlock(c, { light: true, size: 40 })}</div>
      <div style="margin-top:60px">
        <div style="font-size:52px;font-weight:800;line-height:1.05">DIGITAL<br><span style="color:${AMBER}">AUDIT</span><br>REPORT</div>
        <div style="margin-top:34px;font-size:22px;font-weight:800">${esc(r.company)}</div>
        <div class="muted" style="color:#bbb;margin-top:8px;font-size:13px">${esc(c.auditTagline)}</div>
      </div>
      <div style="margin-top:auto;display:flex;gap:60px">
        <div><div class="muted" style="color:#888;font-size:12px">Prepared For</div><div style="font-weight:700;margin-top:4px">${esc(r.company)}</div></div>
        <div><div class="muted" style="color:#888;font-size:12px">Prepared By</div><div style="font-weight:700;margin-top:4px">${esc(c.brandName)}</div></div>
        <div><div class="muted" style="color:#888;font-size:12px">Date</div><div style="font-weight:700;margin-top:4px">${longDate(r.createdAt)}</div></div>
      </div>
    </div>
  </div>`);

  // ── flowing content sections ──
  const areaTile = (a: { name: string; score: number; status: string }) => `<div style="border:1px solid #eee;border-radius:14px;padding:14px;text-align:center">
    <div style="font-weight:700;font-size:13px">${esc(a.name)}</div>
    <div style="font-size:22px;font-weight:800;margin-top:6px">${a.score}<span style="font-size:12px;color:#999">/100</span></div>
    <div style="font-size:12px;font-weight:700;margin-top:2px;color:${statusColorOf(a.status)}">${esc(a.status)}</div>
  </div>`;
  const topAreas = areas.slice(0, 4);
  const secs: string[] = [];

  // Executive summary
  secs.push(`<section class="sec">
    ${kick("01", "EXECUTIVE SUMMARY")}
    <div style="display:flex;justify-content:space-between;align-items:center;gap:28px">
      <div style="flex:1">
        <div class="h">Your Digital Presence <span style="color:${AMBER}">At a Glance.</span></div>
        <p class="muted" style="margin-top:12px;font-size:14px;line-height:1.7;max-width:440px">${esc(r.summary)}</p>
      </div>
      <div class="center" style="flex-shrink:0">${scoreRingSvg(overall, 132)}<div class="muted" style="font-size:12px;margin-top:6px">Overall Digital<br>Health Score</div></div>
    </div>
    ${topAreas.length ? `<div style="display:grid;grid-template-columns:repeat(${Math.min(4, topAreas.length)},1fr);gap:12px;margin-top:20px">${topAreas.map(areaTile).join("")}</div>` : ""}
    ${r.takeaway ? `<div class="callout"><div class="t">Key Takeaway</div><div style="font-size:14px;line-height:1.6">${esc(r.takeaway)}</div></div>` : ""}
  </section>`);

  // Scorecard
  if (areas.length) {
    secs.push(`<section class="sec">
      ${kick("02", "PERFORMANCE SCORECARD")}
      <div class="h">How We Scored <span style="color:${AMBER}">Each Area.</span></div>
      <p class="muted" style="margin-top:8px;font-size:13px">Scores are based on industry standards and best practices.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">
        <thead><tr style="text-align:left;color:#999;border-bottom:1px solid #eee"><th style="padding:10px 8px">Area</th><th></th><th style="padding:10px 8px">Score</th><th style="padding:10px 8px">Status</th></tr></thead>
        <tbody>${areas.map((a) => `<tr style="border-bottom:1px solid #f2f2f2"><td style="padding:11px 8px;font-weight:600">${esc(a.name)}</td><td>${bar(a.score)}</td><td style="padding:11px 8px">${a.score}/100</td><td style="padding:11px 8px;color:${statusColorOf(a.status)};font-weight:700">${esc(a.status)}</td></tr>`).join("")}</tbody>
      </table>
    </section>`);
  }

  // Key findings overview
  if (findAreas.length) {
    secs.push(`<section class="sec">
      ${kick("03", "KEY FINDINGS OVERVIEW")}
      <div class="h">What We Found. <span style="color:${AMBER}">At a High Level.</span></div>
      <div style="display:grid;grid-template-columns:repeat(${Math.min(3, findAreas.length)},1fr);gap:14px;margin-top:16px">
        ${findAreas.map((a) => `<div style="border:1px solid #eee;border-radius:14px;padding:16px"><div style="font-weight:800;font-size:15px;margin-bottom:6px">${esc(a.name)}</div><div class="muted" style="font-size:12.5px;line-height:1.6">${esc(a.summary)}</div></div>`).join("")}
      </div>
      ${r.overallOpportunity ? `<div class="callout"><div class="t">Overall Opportunity</div><div style="font-size:14px;line-height:1.6">${esc(r.overallOpportunity)}</div></div>` : ""}
    </section>`);
  }

  // Detailed audit — one block per area, stacked
  detailed.forEach((a, i) => {
    const list = (title: string, items: string[] | undefined, sym: string, col: string) =>
      items && items.length ? `<div style="margin-bottom:16px"><div style="font-weight:800;font-size:15px;margin-bottom:8px">${title}</div>${items.map((x) => `<div style="display:flex;gap:8px;font-size:13px;margin-bottom:6px"><span style="color:${col}">${sym}</span><span>${esc(x)}</span></div>`).join("")}</div>` : "";
    secs.push(`<section class="sec">
      ${kick(i === 0 ? "04" : "", i === 0 ? "DETAILED AUDIT" : `${esc(a.name.toUpperCase())}`)}
      <div style="display:grid;grid-template-columns:180px 1fr;gap:24px;align-items:start">
        <div style="background:#111;color:#fff;border-radius:16px;padding:20px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:${AMBER};margin:4px 0 12px">${esc(a.name.toUpperCase())}</div>
          <div style="margin:6px 0">${scoreRingSvg(a.score, 104)}</div>
          <div class="muted" style="color:#aaa;font-size:12px">Score</div>
          ${a.priority ? `<div style="margin-top:14px"><div class="muted" style="color:#aaa;font-size:12px;margin-bottom:6px">Priority</div><span style="display:inline-block;background:${a.priority === "High" ? "#c0392b" : a.priority === "Medium" ? "#d97706" : "#16a34a"};padding:5px 16px;border-radius:8px;font-weight:700">${esc(a.priority)}</span></div>` : ""}
        </div>
        <div>
          ${list("What's Working", a.working, "✓", "#16a34a")}
          ${list("Issues Found", a.issues, "✕", "#c0392b")}
          ${list("Recommendations", a.recommendations, "→", AMBER)}
        </div>
      </div>
    </section>`);
  });

  // Roadmap
  if (r.roadmap?.length) {
    secs.push(`<section class="sec">
      ${kick("05", "90-DAY ROADMAP")}
      <div class="h">Your 90-Day <span style="color:${AMBER}">Growth Roadmap.</span></div>
      <div style="margin-top:16px">${r.roadmap.map((p) => `<div style="border:1px solid #eee;border-radius:14px;padding:16px 20px;margin-bottom:12px"><div style="font-weight:800;font-size:16px">${esc(p.title)} <span class="muted" style="font-weight:600;font-size:13px">(${esc(p.range)})</span></div><ul style="margin:8px 0 0 18px;font-size:13px;line-height:1.8;color:#444">${p.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}</div>
    </section>`);
  }

  // Impact
  if (r.impact?.length) {
    secs.push(`<section class="sec">
      ${kick("06", "THE IMPACT")}
      <div class="h">The Opportunity <span style="color:${AMBER}">Is Significant.</span></div>
      <div style="display:grid;grid-template-columns:repeat(${Math.min(4, r.impact.length)},1fr);gap:14px;margin-top:18px">
        ${r.impact.map((m) => `<div style="border:1px solid #eee;border-radius:14px;padding:18px 14px;text-align:center"><div style="font-size:24px;font-weight:800;color:${AMBER}">${esc(m.value)}</div><div class="muted" style="font-size:12px;margin-top:8px;line-height:1.4">${esc(m.label)}</div></div>`).join("")}
      </div>
      <div class="callout"><div class="t">Your growth starts with the right strategy and consistent execution.</div><div style="margin-top:4px">We&apos;re here to make it happen.</div></div>
    </section>`);
  }

  parts.push(`<div class="page flow"><div class="pad">${secs.join("")}</div></div>`);

  // Thank-you — full page (dark)
  parts.push(`<div class="page" style="background:#111;color:#fff"><div class="pad" style="min-height:297mm;display:flex;flex-direction:column">
    <div class="right">${logoBlock(c, { light: true, size: 34 })}</div>
    <div style="margin-top:40px"><div style="font-size:48px;font-weight:800">Thank <span style="color:${AMBER}">You.</span></div>
    <p class="muted" style="color:#bbb;margin-top:16px;max-width:420px;font-size:14px;line-height:1.7">We appreciate the opportunity to audit ${esc(r.company)}&apos;s digital presence. With the right strategy and execution, we can achieve outstanding results together.</p></div>
    <div style="margin-top:auto">
      <div style="color:${AMBER};font-weight:800;font-size:18px;margin-bottom:16px">Let&apos;s Build Something Great.</div>
      <div style="font-size:14px;line-height:2.2">
        <div style="display:flex;align-items:center;gap:10px"><span style="color:${AMBER}">${ICON.phone}</span>${esc(c.phone)}</div>
        <div style="display:flex;align-items:center;gap:10px"><span style="color:${AMBER}">${ICON.mail}</span>${esc(c.email)}</div>
        <div style="display:flex;align-items:center;gap:10px"><span style="color:${AMBER}">${ICON.globe}</span>${esc(c.website)}</div>
      </div>
    </div>
  </div></div>`);

  return htmlDoc(`Audit Report — ${r.company}`, css, parts.join(""), opts.embed);
}

// ── message builders ──
export function proposalMessage(p: Proposal, lead?: Lead) {
  const t = proposalTotals(p);
  const subject = `Proposal ${p.number} — ${lead?.company ?? ""}`;
  const body = `Dear ${lead?.contactName?.split(" ")[0] ?? "there"},

Thank you for your time. Please find our proposal ${p.number} for ${lead?.company ?? "your business"}.

Grand total (incl. GST): ${rupee(t.grand)}${t.retainer > 0 ? ` (incl. ${rupee(t.retainer)}/mo retainer)` : ""}
Valid till ${longDate(p.validTill)}.

Happy to walk you through it on a quick call.

Warm regards`;
  return { subject, body };
}

export function invoiceMessage(iv: Invoice, lead?: Lead) {
  const subject = `Invoice ${iv.number} — ${rupee(iv.total)}`;
  const body = `Dear ${lead?.contactName?.split(" ")[0] ?? "Sir/Madam"},

Please find invoice ${iv.number} for ${iv.milestone ?? "services rendered"}.

Amount (incl. GST): ${rupee(iv.total)}
Due date: ${longDate(iv.dueAt)}

You can pay via the link provided or bank transfer. Thank you for your business.`;
  return { subject, body };
}

export function receiptMessage(pay: PaymentRecord) {
  const subject = `Payment received — ${pay.receiptNumber}`;
  const body = `Dear ${pay.contactName?.split(" ")[0] ?? "Sir/Madam"},

We confirm receipt of ${rupee(pay.amount)} via ${modeLabel[pay.mode]}${pay.reference ? ` (ref ${pay.reference})` : ""} on ${longDate(pay.at)}.

Receipt no: ${pay.receiptNumber}

Thank you.`;
  return { subject, body };
}

export function auditMessage(r: AuditReport, lead?: Lead) {
  const subject = `Digital Audit Report — ${r.company}`;
  const body = `Dear ${lead?.contactName?.split(" ")[0] ?? "there"},

Please find our digital audit report for ${r.company}. Overall digital-health score: ${r.overallScore ?? r.score}/100.

We'd love to walk you through the findings and the 90-day growth roadmap.

Warm regards`;
  return { subject, body };
}

// unused-milestone type import guard (keeps Milestone referenced for consumers)
export type { Milestone };
