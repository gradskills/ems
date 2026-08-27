import type { Meeting } from "@/lib/types";
import { hoursAgo, daysFromNow, daysAgo, todayAt } from "@/lib/seed/dates";

export const meetings: Meeting[] = [
  {
    id: "MTG-101",
    title: "Discovery call — Sharma Sweets & Caterers",
    organizerId: "u-priya",
    attendeeIds: ["u-mgr"],
    leadId: "L-101",
    scheduledAt: todayAt(16, 0),
    durationMin: 45,
    mode: "video",
    location: "https://meet.pixelforge.in/spice-route",
    agenda: "Understand their delivery-first goals and pitch the Social — Growth retainer.",
    status: "scheduled",
    insights: [
      { id: "MN-1", authorId: "u-priya", at: hoursAgo(3), text: "No website yet — big opportunity. Owner is active on Instagram (12k followers) but posts inconsistently. Budget signal: recently ran paid ads." },
      { id: "MN-2", authorId: "u-priya", at: hoursAgo(2), text: "Decision maker is the owner (Rahul). Wants footfall from nearby offices. Competitor 'Curry Culture' has a slick site — use as a reference." },
    ],
    minutes: [],
    createdAt: daysAgo(1),
  },
  {
    id: "MTG-102",
    title: "Proposal review — Urban Fitness Studio",
    organizerId: "u-priya",
    attendeeIds: ["u-mgr", "u-admin"],
    leadId: "L-103",
    scheduledAt: daysFromNow(1),
    durationMin: 30,
    mode: "in_person",
    location: "Client office, Bandra Kurla Complex",
    agenda: "Walk the client through the ₹55k 5-page website quotation and close on scope.",
    status: "scheduled",
    insights: [
      { id: "MN-3", authorId: "u-priya", at: hoursAgo(20), text: "They pushed back on timeline last call — reassure with the 21-day plan. Admin (Rohan) joining to sign off on a 5% discount if needed." },
    ],
    minutes: [],
    createdAt: daysAgo(2),
  },
  {
    id: "MTG-103",
    title: "Kickoff — Blossom Play School",
    organizerId: "u-arjun",
    attendeeIds: ["u-mgr"],
    leadId: "L-105",
    scheduledAt: hoursAgo(26),
    durationMin: 60,
    mode: "video",
    location: "https://meet.pixelforge.in/urban-threads",
    agenda: "Project kickoff after signed quotation — align on content calendar.",
    status: "completed",
    insights: [
      { id: "MN-4", authorId: "u-arjun", at: daysAgo(2), text: "Signed the Social — Pro retainer. Client contact is the marketing lead, Ananya. Expect fast turnarounds." },
    ],
    minutes: [
      { id: "MN-5", authorId: "u-arjun", at: hoursAgo(25), text: "Agreed on 3 posts/week + 2 reels. First content batch due next Friday. Client to share brand assets by Wednesday." },
      { id: "MN-6", authorId: "u-mgr", at: hoursAgo(25), text: "Flagged that reels need the client's product shots — Arjun to chase. Next review in 2 weeks." },
    ],
    createdAt: daysAgo(4),
  },
];
