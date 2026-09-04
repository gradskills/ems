import type { Ticket, AppNotification, Announcement } from "@/lib/types";

// Mock data removed — tickets, announcements & notifications come from Supabase only.
export const tickets: Ticket[] = [];
export const announcements: Announcement[] = [];
export const notifications: AppNotification[] = [];

export function notificationsFor(userId: string): AppNotification[] {
  return notifications.filter((n) => n.userId === userId);
}
