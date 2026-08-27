# PixelForge Sales OS — BDA Platform (Clickable Prototype)

A seeded, clickable prototype of a sales platform for **Business Development Agents (BDAs)** at a
B2B digital agency (social content, websites, outreach). Built to validate the end-to-end
experience with real BDAs and admins **before** committing to the production backend (real
telephony, transcription, GST invoicing, integrations).

> This is a **prototype**. Calls, transcription, emails, invoices and integrations are realistically
> **mocked** with seeded data. Everything is structured so the mocked pieces swap to real
> implementations later without redesigning the UI or data model.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 → redirects to **Today**.

Build / checks:

```bash
npm run build
npx tsc --noEmit
npx eslint .
```

## Deploy

Zero-config on **Vercel** (recommended for Next.js). From this folder:

```bash
npx vercel
```

Follow the prompts (link/create a project, accept defaults) → you get a live preview URL; `npx vercel --prod` promotes it to production. No environment variables are required — the app runs entirely on seeded, in-session data.

> Prototype note: all state (attendance, breaks, tasks, quotations, the customer-portal share link) lives in the browser session and resets on a hard reload. That's intended for the demo; the data model is shaped to swap to Supabase/Postgres later without redesigning the UI.

## Stack

Next.js 16 (App Router, TS) · React 19 · Tailwind v4 · Zustand (in-session state) · lucide-react.
No external services — runs fully offline. Seed data lives in `lib/seed/*`; swap for Supabase later.

## Demo walkthrough (the story to tell)

Use the **role switcher** (bottom-left sidebar) to move between BDA, Manager and Admin views.

0. **Create anything** — **New lead** button on Today/Leads (full form → saves to the list & audit log);
   **New quotation** in the builder; **New invoice** on `/invoices` or from a lead. Every document can be
   **Downloaded as PDF** (opens a branded print view → Save as PDF) and **Sent via Email or WhatsApp**
   (prefilled `mailto:` / `wa.me`), which also logs the send to the timeline + audit.
1. **Today** (`/today`) — the BDA's prioritized call list with "why this lead" reason chips + target tracker.
2. **Call flow** — hit **Call** on *Sharma Sweets*: dialer → disposition → watch it "transcribe" → review
   AI-extracted fields (requirement, budget, timeline, next step) and accept/reject each.
3. **Lead detail** (`/leads/L-101`) — 60-second brief, AI insights, activity timeline, **Hinglish transcript**,
   duplicate-contact warning (see `L-106`), proposals, call history.
4. **Pipeline** (`/pipeline`) — drag leads across stages; Won/Lost asks for a reason.
5. **Quotation builder** (`/proposals/new?proposal=P-3`) — service packages → live proposal document
   (scope, portfolio, one-time + retainer pricing, GST/TDS note), AI-drafted email, discount approval,
   **Save → Download PDF / Send (Email · WhatsApp)**.
5b. **Invoices** (`/invoices`) — GST invoices with CGST/SGST + **TDS** (194C/194J), ageing, create/view/
   download/send. Outstanding, collected, overdue and recurring summaries.
6. **Prospect audit** (`/prospect-audit`) — enter a company → digital-health report + suggested opener.
   Try *Sharma Sweets*, *Kadam Interiors*, *Green Leaf Ayurveda*.
7. **My performance** (`/performance`) — commission tracker, targets, best-time-to-call heatmap.
8. **Admin dashboard** (`/dashboard`, switch to Rohan/Sneha) — funnel, **lead leakage & SLA alerts**, per-BDA scorecard.
9. **Edit with reason** — as Admin, open any lead → **Edit** → change a field → mandatory reason → lands in the audit log.
10. **Audit log** (`/audit`) — append-only change trail, filterable, before/after diffs.
11. **Reports** (`/reports`) — daily digest, weekly manager pack, on-demand **person dossier**.
12. **Delivery** (`/delivery`) — onboarding checklist, deliverables sold-vs-delivered + **scope-creep flag**,
    project stages, client-portal preview, retainer renewal reminder.

## What's mocked vs real

| Mocked (prototype) | Real later |
|---|---|
| `tel:` link + manual disposition | Cloud telephony / companion-app recording |
| Pre-written transcripts + AI insights | STT (Sarvam/Deepgram) + Claude extraction |
| "Sent" email/WhatsApp states | Resend / WhatsApp Business API |
| Invoice UI with sample GST + TDS math | Zoho Books integration |
| Prospect audit on seeded companies | Live website/SSL/social/GMB checks |
| Role toggle | Supabase auth + Postgres RLS |

## Project structure

```
app/(app)/            route screens (today, leads, pipeline, proposals, prospect-audit,
                      performance, dashboard, audit, reports, delivery)
components/ui/         design-system primitives (Card, Button, Badge, Modal, …)
components/bda/        CallFlow, AiReviewPanel, Timeline, EditFieldModal, StageMoveMenu
components/layout/     Shell (sidebar, topbar, role switcher), nav config
lib/types.ts          domain model (mirrors eventual Postgres tables)
lib/store.ts          Zustand store — mutable in-session state + audit logging
lib/seed/*            seeded agency data (users, leads, calls, proposals, audit, prospects…)
```
