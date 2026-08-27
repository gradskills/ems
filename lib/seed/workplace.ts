import type { Ticket, AppNotification, Announcement } from "@/lib/types";
import { daysAgo, hoursAgo } from "@/lib/seed/dates";

export const tickets: Ticket[] = [
  {
    id: "TK-1",
    subject: "Laptop overheating / shutting down",
    description: "My work laptop shuts off after ~1hr of Figma. Slowing down client delivery.",
    raisedById: "u-neha",
    assigneeId: "u-meera",
    departmentId: "dept-admin",
    category: "IT",
    priority: "high",
    status: "in_progress",
    createdAt: daysAgo(2),
    updatedAt: hoursAgo(5),
    comments: [
      { by: "u-meera", at: hoursAgo(6), text: "Raised with vendor, replacement fan ETA 2 days. Loaner arranged." },
    ],
  },
  {
    id: "TK-2",
    subject: "Reimbursement for client lunch",
    description: "₹2,400 spent on lunch with Green Leaf during pitch. Attaching bill.",
    raisedById: "u-arjun",
    assigneeId: "u-meera",
    departmentId: "dept-admin",
    category: "HR",
    priority: "low",
    status: "open",
    createdAt: hoursAgo(20),
    updatedAt: hoursAgo(20),
    comments: [],
  },
  {
    id: "TK-3",
    subject: "Need Canva Pro seat",
    description: "Running out of premium exports for reels. Request a Canva Pro license.",
    raisedById: "u-rahul",
    assigneeId: "u-meera",
    departmentId: "dept-admin",
    category: "Facilities",
    priority: "medium",
    status: "resolved",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(4),
    comments: [{ by: "u-meera", at: daysAgo(4), text: "Seat added under team plan. Invite sent." }],
  },
];

export const announcements: Announcement[] = [
  {
    id: "AN-1",
    title: "Independence Day holiday — office closed 15 Aug",
    body: "Wishing everyone a happy Independence Day! Office and support are closed on the 15th. Client escalations go to on-call managers.",
    authorId: "u-meera",
    at: daysAgo(10),
    audience: "all",
    pinned: true,
  },
  {
    id: "AN-2",
    title: "Q3 targets are live",
    body: "Sales targets for Jul–Sep are now on your Performance page. Managers, please do your 1:1s by Friday.",
    authorId: "u-admin",
    at: daysAgo(5),
    audience: "all",
  },
  {
    id: "AN-3",
    title: "Tech: switching to trunk-based deploys",
    body: "From next sprint we deploy from main behind feature flags. Vikram will run a 30-min walkthrough.",
    authorId: "u-vikram",
    at: daysAgo(3),
    audience: "dept-tech",
  },
];

export const notifications: AppNotification[] = [
  { id: "N-1", userId: "u-mgr", kind: "leave", title: "Leave request from Arjun Nair", body: "2 days casual leave awaiting your approval", at: daysAgo(1), read: false, href: "/leaves" },
  { id: "N-2", userId: "u-admin", kind: "approval", title: "Quotation needs approval", body: "18% discount on Green Leaf combo exceeds manager limit", at: hoursAgo(6), read: false, href: "/proposals" },
  { id: "N-3", userId: "u-vikram", kind: "leave", title: "Leave request from Neha Gupta", body: "1 day sick leave awaiting your approval", at: hoursAgo(3), read: false, href: "/leaves" },
  { id: "N-4", userId: "u-priya", kind: "task", title: "New task assigned", body: "Follow up Sharma Sweets on advance invoice — due today", at: daysAgo(1), read: false, href: "/tasks" },
  { id: "N-5", userId: "u-priya", kind: "announcement", title: "Q3 targets are live", at: daysAgo(5), read: true, href: "/announcements" },
  { id: "N-6", userId: "u-aditya", kind: "task", title: "Task moved to blocked", body: "Booking widget → Calendly OAuth is blocked on client creds", at: hoursAgo(9), read: false, href: "/tasks" },
  { id: "N-7", userId: "u-ananya", kind: "ticket", title: "New content pending approval", body: "Sharma Sweets festive hamper carousel", at: hoursAgo(12), read: false, href: "/content" },
];

export function notificationsFor(userId: string): AppNotification[] {
  return notifications.filter((n) => n.userId === userId);
}
