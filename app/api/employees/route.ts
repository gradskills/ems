import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSupabase } from "@/lib/supabase/server";

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

  return NextResponse.json({ ok: true, id: String(id), employeeId: `EMP-${id}` });
}
