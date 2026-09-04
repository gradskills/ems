"use client";

import { useParams } from "next/navigation";
import { EmployeeProfile } from "@/components/ems/EmployeeProfile";

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  return <EmployeeProfile employeeId={params.id} backHref="/employees" backLabel="All employees" />;
}
