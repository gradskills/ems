import type { Task } from "@/lib/types";

// Mock data removed — tasks come from Supabase only.
export const tasks: Task[] = [];

export function tasksFor(userId: string): Task[] {
  return tasks.filter((t) => t.assigneeId === userId);
}
