"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { leadById } from "@/lib/seed/leads";
import { packageById } from "@/lib/seed/users";
import { Button, Badge } from "@/components/ui/primitives";
import { inr, formatDate } from "@/lib/utils";
import { Sparkles, Check, X, Mail, Phone, ShieldCheck, FileText } from "lucide-react";

function lineTotals(items: { qty: number; unitPrice: number; discountPct: number; gstRate: number }[]) {
  let subtotal = 0, gst = 0;
  for (const i of items) {
    const base = i.qty * i.unitPrice * (1 - i.discountPct / 100);
    subtotal += base;
    gst += base * (i.gstRate / 100);
  }
  return { subtotal, gst, total: subtotal + gst };
}

export default function CustomerPortalPage() {
  const params = useParams<{ token: string }>();
  const proposals = useApp((s) => s.proposals);
  const company = useApp((s) => s.company);
  const customerDecision = useApp((s) => s.customerDecision);

  const p = proposals.find((x) => x.shareToken === params.token);

  const [signedIn, setSignedIn] = useState<{ via: "gmail" | "otp"; contact: string } | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  if (!p) {
    return (
      <Wrapper>
        <div className="py-16 text-center">
          <FileText className="mx-auto mb-3 text-[var(--muted-2)]" size={36} />
          <h1 className="text-lg font-semibold">Quotation not found</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">This link is invalid or was opened in a fresh session. Open it from the same demo session where it was generated.</p>
        </div>
      </Wrapper>
    );
  }

  const lead = leadById(p.leadId);
  const totals = lineTotals(p.items);
  const decided = p.customer?.decision;

  return (
    <Wrapper>
      {/* Branded header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] text-white"><Sparkles size={18} /></div>
          <div>
            <div className="font-bold">{company.brandName}</div>
            <div className="text-[11px] text-[var(--muted-2)]">{company.website}</div>
          </div>
        </div>
        <div className="text-right text-[11px] text-[var(--muted)]">
          <div>GSTIN {company.gstin}</div>
          <div>{company.phone}</div>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Quotation {p.number}</h1>
            <p className="text-sm text-[var(--muted)]">Prepared for {lead?.company} · valid till {formatDate(p.validTill)}</p>
          </div>
          {decided && <Badge color={decided === "accepted" ? "success" : "danger"} dot>{decided}</Badge>}
        </div>

        {/* Line items */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-xs font-semibold uppercase text-[var(--muted)]">
                <th className="px-4 py-2.5">Service</th>
                <th className="px-4 py-2.5">Qty</th>
                <th className="px-4 py-2.5">Rate</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {p.items.map((it, i) => {
                const pkg = packageById(it.packageId);
                const base = it.qty * it.unitPrice * (1 - it.discountPct / 100);
                return (
                  <tr key={i} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{it.name}</div>
                      <div className="text-[11px] text-[var(--muted-2)]">{pkg?.tagline} · {it.billingType === "retainer" ? "monthly" : "one-time"}{it.discountPct > 0 ? ` · ${it.discountPct}% off` : ""}</div>
                    </td>
                    <td className="px-4 py-3">{it.qty}</td>
                    <td className="px-4 py-3">{inr(it.unitPrice)}</td>
                    <td className="px-4 py-3 text-right font-medium">{inr(base)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-[var(--muted)]">Subtotal</span><span>{inr(totals.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted)]">GST</span><span>{inr(totals.gst)}</span></div>
            <div className="flex justify-between border-t border-[var(--border)] pt-1 text-base font-bold"><span>Total</span><span>{inr(totals.total)}</span></div>
          </div>
        </div>

        {/* Decision area */}
        <div className="mt-6 border-t border-[var(--border)] pt-6">
          {decided ? (
            <div className={`rounded-xl p-5 text-center ${decided === "accepted" ? "bg-[var(--success-soft)]" : "bg-[var(--danger-soft)]"}`}>
              <div className="text-sm font-semibold">{decided === "accepted" ? "Thank you — quotation accepted!" : "Quotation declined"}</div>
              <p className="mt-1 text-xs text-[var(--muted)]">{decided === "accepted" ? "Our team will reach out to kick off onboarding." : p.customer?.rejectReason}</p>
            </div>
          ) : !signedIn ? (
            <div className="mx-auto max-w-sm text-center">
              <ShieldCheck className="mx-auto mb-2 text-[var(--muted-2)]" size={26} />
              <h2 className="text-sm font-semibold">Verify to accept or decline</h2>
              <p className="mb-4 text-xs text-[var(--muted)]">Sign in so we know it&apos;s really you. (Demo — no real account needed.)</p>
              <Button className="w-full" variant="outline" onClick={() => setSignedIn({ via: "gmail", contact: lead?.email || "client@gmail.com" })}>
                <Mail size={16} /> Continue with Google
              </Button>
              <div className="my-3 text-[11px] uppercase text-[var(--muted-2)]">or</div>
              {!otpSent ? (
                <div className="flex gap-2">
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="h-10 flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm" />
                  <Button onClick={() => phone && setOtpSent(true)}><Phone size={16} /> Send OTP</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP (any 4 digits)" className="h-10 flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm" />
                  <Button onClick={() => otp.length >= 4 && setSignedIn({ via: "otp", contact: phone })}>Verify</Button>
                </div>
              )}
            </div>
          ) : rejecting ? (
            <div className="mx-auto max-w-sm">
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Reason for declining (optional)</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Budget, timing, going with someone else…" />
              <div className="mt-2 flex gap-2">
                <Button variant="ghost" onClick={() => setRejecting(false)}>Back</Button>
                <Button variant="danger" className="flex-1" onClick={() => customerDecision(params.token, "rejected", signedIn.via, signedIn.contact, reason || "No reason given")}><X size={16} /> Confirm decline</Button>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-sm gap-2">
              <Button variant="danger" className="flex-1" onClick={() => setRejecting(true)}><X size={16} /> Decline</Button>
              <Button variant="success" className="flex-1" onClick={() => customerDecision(params.token, "accepted", signedIn.via, signedIn.contact)}><Check size={16} /> Accept quotation</Button>
            </div>
          )}
          {signedIn && !decided && <div className="mt-3 text-center text-[11px] text-[var(--muted-2)]">Signed in via {signedIn.via === "gmail" ? "Google" : "phone OTP"} · {signedIn.contact}</div>}
        </div>
      </div>
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-8">
      <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] sm:p-8">
        {children}
      </div>
    </div>
  );
}
