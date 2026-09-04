import type { MediaClient, Campaign, ContentPost } from "@/lib/types";

// Mock data removed — media clients, campaigns & content come from Supabase only.
export const mediaClients: MediaClient[] = [];
export const campaigns: Campaign[] = [];
export const contentPosts: ContentPost[] = [];

export function clientById(id: string): MediaClient | undefined {
  return mediaClients.find((c) => c.id === id);
}
