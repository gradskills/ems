import type { AuditEntry } from "@/lib/types";
import { daysAgo, hoursAgo, todayAt } from "./dates";

// Append-only change log — seeded with a realistic mix.
export const auditLog: AuditEntry[] = [
  { id: "AU-1", at: hoursAgo(1), actorId: "u-priya", actorRole: "bda", action: "update", entity: "lead", entityId: "L-103", entityLabel: "Urban Fitness Studio", field: "stage", before: "proposal_sent", after: "negotiation" },
  { id: "AU-2", at: hoursAgo(2), actorId: "u-priya", actorRole: "bda", action: "create", entity: "call", entityId: "C-3", entityLabel: "Green Leaf Ayurveda — call", after: "connected, 4m 49s" },
  { id: "AU-3", at: daysAgo(2), actorId: "u-admin", actorRole: "admin", action: "update", entity: "lead", entityId: "L-107", entityLabel: "Coastal Seafood Exports", field: "estimatedValue", before: "150000", after: "175000", reason: "Client added AMC to the deal after sign-off" },
  { id: "AU-4", at: daysAgo(2), actorId: "u-priya", actorRole: "bda", action: "create", entity: "proposal", entityId: "P-2", entityLabel: "QT/2025-26/0039 — Green Leaf", after: "Social Growth ₹30,000/mo" },
  { id: "AU-5", at: daysAgo(3), actorId: "u-priya", actorRole: "bda", action: "update", entity: "lead", entityId: "L-107", entityLabel: "Coastal Seafood Exports", field: "stage", before: "negotiation", after: "won" },
  { id: "AU-6", at: daysAgo(3), actorId: "u-mgr", actorRole: "manager", action: "view_recording", entity: "call", entityId: "C-1", entityLabel: "Sharma Sweets — call recording", reason: "Coaching review" },
  { id: "AU-7", at: daysAgo(4), actorId: "u-mgr", actorRole: "manager", action: "approve", entity: "proposal", entityId: "P-3", entityLabel: "QT/2025-26/0036 — Urban Fitness", after: "Discount 55% on Social Pro approved" },
  { id: "AU-8", at: daysAgo(5), actorId: "u-admin", actorRole: "admin", action: "export", entity: "leads", entityId: "bulk", entityLabel: "Lead export (West Sales)", after: "42 rows exported to CSV", reason: "Monthly backup" },
  { id: "AU-9", at: daysAgo(1), actorId: "u-admin", actorRole: "admin", action: "update", entity: "lead", entityId: "L-202", entityLabel: "Spice Route Restaurant", field: "ownerId", before: "u-arjun", after: "u-arjun", reason: "Reviewed SLA breach — left with Arjun, flagged for follow-up", impersonating: undefined },
  { id: "AU-10", at: todayAt(9, 2), actorId: "u-priya", actorRole: "bda", action: "login", entity: "session", entityId: "s-1", entityLabel: "Priya Sharma login" },
  { id: "AU-11", at: daysAgo(6), actorId: "u-admin", actorRole: "admin", action: "update", entity: "lead", entityId: "L-105", entityLabel: "Blossom Play School", field: "ownerId", before: "u-fatima", after: "u-priya", reason: "Reassigned — territory correction (Pune → West team)" },
];
