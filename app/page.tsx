"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { homePathFor } from "@/lib/ems";
import { AppShellSkeleton } from "@/components/ui/skeleton";

export default function Home() {
  const router = useRouter();
  const hydrateAuth = useApp((s) => s.hydrateAuth);
  const authReady = useApp((s) => s.authReady);
  const authUserId = useApp((s) => s.authUserId);
  const employees = useApp((s) => s.employees);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    if (!authReady) return;
    if (!authUserId) { router.replace("/login"); return; }
    const u = employees.find((e) => e.id === authUserId);
    router.replace(u?.mustChangePassword ? "/account/password?forced=1" : homePathFor(u));
  }, [authReady, authUserId, employees, router]);

  return <AppShellSkeleton />;
}
