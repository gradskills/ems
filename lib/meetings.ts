import type { Meeting, MeetingStatus, MeetingMode, User } from "@/lib/types";
import { reportsOf } from "@/lib/seed/users";

type BadgeColor = "slate" | "primary" | "success" | "warning" | "danger" | "info" | "purple";

export const meetingStatusLabel: Record<MeetingStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};
export const meetingStatusColor: Record<MeetingStatus, BadgeColor> = {
  scheduled: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "slate",
};

export const meetingModeLabel: Record<MeetingMode, string> = {
  in_person: "In person",
  video: "Video call",
  phone: "Phone call",
};

/** Everyone who should see a meeting: organizer, invited attendees, and any
 *  manager/admin whose reporting subtree contains the organizer. */
export function visibleMeetings(viewer: User, all: Meeting[]): Meeting[] {
  if (viewer.accessLevel === "admin") return all;
  const subtree = viewer.accessLevel === "manager" ? new Set(reportsOf(viewer.id).map((u) => u.id)) : new Set<string>();
  return all.filter(
    (m) => m.organizerId === viewer.id || m.attendeeIds.includes(viewer.id) || subtree.has(m.organizerId)
  );
}

/** Sort helper: soonest upcoming first; past meetings most-recent first. */
export function splitByTime(meetings: Meeting[]) {
  const now = Date.now();
  const upcoming = meetings
    .filter((m) => m.status !== "completed" && m.status !== "cancelled" && Date.parse(m.scheduledAt) >= now - 60 * 60 * 1000)
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  const past = meetings
    .filter((m) => !upcoming.includes(m))
    .sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt));
  return { upcoming, past };
}

export function formatMeetingWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}
