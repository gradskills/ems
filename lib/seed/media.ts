import type { MediaClient, Campaign, ContentPost } from "@/lib/types";
import { daysAgo, daysFromNow } from "@/lib/seed/dates";

export const mediaClients: MediaClient[] = [
  {
    id: "MC-1",
    company: "Sharma Sweets",
    contact: "Rajesh Sharma",
    status: "active",
    ownerId: "u-rahul",
    departmentId: "dept-media",
    platforms: ["Instagram", "Facebook"],
    monthlyRetainer: 30000,
    since: daysAgo(120),
    deliverables: [
      { id: "D1", label: "Feed posts", soldQty: 16, deliveredQty: 11, approvedByClient: true, period: "Aug 2025" },
      { id: "D2", label: "Reels", soldQty: 8, deliveredQty: 5, approvedByClient: false, period: "Aug 2025" },
      { id: "D3", label: "Story sets", soldQty: 12, deliveredQty: 9, approvedByClient: true, period: "Aug 2025" },
    ],
  },
  {
    id: "MC-2",
    company: "Green Leaf Ayurveda",
    contact: "Dr. Menon",
    status: "onboarding",
    ownerId: "u-isha",
    departmentId: "dept-media",
    platforms: ["Instagram", "Meta Ads"],
    monthlyRetainer: 55000,
    since: daysAgo(20),
    deliverables: [
      { id: "D4", label: "Feed posts", soldQty: 24, deliveredQty: 6, approvedByClient: false, period: "Aug 2025" },
      { id: "D5", label: "Ad creatives", soldQty: 10, deliveredQty: 4, approvedByClient: true, period: "Aug 2025" },
    ],
  },
  {
    id: "MC-3",
    company: "Urban Threads",
    contact: "Nikhil Bose",
    status: "active",
    ownerId: "u-rahul",
    departmentId: "dept-media",
    platforms: ["Instagram"],
    monthlyRetainer: 25000,
    since: daysAgo(210),
    deliverables: [
      { id: "D6", label: "Feed posts", soldQty: 12, deliveredQty: 12, approvedByClient: true, period: "Aug 2025" },
    ],
  },
  {
    id: "MC-4",
    company: "Cafe Mocha",
    contact: "Reena Pillai",
    status: "paused",
    ownerId: "u-isha",
    departmentId: "dept-media",
    platforms: ["Instagram", "Google Ads"],
    monthlyRetainer: 20000,
    since: daysAgo(300),
    deliverables: [
      { id: "D7", label: "Feed posts", soldQty: 12, deliveredQty: 3, approvedByClient: false, period: "Aug 2025" },
    ],
  },
];

export const campaigns: Campaign[] = [
  { id: "CMP-1", clientId: "MC-2", name: "Monsoon Wellness Push", status: "running", channel: "Meta Ads", startAt: daysAgo(10), reach: 84200, engagement: 4.6, spend: 18500, leads: 47 },
  { id: "CMP-2", clientId: "MC-1", name: "Rakhi Gift Boxes", status: "completed", channel: "Instagram", startAt: daysAgo(35), endAt: daysAgo(12), reach: 121000, engagement: 6.1, spend: 22000, leads: 63 },
  { id: "CMP-3", clientId: "MC-3", name: "New Autumn Drop", status: "scheduled", channel: "Instagram", startAt: daysFromNow(4), reach: 0, engagement: 0, spend: 0, leads: 0 },
  { id: "CMP-4", clientId: "MC-1", name: "Ganesh Chaturthi Specials", status: "draft", channel: "Meta Ads", startAt: daysFromNow(9), reach: 0, engagement: 0, spend: 0, leads: 0 },
];

export const contentPosts: ContentPost[] = [
  { id: "CP-1", clientId: "MC-1", title: "Kaju Katli behind-the-scenes reel", channel: "Instagram", scheduledAt: daysFromNow(1), status: "approved", ownerId: "u-rahul" },
  { id: "CP-2", clientId: "MC-1", title: "Festive hamper carousel", channel: "Instagram", scheduledAt: daysFromNow(2), status: "pending_approval", ownerId: "u-rahul" },
  { id: "CP-3", clientId: "MC-2", title: "5 signs of poor gut health", channel: "Instagram", scheduledAt: daysFromNow(3), status: "draft", ownerId: "u-isha" },
  { id: "CP-4", clientId: "MC-2", title: "Patient testimonial — Mrs. Nair", channel: "Instagram", scheduledAt: daysFromNow(5), status: "idea", ownerId: "u-isha" },
  { id: "CP-5", clientId: "MC-3", title: "Autumn lookbook teaser", channel: "Instagram", scheduledAt: daysFromNow(4), status: "scheduled", ownerId: "u-rahul" },
  { id: "CP-6", clientId: "MC-1", title: "Independence Day tricolour sweets", channel: "Instagram", scheduledAt: daysAgo(9), status: "published", ownerId: "u-rahul" },
];

export function clientById(id: string): MediaClient | undefined {
  return mediaClients.find((c) => c.id === id);
}
