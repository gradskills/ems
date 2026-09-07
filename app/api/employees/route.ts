import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSupabase } from "@/lib/supabase/server";
import { sendEmail, renderEmailHtml } from "@/lib/email/send";

// POST /api/employees — create a new employee (user) with a hashed password.
// Body: the fields the onboarding modal collects plus the generated loginId +
// tempPassword. Returns the new numeric id so the client can reconcile it.
export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 }); }

  const sb = getServerSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: "Server not configured." }, { status: 500 });

  const accessLevel = String(b.accessLevel ?? "employee");
  const dbRole = accessLevel === "admin" ? "admin" : accessLevel === "manager" ? "tl" : "intern";
  const monthly = Number(b.monthlyCtc ?? 0);
  const basic = Math.round(monthly * 0.5), hra = Math.round(monthly * 0.2);
  const tempPassword = String(b.tempPassword ?? "");
  let hash = "";
  try { hash = tempPassword ? await bcrypt.hash(tempPassword, 10) : ""; } catch { /* leave empty */ }

  const insert = {
    name: b.name ?? "",
    email: b.email ?? "",
    phone_number: b.phone ?? null,
    role: dbRole,
    access_level: accessLevel,
    department_id: b.departmentId ?? null,
    manager_id: b.managerId ? Number(b.managerId) : null,
    designation: b.designation ?? null,
    status: "active",
    // Manager-created joiners start unapproved; an admin grants feature access.
    approval_status: b.approvalStatus === "pending" ? "pending" : "approved",
    employment_type: b.employmentType ?? "full_time",
    location: b.location ?? null,
    ctc_annual: monthly * 12,
    salary: { basic, hra, special: monthly - basic - hra },
    leave_balance: { casual: 12, sick: 8, earned: 0 },
    login_id: b.loginId ?? null,
    password_hash: hash,
    must_change_password: true,
  };

  const { data, error } = await sb.from("users").insert(insert).select("id").single();
  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Could not create employee." }, { status: 500 });
  }
  const id = (data as { id: number }).id;
  // stamp a readable employee code now that we know the id
  await sb.from("users").update({ employee_id: `EMP-${id}` }).eq("id", id);

  // ── email the new joiner their login credentials (best-effort) ──
  // The plaintext temp password only exists here, server-side; it never goes
  // to the browser. If email isn't configured the send is a graceful no-op.
  const toEmail = String(b.email ?? "").trim();
  const loginId = String(b.loginId ?? "");
  const name = String(b.name ?? "there");
  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const loginUrl = `${origin}/login`;
  let emailSent = false;
  if (toEmail && tempPassword) {
    const body =
      `Hi ${name.split(" ")[0] || name},\n\n` +
      `Your Gradskills EMS account is ready. Sign in with the credentials below and set a new password on first login.\n\n` +
      `Login page: ${loginUrl}\n` +
      `Login ID: ${loginId}\n` +
      `Temporary password: ${tempPassword}\n\n` +
      `For your security, please change this password right after signing in.`;
    const r = await sendEmail({
      to: toEmail,
      subject: "Your Gradskills EMS login",
      text: body,
      html: renderEmailHtml({ heading: "Welcome to Gradskills EMS", body, footer: "If you didn't expect this, please ignore this email." }),
    });
    emailSent = r.ok;
    if (!r.ok && !r.skipped) console.warn("[employees] credential email failed:", r.error);
  }

  return NextResponse.json({ ok: true, id: String(id), employeeId: `EMP-${id}`, emailSent });
}
