# Email (Resend)

The app sends real email through [Resend](https://resend.com) from the server.
Until this is configured, every send is a graceful no-op — the app keeps working,
document "Email" buttons fall back to opening your mail client, and credential
temp-passwords are still shown on screen.

## What sends email

| Flow | Trigger | Recipient | Where |
|------|---------|-----------|-------|
| **Employee credentials** | Onboard an employee | The new joiner | `app/api/employees/route.ts` (server-side; the temp password never reaches the browser) |
| **Client documents** | "Email" on a proposal / invoice / audit report | The client | `components/qims/ShareBar.tsx` → `POST /api/email` (document attached as HTML) |
| **Leave notifications** | An employee applies for leave | Their manager + all admins | `lib/store.ts` `applyLeave` → `POST /api/email` |

Core sender: `lib/email/send.ts`. Generic endpoint: `app/api/email/route.ts`.

## Setup (two steps — only you can do these)

1. **Add your API key** to `.env.local`:
   ```
   RESEND_API_KEY=re_xxxxxxxx
   ```
   Get one at https://resend.com/api-keys. Then restart `next dev` so it loads.

2. **Verify a sender domain** in Resend (https://resend.com/domains) — e.g.
   `gradskills.in` — and set:
   ```
   EMAIL_FROM=Gradskills EMS <hello@gradskills.in>
   ```

### Testing before you own a domain

With no verified domain, keep `EMAIL_FROM=...<onboarding@resend.dev>` (the default).
Resend's sandbox sender can **only deliver to the email address that owns the
Resend account** — sending to anyone else returns a 403 from Resend. So you can
test the credential flow by onboarding a test employee whose email is your own
Resend login, but real delivery to employees/clients needs step 2.

## Security note (prototype)

`POST /api/email` has no auth, matching the app's other prototype endpoints
(there's no server session yet). Before production, gate it behind an
authenticated session so it can't be used as an open relay.
