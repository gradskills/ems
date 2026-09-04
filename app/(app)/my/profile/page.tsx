"use client";

import { useApp } from "@/lib/store";
import { EmployeeProfile } from "@/components/ems/EmployeeProfile";

// An employee's own profile — same view admins/managers see for a team member,
// scoped to the acting user. `/my/*` isn't gated, so employees can reach it.
export default function MyProfilePage() {
  const actingUserId = useApp((s) => s.actingUserId);
  return <EmployeeProfile employeeId={actingUserId} backHref="/my" backLabel="My Dashboard" />;
}
