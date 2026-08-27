import type { Call, Transcript, CallInsight } from "@/lib/types";
import { daysAgo, hoursAgo } from "./dates";

export const calls: Call[] = [
  {
    id: "C-1",
    leadId: "L-101",
    agentId: "u-priya",
    at: daysAgo(2),
    direction: "outbound",
    toNumber: "+91 98191 20301",
    disposition: "connected",
    durationSec: 372,
    recordingSource: "manual_upload",
    hasRecording: true,
    transcriptId: "T-1",
    notes: "Very interested, festive season push",
  },
  {
    id: "C-2",
    leadId: "L-101",
    agentId: "u-priya",
    at: daysAgo(6),
    direction: "outbound",
    toNumber: "+91 98191 20301",
    disposition: "callback",
    durationSec: 54,
    recordingSource: "manual_upload",
    hasRecording: false,
    notes: "Busy, asked to call back next week",
  },
  {
    id: "C-3",
    leadId: "L-102",
    agentId: "u-priya",
    at: hoursAgo(3),
    direction: "outbound",
    toNumber: "+91 90040 55882",
    disposition: "connected",
    durationSec: 289,
    recordingSource: "manual_upload",
    hasRecording: true,
    transcriptId: "T-2",
  },
  {
    id: "C-4",
    leadId: "L-103",
    agentId: "u-priya",
    at: daysAgo(1),
    direction: "outbound",
    toNumber: "+91 99870 33221",
    disposition: "connected",
    durationSec: 445,
    recordingSource: "manual_upload",
    hasRecording: true,
    transcriptId: "T-3",
  },
];

export const transcripts: Transcript[] = [
  {
    id: "T-1",
    callId: "C-1",
    language: "Hindi-English (Hinglish)",
    turns: [
      { speaker: "agent", at: 3, text: "Hello Rakesh ji, main Priya baat kar rahi hoon PixelForge se. Aapke paas 2 minute hain?" },
      { speaker: "customer", at: 8, text: "Haan boliye, but jaldi — shop pe rush hai." },
      { speaker: "agent", at: 12, text: "Bilkul. Sir maine dekha aapki Sharma Sweets ki koi website nahi hai, sirf Instagram hai. Festive season aa raha hai, log online order dhoondte hain." },
      { speaker: "customer", at: 22, text: "Haan yeh sahi bola. Diwali pe bahut demand hoti hai but log phone karke poochte hain, confusion hota hai." },
      { speaker: "agent", at: 30, text: "Exactly sir. Ek simple website jisme aapka menu, pricing aur online enquiry form ho — customers seedha order de sakte hain. Plus hum aapka Instagram bhi manage kar sakte hain." },
      { speaker: "customer", at: 42, text: "Kitna kharcha aayega iska? Budget zyada nahi rakh sakta abhi." },
      { speaker: "agent", at: 48, text: "Samajh sakti hoon sir. Website ek baar ka 50-55 hazaar, aur agar social media bhi chahiye to 15 hazaar monthly. Hum combo mein discount de denge." },
      { speaker: "customer", at: 60, text: "Theek hai. Aap mujhe ek proposal bhej do, main apne bete se discuss karunga. Diwali se pehle live ho jaana chahiye." },
      { speaker: "agent", at: 70, text: "Perfect sir. Main aaj hi proposal bhejti hoon. Kya main aapko kal 11:30 baje call karke follow up kar sakti hoon?" },
      { speaker: "customer", at: 80, text: "Haan kal 11:30 sahi rahega. Rakh do." },
    ],
  },
  {
    id: "T-2",
    callId: "C-3",
    language: "English + Hindi",
    turns: [
      { speaker: "agent", at: 2, text: "Good morning Dr. Meera, Priya here from PixelForge. Following up on the social media proposal I sent." },
      { speaker: "customer", at: 7, text: "Yes Priya, I did look at it. The Growth plan looks good but I'm not sure about the reels — do you handle the shooting also?" },
      { speaker: "agent", at: 15, text: "Great question. For reels we do the editing and scripting; for shooting we can guide your staff or arrange a shoot day monthly at a small extra cost." },
      { speaker: "customer", at: 25, text: "Okay. And can we start with 2 platforms — Instagram and Facebook?" },
      { speaker: "agent", at: 30, text: "Absolutely, Growth plan covers 2 platforms. When would you like to start?" },
      { speaker: "customer", at: 36, text: "Let me confirm the budget with my partner. Can you call me tomorrow evening around 4?" },
      { speaker: "agent", at: 42, text: "Sure doctor, I'll call at 4 PM tomorrow. I'll also send a short reels sample from a similar wellness client." },
    ],
  },
  {
    id: "T-3",
    callId: "C-4",
    language: "English",
    turns: [
      { speaker: "agent", at: 2, text: "Hi Karan, Priya from PixelForge. Thanks for the time. You'd mentioned the e-commerce store plus social." },
      { speaker: "customer", at: 9, text: "Yeah. The quote came to about 1.7 lakh with the Pro social. That's a bit high for us right now." },
      { speaker: "agent", at: 16, text: "Understood. What number were you hoping to land at? Maybe we phase it — store first, social from month two." },
      { speaker: "customer", at: 24, text: "If you can do the store at 1 lakh and Social Growth instead of Pro, we have a deal. I don't need ad management yet." },
      { speaker: "agent", at: 33, text: "Let me check the discount with my manager — the 1 lakh on e-comm needs an approval. I'll confirm by today evening." },
      { speaker: "customer", at: 40, text: "Perfect. If the number works we can sign this week. We want it live before our new branch opens." },
    ],
  },
];

export const callInsights: CallInsight[] = [
  {
    id: "AI-1",
    callId: "C-1",
    leadId: "L-101",
    summary:
      "Owner of Sharma Sweets confirmed no website exists; festive (Diwali) demand causes order confusion over phone. Interested in a website with menu + online enquiry, plus Instagram management. Budget-conscious. Wants proposal to discuss with his son; needs it live before Diwali. Agreed to a callback at 11:30 AM next day.",
    sentiment: "positive",
    talkRatioAgent: 0.52,
    fields: [
      { key: "requirement", label: "Requirement", value: "Website (menu + online enquiry form) + Instagram management", confidence: 0.94, status: "pending", appliesTo: "interest" },
      { key: "budget", label: "Budget signal", value: "Cost-conscious; ~₹55k one-time site + ₹15k/mo social, wants combo discount", confidence: 0.82, status: "pending" },
      { key: "timeline", label: "Timeline", value: "Live before Diwali (festive season)", confidence: 0.9, status: "pending" },
      { key: "decision_maker", label: "Decision maker", value: "Owner decides with his son", confidence: 0.76, status: "pending" },
      { key: "next_action", label: "Next action", value: "Callback tomorrow 11:30 AM + send combo proposal today", confidence: 0.97, status: "pending", appliesTo: "task" },
    ],
  },
  {
    id: "AI-2",
    callId: "C-3",
    leadId: "L-102",
    summary:
      "Dr. Meera reviewed the Growth proposal; positive but asked whether shooting is included for reels (only editing/scripting is; shoot day is extra). Wants to start with Instagram + Facebook. Needs to confirm budget with her partner. Requested a callback at 4 PM tomorrow and a reels sample from a similar wellness client.",
    sentiment: "positive",
    talkRatioAgent: 0.48,
    fields: [
      { key: "requirement", label: "Requirement", value: "Social Growth plan, 2 platforms (Instagram + Facebook)", confidence: 0.91, status: "pending", appliesTo: "interest" },
      { key: "objection", label: "Objection", value: "Unclear if reel shooting is included; wants clarity", confidence: 0.88, status: "pending" },
      { key: "decision_maker", label: "Decision maker", value: "Needs partner's approval on budget", confidence: 0.85, status: "pending" },
      { key: "next_action", label: "Next action", value: "Call 4 PM tomorrow + send wellness reels sample", confidence: 0.95, status: "pending", appliesTo: "task" },
    ],
  },
  {
    id: "AI-3",
    callId: "C-4",
    leadId: "L-103",
    summary:
      "Karan finds the ₹1.7L quote (E-comm + Social Pro) high. Counter-offer: E-commerce at ₹1L + Social Growth (no ad management) = deal. Wants site live before new branch opening. Deal can close this week if the ₹1L e-comm price (needs manager discount approval) is confirmed by this evening.",
    sentiment: "neutral",
    talkRatioAgent: 0.5,
    fields: [
      { key: "requirement", label: "Requirement", value: "E-commerce website + Social Growth (drop Pro/ad management)", confidence: 0.93, status: "pending", appliesTo: "interest" },
      { key: "objection", label: "Objection", value: "Price too high at ₹1.7L; wants ₹1L on e-comm", confidence: 0.9, status: "pending" },
      { key: "budget", label: "Budget signal", value: "Target ~₹1L e-comm + ₹30k/mo Growth", confidence: 0.87, status: "pending" },
      { key: "timeline", label: "Timeline", value: "Before new branch opening; can sign this week", confidence: 0.89, status: "pending" },
      { key: "next_action", label: "Next action", value: "Get manager approval for ₹1L e-comm discount; confirm this evening", confidence: 0.96, status: "pending", appliesTo: "task" },
    ],
  },
];

export function callsForLead(leadId: string) {
  return calls.filter((c) => c.leadId === leadId).sort((a, b) => (a.at < b.at ? 1 : -1));
}
export function transcriptById(id?: string) {
  return transcripts.find((t) => t.id === id);
}
export function insightForCall(callId: string) {
  return callInsights.find((i) => i.callId === callId);
}
export function latestInsightForLead(leadId: string) {
  return callInsights.filter((i) => i.leadId === leadId).slice(-1)[0];
}
