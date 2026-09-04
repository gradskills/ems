import type { Project } from "@/lib/types";

// Mock data removed — projects come from Supabase only.
export const projects: Project[] = [];

export function projectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}
export function projectsForMember(userId: string): Project[] {
  return projects.filter((p) => p.memberIds.includes(userId) || p.managerId === userId);
}
