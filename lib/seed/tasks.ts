import type { Task } from "@/lib/types";
import { daysAgo, daysFromNow } from "@/lib/seed/dates";

export const tasks: Task[] = [
  // Tech
  { id: "T-1", title: "Wire Razorpay webhook → order status", assigneeId: "u-aditya", createdById: "u-vikram", departmentId: "dept-tech", projectId: "PRJ-1", status: "in_progress", priority: "high", createdAt: daysAgo(4), dueAt: daysFromNow(2), estimateHrs: 8, loggedHrs: 5, tags: ["backend"] },
  { id: "T-2", title: "Product grid empty-state + skeletons", assigneeId: "u-neha", createdById: "u-vikram", departmentId: "dept-tech", projectId: "PRJ-1", status: "review", priority: "medium", createdAt: daysAgo(3), dueAt: daysFromNow(1), estimateHrs: 5, loggedHrs: 5, tags: ["frontend"] },
  { id: "T-3", title: "Booking widget → Calendly OAuth", assigneeId: "u-aditya", createdById: "u-vikram", departmentId: "dept-tech", projectId: "PRJ-3", status: "todo", priority: "urgent", createdAt: daysAgo(1), dueAt: daysFromNow(1), estimateHrs: 6, loggedHrs: 0, tags: ["integration"] },
  { id: "T-4", title: "Seed data for Sales OS demo", assigneeId: "u-karan", createdById: "u-vikram", departmentId: "dept-tech", projectId: "PRJ-4", status: "in_progress", priority: "medium", createdAt: daysAgo(2), dueAt: daysFromNow(3), estimateHrs: 10, loggedHrs: 4, tags: ["data"] },
  { id: "T-5", title: "Fix mobile nav overlap (iOS Safari)", assigneeId: "u-neha", createdById: "u-vikram", departmentId: "dept-tech", projectId: "PRJ-3", status: "blocked", priority: "high", createdAt: daysAgo(2), dueAt: daysFromNow(1), estimateHrs: 3, loggedHrs: 1, tags: ["bug", "frontend"] },
  { id: "T-6", title: "Handover doc for Kadam Interiors", assigneeId: "u-neha", createdById: "u-vikram", departmentId: "dept-tech", projectId: "PRJ-2", status: "done", priority: "low", createdAt: daysAgo(22), estimateHrs: 2, loggedHrs: 2 },

  // BDA
  { id: "T-7", title: "Follow up Sharma Sweets on advance invoice", assigneeId: "u-priya", createdById: "u-mgr", departmentId: "dept-bda", status: "todo", priority: "high", createdAt: daysAgo(1), dueAt: daysFromNow(0), tags: ["collections"] },
  { id: "T-8", title: "Prepare quotation for Green Leaf combo", assigneeId: "u-arjun", createdById: "u-mgr", departmentId: "dept-bda", status: "in_progress", priority: "medium", createdAt: daysAgo(2), dueAt: daysFromNow(1) },
  { id: "T-9", title: "Clean up South-region lead list", assigneeId: "u-fatima", createdById: "u-mgr", departmentId: "dept-bda", status: "todo", priority: "low", createdAt: daysAgo(5), dueAt: daysFromNow(4) },

  // Media
  { id: "T-10", title: "August reel calendar — Sharma Sweets", assigneeId: "u-rahul", createdById: "u-ananya", departmentId: "dept-media", status: "in_progress", priority: "high", createdAt: daysAgo(3), dueAt: daysFromNow(2), tags: ["content"] },
  { id: "T-11", title: "Scale Meta ads for Green Leaf (₹500/day)", assigneeId: "u-isha", createdById: "u-ananya", departmentId: "dept-media", status: "review", priority: "medium", createdAt: daysAgo(2), dueAt: daysFromNow(1), tags: ["ads"] },
  { id: "T-12", title: "Monthly analytics deck — all clients", assigneeId: "u-rahul", createdById: "u-ananya", departmentId: "dept-media", status: "todo", priority: "medium", createdAt: daysAgo(1), dueAt: daysFromNow(5) },
];

export function tasksFor(userId: string): Task[] {
  return tasks.filter((t) => t.assigneeId === userId);
}
