"use client";

import { redirect } from "next/navigation";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";

// Clock in/out now lives on the combined "My Dashboard" (/my) alongside breaks,
// tasks, leaves and attendance. This route is kept as a redirect so existing
// links/bookmarks still work. Admins go to the live who's-in board instead.
export default function ClockPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const me = userById(actingUserId);
  redirect(me?.accessLevel === "admin" ? "/attendance" : "/my");
}
