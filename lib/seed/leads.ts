import type { Lead } from "@/lib/types";

// Mock data removed — leads come from Supabase (the store) only.
export const leads: Lead[] = [];

export function leadById(id: string) {
  return leads.find((l) => l.id === id);
}
