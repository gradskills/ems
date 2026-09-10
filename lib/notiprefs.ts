// Per-user notification preferences, saved on the device (prototype — mirrors the
// clock-reminder settings pattern). These gate the in-app noise a user wants to see.

export interface NotificationPrefs {
  leave: boolean;        // leave request decisions
  task: boolean;         // task assignments / updates
  approval: boolean;     // items awaiting / resolved approval
  meeting: boolean;      // meeting invites & reminders
  announcement: boolean; // company & department announcements
  invoice: boolean;      // invoice / payment activity
}

export function defaultNotificationPrefs(): NotificationPrefs {
  return { leave: true, task: true, approval: true, meeting: true, announcement: true, invoice: true };
}

const key = (userId: string) => `notiPrefs:${userId}`;

export function readNotificationPrefs(userId: string): NotificationPrefs {
  const fallback = defaultNotificationPrefs();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key(userId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export function writeNotificationPrefs(userId: string, prefs: NotificationPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(userId), JSON.stringify(prefs));
  } catch { /* ignore */ }
}
