import type { FormDef, FormResponse } from "@/lib/types";
import { daysAgo } from "@/lib/seed/dates";

export const forms: FormDef[] = [
  {
    id: "FRM-1",
    token: "get-started",
    title: "Get a Free Digital Audit",
    description: "Tell us about your business and we'll put together a free audit of your online presence.",
    ownerId: "u-priya",
    createdAt: daysAgo(20),
    published: true,
    autoCreateLead: true,
    responseCount: 2,
    fields: [
      { id: "f1", label: "Business name", type: "short_text", required: true, mapTo: "company" },
      { id: "f2", label: "Your name", type: "short_text", required: true, mapTo: "contactName" },
      { id: "f3", label: "Email", type: "email", required: true, mapTo: "email" },
      { id: "f4", label: "Phone (WhatsApp)", type: "phone", required: true, mapTo: "phone" },
      { id: "f5", label: "City", type: "short_text", mapTo: "city" },
      { id: "f6", label: "Industry", type: "short_text", mapTo: "industry" },
      { id: "f7", label: "What are you interested in?", type: "select", options: ["Website", "Social media", "Outreach", "Combo"], mapTo: "interest" },
      { id: "f8", label: "Anything else we should know?", type: "long_text", mapTo: "note" },
    ],
  },
];

export const formResponses: FormResponse[] = [
  {
    id: "FR-1",
    formId: "FRM-1",
    at: daysAgo(2),
    answers: { f1: "Sunrise Bakery", f2: "Ramesh Gupta", f3: "ramesh@sunrisebakery.example", f4: "+91 98111 22334", f5: "Mumbai", f6: "Food & Bakery", f7: "Combo", f8: "We have no website and want to grow on Instagram." },
  },
  {
    id: "FR-2",
    formId: "FRM-1",
    at: daysAgo(1),
    answers: { f1: "FitZone Gym", f2: "Neha Kapoor", f3: "neha@fitzone.example", f4: "+91 90000 55667", f5: "Pune", f6: "Fitness", f7: "Website", f8: "Need a booking website + ads." },
  },
];
