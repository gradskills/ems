"use client";

import { create } from "zustand";
import type {
  Lead,
  LeadStage,
  CallInsight,
  Activity,
  AuditEntry,
  Call,
  Disposition,
  Proposal,
  ProposalItem,
  Invoice,
  DeliveryProject,
  Role,
  User,
  AccessLevel,
  Department,
  DeptFeature,
  AttendanceRecord,
  BreakType,
  BreakSession,
  LeaveRequest,
  LeaveType,
  Payslip,
  Task,
  TaskStatus,
  TaskPriority,
  Project,
  ProjectStatus,
  MediaClient,
  Campaign,
  ContentPost,
  Ticket,
  TicketStatus,
  AppNotification,
  Announcement,
  CompanySettings,
  ApprovalRules,
  AuditReport,
  AuditReportStatus,
  EmploymentType,
  Brief,
  Milestone,
  PaymentRecord,
  PaymentMode,
  FormDef,
  FormField,
  FormResponse,
  ServiceInterest,
  Design,
  DocType,
  CredentialEmail,
  Meeting,
  MeetingStatus,
  MeetingMode,
  MeetingNote,
} from "@/lib/types";
import { leads as seedLeads } from "@/lib/seed/leads";
import { callInsights as seedInsights, calls as seedCalls } from "@/lib/seed/calls";
import { activities as seedActivities } from "@/lib/seed/activities";
import { auditLog as seedAudit } from "@/lib/seed/audit";
import { proposals as seedProposals, invoices as seedInvoices } from "@/lib/seed/proposals";
import { deliveryProjects as seedDelivery } from "@/lib/seed/prospects";
import { CURRENT_BDA_ID, userById, users as seedUsersRaw } from "@/lib/seed/users";
import { withCredentials, loginIdFor, tempPassword, readAuth, writeAuth } from "@/lib/auth";

// every seeded account gets demo login credentials at store init
const seedUsers = seedUsersRaw.map(withCredentials);
import { departments as seedDepartments, companySettings as seedCompany, approvalRules as seedApprovalRules } from "@/lib/seed/org";
import { attendance as seedAttendance, leaveRequests as seedLeaves, payslips as seedPayslips } from "@/lib/seed/hr";
import { tasks as seedTasks } from "@/lib/seed/tasks";
import { projects as seedProjects } from "@/lib/seed/projects";
import { mediaClients as seedClients, campaigns as seedCampaigns, contentPosts as seedContent } from "@/lib/seed/media";
import { tickets as seedTickets, notifications as seedNotifications, announcements as seedAnnouncements } from "@/lib/seed/workplace";
import { auditReports as seedAuditReports } from "@/lib/seed/auditReports";
import { briefs as seedBriefs } from "@/lib/seed/briefs";
import { forms as seedForms, formResponses as seedFormResponses } from "@/lib/seed/forms";
import { meetings as seedMeetings } from "@/lib/seed/meetings";
import { proposalTotals } from "@/lib/qims";
import { hydrateAll } from "@/lib/supabase/hydrate";
import {
  persistChanges, setPersistSuspended,
  persistAttendance, persistLeaveApply, persistLeaveDecision, persistUserUpdate,
} from "@/lib/supabase/persist";

export type SendChannel = "email" | "whatsapp";
export interface NewLeadInput {
  company: string;
  contactName: string;
  role: string;
  phone: string;
  email?: string;
  city: string;
  industry: string;
  interest: Lead["interest"];
  interests?: Lead["interest"][];
  source: Lead["source"];
  estimatedValue: number;
  website?: string;
}

let idc = 1000;
const nid = (p: string) => `${p}-${++idc}`;

// sidebar collapse state is remembered per user, so switching roles/users
// restores each one's own open/closed groups instead of sharing/blurring one map
const navKey = (userId: string) => `navCollapsed:${userId}`;

interface AppState {
  // ── who is using the app (role switcher) ──
  actingUserId: string;
  role: Role;
  setActingUser: (userId: string) => void;
  // ── which "lens" a manager/admin is viewing: "management" or a departmentId ──
  viewLens: string;
  setViewLens: (lens: string) => void;
  // ── sidebar: collapsed nav groups (by label) — persists across navigation ──
  navCollapsed: Record<string, boolean>;
  toggleNavGroup: (label: string) => void;
  hydrateNav: () => void; // restore this user's collapsed groups from localStorage

  // ── portal session (prototype auth) ──
  authUserId: string | null; // the signed-in account; null until login/hydrate
  authReady: boolean; // localStorage has been read on the client
  hydrateAuth: () => void; // restore session from localStorage (client only)
  // ── Supabase data hydration ──
  dataReady: boolean; // true once the store has loaded (or attempted to load) from Supabase
  hydrateData: () => Promise<void>; // load all slices from Supabase (client only)
  login: (loginId: string, password: string) => Promise<{ ok: boolean; mustChangePassword?: boolean; error?: string }>;
  logout: () => void;
  changePassword: (userId: string, current: string, next: string) => Promise<{ ok: boolean; error?: string }>;
  credentialEmails: CredentialEmail[]; // simulated outbox of onboarding emails

  // ── data ──
  leads: Lead[];
  insights: CallInsight[];
  activities: Activity[];
  audit: AuditEntry[];
  calls: Call[];
  proposals: Proposal[];
  invoices: Invoice[];
  delivery: DeliveryProject[];

  // ── EMS + org data ──
  employees: User[];
  departments: Department[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  payslips: Payslip[];
  tasks: Task[];
  projects: Project[];
  clients: MediaClient[];
  campaigns: Campaign[];
  content: ContentPost[];
  tickets: Ticket[];
  notifications: AppNotification[];
  announcements: Announcement[];
  auditReports: AuditReport[];
  briefs: Brief[];
  milestones: Milestone[];
  payments: PaymentRecord[];
  forms: FormDef[];
  formResponses: FormResponse[];
  meetings: Meeting[];
  docOverrides: Record<string, string>; // docKey → edited HTML (in-doc edits)
  templateDesigns: Partial<Record<DocType, Design>>; // admin master template per doc type
  docDesigns: Record<string, string>; // docKey → JSON.stringify(Design) for a single edited document
  company: CompanySettings;
  approvalRules: ApprovalRules;

  // ── actions ──
  moveStage: (leadId: string, to: LeadStage, reason?: string) => void;
  editLeadField: (leadId: string, field: keyof Lead, value: string | number, reason: string) => void;
  logCall: (leadId: string, disposition: Disposition, durationSec: number, note?: string) => void;
  setAiFieldStatus: (insightId: string, key: string, status: "accepted" | "rejected") => void;
  approveProposal: (proposalId: string) => void;
  sendProposal: (proposalId: string) => void;
  toggleOnboarding: (projectId: string, taskId: string) => void;
  approveDeliverable: (projectId: string, deliverableId: string) => void;
  // ── create / send ──
  createLead: (input: NewLeadInput) => string;
  createProposal: (leadId: string, items: ProposalItem[], validTillISO: string) => string;
  createInvoice: (input: Omit<Invoice, "id">) => string;
  recordSend: (entity: string, entityId: string, entityLabel: string, channel: SendChannel, leadId?: string) => void;

  // ── EMS actions ──
  createEmployee: (input: NewEmployeeInput) => { id: string; loginId: string; tempPassword: string; email: CredentialEmail };
  updateEmployee: (id: string, patch: Partial<Pick<User, "name" | "email" | "phone" | "departmentId" | "accessLevel" | "designation" | "managerId" | "employmentType" | "location" | "status" | "monthlyTargetCalls" | "monthlyTargetRevenue" | "ctcAnnual" | "avatarUrl">>) => void;
  addDepartment: (input: NewDepartmentInput) => string;
  applyLeave: (input: NewLeaveInput) => void;
  decideLeave: (id: string, decision: "approved" | "rejected", note?: string) => void;
  clockIn: (opts?: { photo?: string; coords?: { lat: number; lng: number }; timezone?: string; wfh?: boolean }) => Promise<boolean>;
  clockOut: () => void;
  // ── meetings ──
  scheduleMeeting: (input: NewMeetingInput) => string;
  updateMeeting: (id: string, patch: Partial<Omit<Meeting, "id" | "organizerId" | "insights" | "minutes">>) => void;
  addMeetingNote: (id: string, kind: "insight" | "minute", text: string) => void;
  setMeetingStatus: (id: string, status: MeetingStatus) => void;
  startBreak: (type: BreakType, minutes: number) => void;
  endBreak: () => void;
  breakReminder: (breakId: string) => void;
  createTask: (input: NewTaskInput) => string;
  addProject: (input: NewProjectInput) => string;
  updateProject: (id: string, patch: Partial<Project>) => void;
  createCampaign: (input: NewCampaignInput) => string;
  updateCampaign: (id: string, patch: Partial<Campaign>) => void;
  createContent: (input: NewContentInput) => string;
  updateContent: (id: string, patch: Partial<ContentPost>) => void;
  moveContent: (id: string, status: ContentPost["status"]) => void;
  moveTask: (id: string, status: TaskStatus) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  addAnnouncement: (title: string, body: string, audience: string) => void;
  createTicket: (input: NewTicketInput) => string;
  setTicketStatus: (id: string, status: TicketStatus) => void;
  saveCompany: (patch: Partial<CompanySettings>) => void;
  setApprovalRules: (patch: Partial<ApprovalRules>) => void;
  // ── QIMS: audit reports + quotation review + customer portal ──
  createAuditReport: (leadId: string) => void;
  setAuditReportStatus: (id: string, status: AuditReportStatus) => void;
  verifyAuditReport: (id: string) => void;
  submitProposalForReview: (id: string) => void;
  verifyProposal: (id: string) => void;
  rejectProposal: (id: string, reason: string) => void;
  shareProposal: (id: string) => string; // returns share token
  customerDecision: (token: string, decision: "accepted" | "rejected", via: "gmail" | "otp", contact: string, rejectReason?: string) => void;
  shareAuditReport: (id: string) => string; // returns share token
  auditDecision: (token: string, decision: "accepted" | "rejected", via: "gmail" | "otp", contact: string, rejectReason?: string) => void;
  rejectAuditReport: (id: string, reason: string) => void;
  updateAuditReport: (id: string, patch: Partial<AuditReport>) => void;
  upsertAuditReport: (leadId: string, patch: Partial<AuditReport>) => string; // create-or-update rich audit for a lead
  logDocumentSend: (leadId: string, docLabel: string, channel: SendChannel) => void;
  updateInvoice: (id: string, patch: Partial<Invoice>) => void;
  updateProposal: (id: string, patch: Partial<Proposal>) => void;
  convertProposalToInvoice: (proposalId: string) => string;
  // ── lead briefs + execution assignment ──
  addBrief: (leadId: string, text: string) => void;
  assignLead: (leadId: string, userIds: string[], deptIds: string[]) => void;
  // ── Explore pool ──
  acquireLead: (leadId: string) => void; // claim a pooled lead for myself
  releaseLead: (leadId: string, note?: string) => void; // send my lead back to the pool
  bulkCreateLeads: (inputs: NewLeadInput[]) => number; // import (e.g. from Excel/CSV)

  // ── Milestones & payments ──
  addMilestones: (leadId: string, milestones: { label: string; amount: number; dueAt?: string }[]) => void;
  deleteMilestone: (id: string) => void;
  logPayment: (input: NewPaymentInput) => string; // returns receipt number

  // ── Forms ──
  createForm: (input: { title: string; description?: string; fields: FormField[]; autoCreateLead: boolean }) => string;
  updateForm: (id: string, patch: Partial<FormDef>) => void;
  deleteForm: (id: string) => void;
  submitFormResponse: (token: string, answers: Record<string, string>) => void;
  convertResponseToLead: (responseId: string) => string | undefined;

  // ── in-document editing ──
  saveDocOverride: (key: string, html: string) => void;
  resetDocOverride: (key: string) => void;

  // ── design studio (Canva-style editor) ──
  saveTemplateDesign: (type: DocType, design: Design) => void;
  resetTemplateDesign: (type: DocType) => void;
  saveDocDesign: (key: string, design: Design) => void;
  resetDocDesign: (key: string) => void;
}

export interface NewPaymentInput {
  leadId?: string;
  invoiceId?: string;
  milestoneId?: string;
  company: string;
  contactName?: string;
  amount: number;
  mode: PaymentMode;
  reference?: string;
  note?: string;
}

export interface NewEmployeeInput {
  name: string;
  email: string;
  phone: string;
  accessLevel: AccessLevel;
  departmentId: string;
  designation?: string;
  managerId?: string;
  employmentType: EmploymentType;
  location?: string;
  monthlyCtc: number;
}
export interface NewMeetingInput {
  title: string;
  leadId?: string;
  attendeeIds: string[];
  clientContact?: string;
  scheduledAt: string;
  durationMin: number;
  mode: MeetingMode;
  location?: string;
  agenda?: string;
  initialInsight?: string;
}
export interface NewDepartmentInput {
  name: string;
  key: string;
  color: Department["color"];
  features: DeptFeature[];
}
export interface NewLeaveInput {
  type: LeaveType;
  from: string;
  to: string;
  days: number;
  reason: string;
}
export interface NewTaskInput {
  title: string;
  description?: string;
  assigneeId: string;
  departmentId: string;
  priority: Task["priority"];
  dueAt?: string;
  projectId?: string;
  status?: TaskStatus;
}

export interface NewProjectInput {
  name: string;
  description?: string;
  clientCompany: string;
  clientContact?: string;
  clientEmail?: string;
  leadId?: string;
  status: ProjectStatus;
  priority: TaskPriority;
  departmentId: string;
  managerId?: string;
  memberIds: string[];
  repoUrl?: string;
  link?: string;
  dueAt?: string;
  techStack: string[];
  progress?: number;
}
export interface NewTicketInput {
  subject: string;
  description: string;
  category: string;
  priority: Task["priority"];
}

export interface NewCampaignInput {
  clientId: string;
  name: string;
  status: Campaign["status"];
  channel: string;
  startAt: string;
  endAt?: string;
  reach?: number;
  engagement?: number;
  spend?: number;
  leads?: number;
  checkUrl?: string;
  liveUrl?: string;
}

export interface NewContentInput {
  clientId: string;
  title: string;
  channel: string;
  scheduledAt: string;
  status: ContentPost["status"];
  ownerId: string;
  checkUrl?: string;
  liveUrl?: string;
}

function pushAudit(state: AppState, e: Omit<AuditEntry, "id" | "at" | "actorId" | "actorRole">): AuditEntry {
  const user = userById(state.actingUserId)!;
  return {
    id: nid("AU"),
    at: new Date().toISOString(),
    actorId: user.id,
    actorRole: user.role,
    ...e,
  };
}

export const useApp = create<AppState>((rawSet, get) => {
  // Wrap `set` so every mutation is diffed and written through to Supabase.
  const set = ((partial: unknown, replace?: boolean) => {
    const prev = get() as unknown as Record<string, unknown>;
    (rawSet as (p: unknown, r?: boolean) => void)(partial, replace);
    persistChanges(prev, get() as unknown as Record<string, unknown>);
  }) as typeof rawSet;

  // Persist today's attendance record for the acting user (int-keyed table).
  const persistDay = () => {
    const s = get();
    const today = new Date().toISOString().slice(0, 10);
    const rec = s.attendance.find((a) => a.userId === s.actingUserId && a.date === today);
    if (rec) void persistAttendance(rec);
  };

  return {
  actingUserId: CURRENT_BDA_ID,
  role: "bda",
  viewLens: "management",
  setViewLens: (lens) => set({ viewLens: lens }),
  navCollapsed: {},
  toggleNavGroup: (label) => set((s) => {
    const navCollapsed = { ...s.navCollapsed, [label]: !s.navCollapsed[label] };
    if (typeof window !== "undefined") {
      try { localStorage.setItem(navKey(s.actingUserId), JSON.stringify(navCollapsed)); } catch { /* ignore */ }
    }
    return { navCollapsed };
  }),
  hydrateNav: () => {
    let loaded: Record<string, boolean> = {};
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(navKey(get().actingUserId));
        loaded = raw ? JSON.parse(raw) : {};
      } catch { /* ignore */ }
    }
    if (!loaded || typeof loaded !== "object") loaded = {};
    set({ navCollapsed: loaded });
  },

  // ── portal session ──
  authUserId: null,
  authReady: false,
  dataReady: false,
  credentialEmails: [],
  hydrateData: async () => {
    setPersistSuspended(true);
    try {
      const data = await hydrateAll();
      if (data) set(data as Partial<AppState>);
    } catch (e) {
      console.error("[store] hydrateData failed:", e);
    } finally {
      setPersistSuspended(false);
      set({ dataReady: true });
    }
  },
  hydrateAuth: () => {
    const stored = readAuth();
    const u = stored ? get().employees.find((e) => e.id === stored) : undefined;
    if (u) set({ authUserId: u.id, authReady: true, actingUserId: u.id, role: u.role, viewLens: u.accessLevel === "employee" ? u.departmentId : "management" });
    else set({ authReady: true });
    get().hydrateNav();
  },
  login: async (loginId, password) => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });
      const data = await res.json();
      if (!data.ok) return { ok: false, error: data.error ?? "Sign in failed." };
      const u = data.user as User;
      // make sure the signed-in user is present in the employees slice
      set((s) => ({
        employees: s.employees.some((e) => e.id === u.id)
          ? s.employees.map((e) => (e.id === u.id ? { ...e, ...u } : e))
          : [u, ...s.employees],
      }));
      writeAuth(u.id);
      set({ authUserId: u.id, authReady: true, actingUserId: u.id, role: u.role, viewLens: u.accessLevel === "employee" ? u.departmentId : "management" });
      get().hydrateNav();
      return { ok: true, mustChangePassword: !!data.mustChangePassword };
    } catch {
      return { ok: false, error: "Sign in failed. Check your connection and try again." };
    }
  },
  logout: () => {
    writeAuth(null);
    set({ authUserId: null });
  },
  changePassword: async (userId, current, next) => {
    const u = get().employees.find((e) => e.id === userId);
    if (!u) return { ok: false, error: "Account not found." };
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, current, next }),
      });
      const data = await res.json();
      if (!data.ok) return { ok: false, error: data.error ?? "Couldn't update password." };
      set((s) => ({ employees: s.employees.map((e) => (e.id === userId ? { ...e, mustChangePassword: false } : e)) }));
      return { ok: true };
    } catch {
      return { ok: false, error: "Couldn't update password. Check your connection." };
    }
  },
  setActingUser: (userId) => {
    const u = userById(userId);
    // default a manager/admin into their management overview; employees follow their dept
    if (u) {
      set({ actingUserId: userId, role: u.role, viewLens: u.accessLevel === "employee" ? u.departmentId : "management" });
      get().hydrateNav();
    }
  },

  leads: seedLeads,
  insights: seedInsights,
  activities: seedActivities,
  audit: seedAudit,
  calls: seedCalls,
  proposals: seedProposals,
  invoices: seedInvoices,
  delivery: seedDelivery,

  employees: seedUsers,
  departments: seedDepartments,
  attendance: seedAttendance,
  leaves: seedLeaves,
  payslips: seedPayslips,
  tasks: seedTasks,
  projects: seedProjects,
  clients: seedClients,
  campaigns: seedCampaigns,
  content: seedContent,
  tickets: seedTickets,
  notifications: seedNotifications,
  announcements: seedAnnouncements,
  auditReports: seedAuditReports,
  briefs: seedBriefs,
  milestones: [],
  payments: [],
  forms: seedForms,
  formResponses: seedFormResponses,
  meetings: seedMeetings,
  docOverrides: {},
  templateDesigns: {},
  docDesigns: {},
  company: seedCompany,
  approvalRules: seedApprovalRules,

  moveStage: (leadId, to, reason) =>
    set((s) => {
      const lead = s.leads.find((l) => l.id === leadId);
      if (!lead) return s;
      const from = lead.stage;
      if (from === to) return s;
      const audit = pushAudit(s, {
        action: "update",
        entity: "lead",
        entityId: leadId,
        entityLabel: lead.company,
        field: "stage",
        before: from,
        after: to,
        reason,
      });
      const activity: Activity = {
        id: nid("A"),
        leadId,
        type: "stage_change",
        actorId: s.actingUserId,
        at: new Date().toISOString(),
        title: `Stage: ${labelStage(from)} → ${labelStage(to)}`,
        body: reason,
        meta: { from, to },
      };
      return {
        leads: s.leads.map((l) =>
          l.id === leadId ? { ...l, stage: to, lastActivityAt: new Date().toISOString(), lostReason: to === "lost" ? reason : l.lostReason } : l
        ),
        audit: [audit, ...s.audit],
        activities: [activity, ...s.activities],
      };
    }),

  editLeadField: (leadId, field, value, reason) =>
    set((s) => {
      const lead = s.leads.find((l) => l.id === leadId);
      if (!lead) return s;
      const before = String(lead[field] ?? "");
      const audit = pushAudit(s, {
        action: "update",
        entity: "lead",
        entityId: leadId,
        entityLabel: lead.company,
        field: String(field),
        before,
        after: String(value),
        reason,
      });
      const activity: Activity = {
        id: nid("A"),
        leadId,
        type: "field_edit",
        actorId: s.actingUserId,
        at: new Date().toISOString(),
        title: `${userById(s.actingUserId)?.name} edited ${humanField(String(field))}`,
        body: `${before || "—"} → ${value}. Reason: ${reason}`,
        meta: { field: String(field), by: s.role },
      };
      return {
        leads: s.leads.map((l) => (l.id === leadId ? { ...l, [field]: value, lastActivityAt: new Date().toISOString() } : l)),
        audit: [audit, ...s.audit],
        activities: [activity, ...s.activities],
      };
    }),

  logCall: (leadId, disposition, durationSec, note) =>
    set((s) => {
      const lead = s.leads.find((l) => l.id === leadId);
      if (!lead) return s;
      const call: Call = {
        id: nid("C"),
        leadId,
        agentId: s.actingUserId,
        at: new Date().toISOString(),
        direction: "outbound",
        toNumber: lead.phone,
        disposition,
        durationSec,
        recordingSource: "mock",
        hasRecording: disposition === "connected",
        notes: note,
      };
      const activity: Activity = {
        id: nid("A"),
        leadId,
        type: "call",
        actorId: s.actingUserId,
        at: new Date().toISOString(),
        title: `Call — ${labelDisposition(disposition)}${durationSec ? ` (${Math.floor(durationSec / 60)}m ${durationSec % 60}s)` : ""}`,
        body: note,
        meta: { disposition, duration: durationSec },
      };
      const audit = pushAudit(s, {
        action: "create",
        entity: "call",
        entityId: call.id,
        entityLabel: `${lead.company} — call`,
        after: labelDisposition(disposition),
      });
      // contacted stage bump on a first connect
      const nextStage: LeadStage = lead.stage === "new" && disposition === "connected" ? "contacted" : lead.stage;
      return {
        calls: [call, ...s.calls],
        activities: [activity, ...s.activities],
        audit: [audit, ...s.audit],
        leads: s.leads.map((l) => (l.id === leadId ? { ...l, stage: nextStage, lastActivityAt: new Date().toISOString() } : l)),
      };
    }),

  setAiFieldStatus: (insightId, key, status) =>
    set((s) => {
      const insight = s.insights.find((i) => i.id === insightId);
      if (!insight) return s;
      const field = insight.fields.find((f) => f.key === key);
      const leads = s.leads;
      let activities = s.activities;
      // when accepted, write to the lead record where the field maps
      if (status === "accepted" && field?.appliesTo && field.appliesTo !== "task") {
        const lead = s.leads.find((l) => l.id === insight.leadId);
        if (lead) {
          activities = [
            {
              id: nid("A"),
              leadId: insight.leadId,
              type: "note",
              actorId: s.actingUserId,
              at: new Date().toISOString(),
              title: `Confirmed AI field: ${field.label}`,
              body: field.value,
            },
            ...activities,
          ];
        }
      }
      return {
        insights: s.insights.map((i) =>
          i.id === insightId
            ? { ...i, fields: i.fields.map((f) => (f.key === key ? { ...f, status } : f)) }
            : i
        ),
        leads,
        activities,
      };
    }),

  approveProposal: (proposalId) =>
    set((s) => {
      const p = s.proposals.find((x) => x.id === proposalId);
      if (!p) return s;
      const audit = pushAudit(s, {
        action: "approve",
        entity: "proposal",
        entityId: proposalId,
        entityLabel: p.number,
        after: "Discount approved",
      });
      return {
        proposals: s.proposals.map((x) =>
          x.id === proposalId
            ? { ...x, approval: { ...x.approval!, required: false, approvedBy: s.actingUserId, approvedAt: new Date().toISOString() } }
            : x
        ),
        audit: [audit, ...s.audit],
      };
    }),

  sendProposal: (proposalId) =>
    set((s) => {
      const p = s.proposals.find((x) => x.id === proposalId);
      if (!p) return s;
      const activity: Activity = {
        id: nid("A"),
        leadId: p.leadId,
        type: "proposal",
        actorId: s.actingUserId,
        at: new Date().toISOString(),
        title: `Proposal ${p.number} sent`,
        meta: { proposalId },
      };
      const audit = pushAudit(s, { action: "create", entity: "proposal", entityId: proposalId, entityLabel: p.number, after: "Sent to client" });
      return {
        proposals: s.proposals.map((x) => (x.id === proposalId ? { ...x, status: "sent" } : x)),
        activities: [activity, ...s.activities],
        audit: [audit, ...s.audit],
        leads: s.leads.map((l) => (l.id === p.leadId && l.stage === "qualified" ? { ...l, stage: "proposal_sent" } : l)),
      };
    }),

  createLead: (input) => {
    const id = nid("L");
    set((s) => {
      const now = new Date().toISOString();
      const lead: Lead = {
        id,
        company: input.company,
        contactName: input.contactName,
        role: input.role,
        phone: input.phone,
        email: input.email,
        city: input.city,
        industry: input.industry,
        website: input.website || undefined,
        stage: "new",
        source: input.source,
        interest: input.interests?.[0] ?? input.interest,
        interests: input.interests?.length ? input.interests : [input.interest],
        ownerId: s.actingUserId,
        score: input.website ? 55 : 68,
        estimatedValue: input.estimatedValue,
        billingType: input.interest === "website" ? "one_time" : input.interest === "social_media" || input.interest === "outreach" ? "retainer" : "mixed",
        createdAt: now,
        lastActivityAt: now,
        tags: input.website ? [] : ["no-website"],
        queueReason: { kind: "hot_new", label: "Hot new lead — just added" },
      };
      const activity: Activity = {
        id: nid("A"),
        leadId: id,
        type: "note",
        actorId: s.actingUserId,
        at: now,
        title: "Lead created",
        body: `Added via ${input.source.replace("_", " ")}`,
      };
      const audit = pushAudit(s, { action: "create", entity: "lead", entityId: id, entityLabel: input.company, after: `${input.contactName} · ${input.city}` });
      return { leads: [lead, ...s.leads], activities: [activity, ...s.activities], audit: [audit, ...s.audit] };
    });
    return id;
  },

  createProposal: (leadId, items, validTillISO) => {
    const id = nid("P");
    set((s) => {
      const lead = s.leads.find((l) => l.id === leadId);
      const maxDiscount = Math.max(0, ...items.map((i) => i.discountPct));
      // Discount thresholds come from the admin-set approval rules (Settings),
      // not a hardcoded number, so changing them there takes effect immediately.
      const bdaMax = s.approvalRules.discountBdaMaxPct;
      const mgrMax = s.approvalRules.discountManagerMaxPct;
      const needsApproval = maxDiscount > bdaMax;
      const approver = maxDiscount > mgrMax ? "admin" : "manager";
      const number = `QT/2025-26/${String(44 + s.proposals.length).padStart(4, "0")}`;
      const proposal: Proposal = {
        id,
        number,
        leadId,
        ownerId: s.actingUserId,
        version: 1,
        status: needsApproval ? "pending_approval" : "draft",
        createdAt: new Date().toISOString(),
        validTill: validTillISO,
        items,
        openCount: 0,
        approval: needsApproval
          ? { required: true, reason: `Discount ${maxDiscount}% exceeds the ${bdaMax}% self-approve limit — needs ${approver} approval` }
          : { required: false },
      };
      const activity: Activity = {
        id: nid("A"),
        leadId,
        type: "proposal",
        actorId: s.actingUserId,
        at: new Date().toISOString(),
        title: `Proposal ${number} created`,
        meta: { proposalId: id },
      };
      const audit = pushAudit(s, { action: "create", entity: "proposal", entityId: id, entityLabel: number, after: lead?.company ?? "" });
      return { proposals: [proposal, ...s.proposals], activities: [activity, ...s.activities], audit: [audit, ...s.audit] };
    });
    return id;
  },

  createInvoice: (input) => {
    const id = nid("INV");
    set((s) => {
      const invoice: Invoice = { id, ...input };
      const activity: Activity = {
        id: nid("A"),
        leadId: input.leadId,
        type: "note",
        actorId: s.actingUserId,
        at: new Date().toISOString(),
        title: `Invoice ${input.number} created`,
        body: `${input.company} · ${input.milestone ?? "Invoice"}`,
      };
      const audit = pushAudit(s, { action: "create", entity: "invoice", entityId: id, entityLabel: input.number, after: input.company });
      return { invoices: [invoice, ...s.invoices], activities: [activity, ...s.activities], audit: [audit, ...s.audit] };
    });
    return id;
  },

  recordSend: (entity, entityId, entityLabel, channel, leadId) =>
    set((s) => {
      const now = new Date().toISOString();
      const audit = pushAudit(s, { action: "create", entity, entityId, entityLabel, after: `Sent via ${channel === "email" ? "Email" : "WhatsApp"}` });
      const activities = leadId
        ? [
            {
              id: nid("A"),
              leadId,
              type: (channel === "email" ? "email" : "whatsapp") as Activity["type"],
              actorId: s.actingUserId,
              at: now,
              title: `${entityLabel} sent via ${channel === "email" ? "Email" : "WhatsApp"}`,
            } as Activity,
            ...s.activities,
          ]
        : s.activities;
      // mark proposals/invoices as sent
      const proposals = entity === "proposal" ? s.proposals.map((p) => (p.id === entityId && p.status !== "accepted" ? { ...p, status: "sent" as const } : p)) : s.proposals;
      const invoices = entity === "invoice" ? s.invoices.map((iv) => (iv.id === entityId && iv.status === "draft" ? { ...iv, status: "sent" as const } : iv)) : s.invoices;
      return { audit: [audit, ...s.audit], activities, proposals, invoices };
    }),

  toggleOnboarding: (projectId, taskId) =>
    set((s) => ({
      delivery: s.delivery.map((d) =>
        d.id === projectId
          ? { ...d, onboarding: d.onboarding.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) }
          : d
      ),
    })),

  approveDeliverable: (projectId, deliverableId) =>
    set((s) => ({
      delivery: s.delivery.map((d) =>
        d.id === projectId
          ? { ...d, deliverables: d.deliverables.map((dl) => (dl.id === deliverableId ? { ...dl, approvedByClient: true } : dl)) }
          : d
      ),
    })),

  // ─────────────────────────── EMS ───────────────────────────
  createEmployee: (input) => {
    const id = nid("u");
    // login credentials handed to the new joiner (unique login id across the org)
    const existingIds = new Set(get().employees.map((e) => (e.loginId ?? "").toLowerCase()));
    let loginId = loginIdFor(input.email, id);
    if (existingIds.has(loginId)) {
      let n = 2;
      while (existingIds.has(`${loginId}${n}`)) n++;
      loginId = `${loginId}${n}`;
    }
    const pwd = tempPassword();
    const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";
    const email: CredentialEmail = {
      id: nid("MAIL"),
      userId: id,
      to: input.email,
      name: input.name,
      loginId,
      tempPassword: pwd,
      loginUrl,
      sentAt: new Date().toISOString(),
    };
    set((s) => {
      const monthly = input.monthlyCtc;
      const basic = Math.round(monthly * 0.5);
      const hra = Math.round(monthly * 0.2);
      const legacy: Role = input.accessLevel === "admin" ? "admin" : input.accessLevel === "manager" ? "manager" : "bda";
      const emp: User = {
        id,
        name: input.name,
        email: input.email,
        phone: input.phone,
        role: legacy,
        accessLevel: input.accessLevel,
        departmentId: input.departmentId,
        designation: input.designation,
        managerId: input.managerId,
        status: "active",
        employmentType: input.employmentType,
        joinedAt: new Date().toISOString(),
        location: input.location,
        ctcAnnual: monthly * 12,
        salary: { basic, hra, special: monthly - basic - hra },
        leaveBalance: { casual: 12, sick: 8, earned: 0 },
        loginId,
        password: pwd,
        mustChangePassword: true,
      };
      const audit = pushAudit(s, { action: "create", entity: "employee", entityId: id, entityLabel: input.name, after: s.departments.find((d) => d.id === input.departmentId)?.name ?? input.accessLevel });
      const notify: AppNotification = { id: nid("N"), userId: id, kind: "system", title: "Welcome to Gradskills EMS", body: "Your login was emailed to you. Set a new password on first sign-in.", at: email.sentAt, read: false, href: "/account/password" };
      return { employees: [emp, ...s.employees], audit: [audit, ...s.audit], credentialEmails: [email, ...s.credentialEmails], notifications: [notify, ...s.notifications] };
    });
    // Persist to the real users table (the server hashes the temp password),
    // then swap the temporary id for the DB-assigned numeric id. The write-through
    // diff cleans up the temp-id credential/notification rows automatically.
    if (typeof window !== "undefined") {
      void (async () => {
        try {
          const res = await fetch("/api/employees", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...input, loginId, tempPassword: pwd }),
          });
          const data = await res.json();
          if (data?.ok && data.id) {
            const realId: string = data.id;
            set((s) => ({
              employees: s.employees.map((e) => (e.id === id ? { ...e, id: realId, employeeId: data.employeeId } : e)),
              credentialEmails: s.credentialEmails.map((c) => (c.userId === id ? { ...c, userId: realId } : c)),
              notifications: s.notifications.map((n) => (n.userId === id ? { ...n, userId: realId } : n)),
            }));
          }
        } catch { /* stays in-memory this session; a reload will load it from the DB */ }
      })();
    }
    return { id, loginId, tempPassword: pwd, email };
  },

  updateEmployee: (id, patch) =>
    set((s) => {
      const prev = s.employees.find((e) => e.id === id);
      if (!prev) return {};
      const after = { ...prev, ...patch };
      // sync legacy role field when accessLevel changes
      if (patch.accessLevel) {
        after.role = patch.accessLevel === "admin" ? "admin" : patch.accessLevel === "manager" ? "manager" : "bda";
      }
      // recalc salary if CTC changed
      if (patch.ctcAnnual !== undefined) {
        const monthly = Math.round(patch.ctcAnnual / 12);
        const basic = Math.round(monthly * 0.5);
        const hra = Math.round(monthly * 0.2);
        after.ctcAnnual = patch.ctcAnnual;
        after.salary = { basic, hra, special: monthly - basic - hra };
      }
      const changes = Object.keys(patch).filter((k) => String(prev[(k as keyof User)]) !== String(after[(k as keyof User)])).join(", ") || "details";
      const audit = pushAudit(s, { action: "update", entity: "employee", entityId: id, entityLabel: after.name, after: changes });
      // persist the updated columns to the (int-keyed) users table
      void persistUserUpdate(id, after);
      return { employees: s.employees.map((e) => (e.id === id ? after : e)), audit: [audit, ...s.audit] };
    }),

  addDepartment: (input) => {
    const id = nid("dept");
    set((s) => {
      const dept: Department = { id, key: input.key, name: input.name, color: input.color, features: input.features };
      const audit = pushAudit(s, { action: "create", entity: "department", entityId: id, entityLabel: input.name });
      return { departments: [...s.departments, dept], audit: [audit, ...s.audit] };
    });
    return id;
  },

  applyLeave: (input) => {
    const lr: LeaveRequest = {
      id: nid("LV"),
      userId: get().actingUserId,
      type: input.type,
      from: input.from,
      to: input.to,
      days: input.days,
      reason: input.reason,
      status: "pending",
      appliedAt: new Date().toISOString(),
    };
    set((s) => {
      const me = userById(s.actingUserId);
      const notify = me?.managerId
        ? [{ id: nid("N"), userId: me.managerId, kind: "leave" as const, title: `Leave request from ${me.name}`, body: `${input.days}d ${input.type} leave awaiting approval`, at: lr.appliedAt, read: false, href: "/leaves" }, ...s.notifications]
        : s.notifications;
      return { leaves: [lr, ...s.leaves], notifications: notify };
    });
    void persistLeaveApply(lr);
  },

  decideLeave: (id, decision, note) => {
    set((s) => {
      const lr = s.leaves.find((l) => l.id === id);
      if (!lr) return s;
      const audit = pushAudit(s, { action: "update", entity: "leave", entityId: id, entityLabel: userById(lr.userId)?.name ?? id, field: "status", before: lr.status, after: decision, reason: note });
      const note2: AppNotification = { id: nid("N"), userId: lr.userId, kind: "leave", title: `Leave ${decision}`, body: note || `${lr.days}d ${lr.type} leave`, at: new Date().toISOString(), read: false, href: "/my/leaves" };
      return {
        leaves: s.leaves.map((l) => (l.id === id ? { ...l, status: decision, approverId: s.actingUserId, decidedAt: new Date().toISOString(), decisionNote: note } : l)),
        audit: [audit, ...s.audit],
        notifications: [note2, ...s.notifications],
      };
    });
    void persistLeaveDecision(id, decision, get().actingUserId, note);
  },

  clockIn: async (opts) => {
    // The selfie modal already gathers a location fix and passes it in. Only fall
    // back to fetching here if it wasn't provided (e.g. a direct/legacy call).
    let coords = opts?.coords;
    if (!coords) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
        );
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {
        // Office clock-ins need a location; work-from-home doesn't.
        if (!opts?.wfh) return false;
      }
    }
    const tz = opts?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const photo = opts?.photo;
    const status = opts?.wfh ? "wfh" : "present";
    set((s) => {
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date().toISOString();
      const existing = s.attendance.find((a) => a.userId === s.actingUserId && a.date === today);
      if (existing) {
        if (existing.checkIn) return s;
        return { attendance: s.attendance.map((a) => (a === existing ? { ...a, status, checkIn: now, checkInCoords: coords, checkInTimezone: tz, checkInPhoto: photo } : a)) };
      }
      const rec: AttendanceRecord = { id: nid("AT"), userId: s.actingUserId, date: today, status, checkIn: now, checkInCoords: coords, checkInTimezone: tz, checkInPhoto: photo };
      return { attendance: [rec, ...s.attendance] };
    });
    persistDay();
    return true;
  },

  clockOut: () => {
    set((s) => {
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date().toISOString();
      return {
        attendance: s.attendance.map((a) => {
          if (a.userId === s.actingUserId && a.date === today && a.checkIn && !a.checkOut) {
            const worked = Math.round((Date.parse(now) - Date.parse(a.checkIn)) / 60000);
            return { ...a, checkOut: now, workedMinutes: worked };
          }
          return a;
        }),
      };
    });
    persistDay();
  },

  // ── meetings ──
  scheduleMeeting: (input) => {
    const id = nid("MTG");
    set((s) => {
      const now = new Date().toISOString();
      const lead = input.leadId ? s.leads.find((l) => l.id === input.leadId) : undefined;
      const insights: MeetingNote[] = input.initialInsight?.trim()
        ? [{ id: nid("MN"), authorId: s.actingUserId, at: now, text: input.initialInsight.trim() }]
        : [];
      const meeting: Meeting = {
        id,
        title: input.title,
        organizerId: s.actingUserId,
        attendeeIds: input.attendeeIds,
        leadId: input.leadId,
        clientContact: input.clientContact,
        scheduledAt: input.scheduledAt,
        durationMin: input.durationMin,
        mode: input.mode,
        location: input.location,
        agenda: input.agenda,
        status: "scheduled",
        insights,
        minutes: [],
        createdAt: now,
      };
      const organizer = userById(s.actingUserId);
      const whenLabel = new Date(input.scheduledAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
      // notify every internal attendee so the meeting shows up for them
      const notifs: AppNotification[] = input.attendeeIds
        .filter((uid) => uid !== s.actingUserId)
        .map((uid) => ({
          id: nid("N"),
          userId: uid,
          kind: "meeting" as const,
          title: `Meeting invite — ${input.title}`,
          body: `${organizer?.name ?? "A colleague"} scheduled a meeting${lead ? ` with ${lead.company}` : ""} for ${whenLabel}`,
          at: now,
          read: false,
          href: `/meetings/${id}`,
        }));
      const audit = pushAudit(s, { action: "create", entity: "meeting", entityId: id, entityLabel: input.title, after: lead?.company });
      // thread a note into the client's timeline
      const activities = lead
        ? [{ id: nid("A"), leadId: lead.id, type: "meeting" as const, actorId: s.actingUserId, at: now, title: `Meeting scheduled — ${input.title}`, body: `${whenLabel} · ${input.agenda ?? ""}`.trim() }, ...s.activities]
        : s.activities;
      return {
        meetings: [meeting, ...s.meetings],
        notifications: [...notifs, ...s.notifications],
        audit: [audit, ...s.audit],
        activities,
        leads: lead ? s.leads.map((l) => (l.id === lead.id ? { ...l, lastActivityAt: now } : l)) : s.leads,
      };
    });
    return id;
  },

  updateMeeting: (id, patch) =>
    set((s) => ({ meetings: s.meetings.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),

  addMeetingNote: (id, kind, text) =>
    set((s) => {
      const trimmed = text.trim();
      if (!trimmed) return s;
      const note: MeetingNote = { id: nid("MN"), authorId: s.actingUserId, at: new Date().toISOString(), text: trimmed };
      return {
        meetings: s.meetings.map((m) =>
          m.id === id
            ? kind === "insight"
              ? { ...m, insights: [...m.insights, note] }
              : { ...m, minutes: [...m.minutes, note] }
            : m
        ),
      };
    }),

  setMeetingStatus: (id, status) =>
    set((s) => ({ meetings: s.meetings.map((m) => (m.id === id ? { ...m, status } : m)) })),

  // ── break sessions on today's attendance ──
  startBreak: (type, minutes) => {
    set((s) => {
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date().toISOString();
      const brk: BreakSession = { id: nid("BRK"), type, startedAt: now, plannedMinutes: minutes, remindersSent: 0 };
      const existing = s.attendance.find((a) => a.userId === s.actingUserId && a.date === today);
      if (existing) {
        // don't stack breaks — ignore if one is already running
        if ((existing.breaks ?? []).some((b) => !b.endedAt)) return s;
        return { attendance: s.attendance.map((a) => (a === existing ? { ...a, checkIn: a.checkIn ?? now, status: "present", onBreak: true, breaks: [...(a.breaks ?? []), brk] } : a)) };
      }
      const rec: AttendanceRecord = { id: nid("AT"), userId: s.actingUserId, date: today, status: "present", checkIn: now, onBreak: true, breaks: [brk] };
      return { attendance: [rec, ...s.attendance] };
    });
    persistDay();
  },

  endBreak: () => {
    set((s) => {
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date().toISOString();
      return {
        attendance: s.attendance.map((a) => {
          if (a.userId !== s.actingUserId || a.date !== today || !a.breaks) return a;
          // accumulate the finished break's minutes into the aggregate
          let added = 0;
          const breaks = a.breaks.map((b) => {
            if (!b.endedAt) { added = Math.round((Date.parse(now) - Date.parse(b.startedAt)) / 60000); return { ...b, endedAt: now }; }
            return b;
          });
          return { ...a, breaks, onBreak: false, totalBreakMinutes: (a.totalBreakMinutes ?? 0) + added };
        }),
      };
    });
    persistDay();
  },

  breakReminder: (breakId) =>
    set((s) => {
      const today = new Date().toISOString().slice(0, 10);
      let type: BreakType | undefined;
      const attendance = s.attendance.map((a) => {
        if (a.userId !== s.actingUserId || a.date !== today || !a.breaks) return a;
        return {
          ...a,
          breaks: a.breaks.map((b) => {
            if (b.id === breakId && !b.endedAt) {
              type = b.type;
              return { ...b, remindersSent: b.remindersSent + 1 };
            }
            return b;
          }),
        };
      });
      if (!type) return s;
      const notify: AppNotification = {
        id: nid("N"),
        userId: s.actingUserId,
        kind: "system",
        title: "Break time's up — clock back in",
        body: `Your ${type} break has run over. Tap to end the break, or you'll be reminded again in 5 minutes.`,
        at: new Date().toISOString(),
        read: false,
        href: "/my",
      };
      return { attendance, notifications: [notify, ...s.notifications] };
    }),

  createTask: (input) => {
    const id = nid("T");
    set((s) => {
      const task: Task = {
        id,
        title: input.title,
        description: input.description,
        assigneeId: input.assigneeId,
        createdById: s.actingUserId,
        departmentId: input.departmentId,
        projectId: input.projectId,
        status: input.status ?? "todo",
        priority: input.priority,
        createdAt: new Date().toISOString(),
        dueAt: input.dueAt,
        loggedHrs: 0,
      };
      const notify: AppNotification | null =
        input.assigneeId !== s.actingUserId
          ? { id: nid("N"), userId: input.assigneeId, kind: "task", title: "New task assigned", body: input.title, at: task.createdAt, read: false, href: "/tasks" }
          : null;
      const audit = pushAudit(s, { action: "create", entity: "task", entityId: id, entityLabel: input.title, after: userById(input.assigneeId)?.name });
      return { tasks: [task, ...s.tasks], notifications: notify ? [notify, ...s.notifications] : s.notifications, audit: [audit, ...s.audit] };
    });
    return id;
  },

  addProject: (input) => {
    const at = new Date().toISOString();
    const id = `PRJ-${++idc}`;
    set((s) => {
      const project: Project = {
        id,
        name: input.name,
        description: input.description ?? "",
        clientCompany: input.clientCompany,
        clientContact: input.clientContact,
        clientEmail: input.clientEmail,
        leadId: input.leadId,
        status: input.status,
        priority: input.priority,
        departmentId: input.departmentId,
        managerId: input.managerId,
        memberIds: input.memberIds,
        repoUrl: input.repoUrl,
        link: input.link,
        startedAt: at,
        dueAt: input.dueAt,
        progress: input.progress ?? 0,
        techStack: input.techStack,
        commits: [],
      };
      const audit = pushAudit(s, { action: "create", entity: "project", entityId: id, entityLabel: input.name, after: userById(input.managerId ?? "")?.name });
      return { projects: [project, ...s.projects], audit: [audit, ...s.audit] };
    });
    return id;
  },

  updateProject: (id, patch) =>
    set((s) => {
      const p = s.projects.find((x) => x.id === id);
      if (!p) return s;
      const audit = pushAudit(s, { action: "update", entity: "project", entityId: id, entityLabel: p.name });
      return { projects: s.projects.map((x) => (x.id === id ? { ...x, ...patch } : x)), audit: [audit, ...s.audit] };
    }),

  createCampaign: (input) => {
    const id = `CMP-${++idc}`;
    set((s) => {
      const campaign: Campaign = {
        id,
        clientId: input.clientId,
        name: input.name,
        status: input.status,
        channel: input.channel,
        startAt: input.startAt,
        endAt: input.endAt,
        reach: input.reach ?? 0,
        engagement: input.engagement ?? 0,
        spend: input.spend ?? 0,
        leads: input.leads ?? 0,
        checkUrl: input.checkUrl,
        liveUrl: input.liveUrl,
      };
      const audit = pushAudit(s, { action: "create", entity: "campaign", entityId: id, entityLabel: input.name });
      return { campaigns: [campaign, ...s.campaigns], audit: [audit, ...s.audit] };
    });
    return id;
  },

  updateCampaign: (id, patch) =>
    set((s) => {
      const c = s.campaigns.find((x) => x.id === id);
      if (!c) return s;
      const audit = pushAudit(s, { action: "update", entity: "campaign", entityId: id, entityLabel: c.name });
      return { campaigns: s.campaigns.map((x) => (x.id === id ? { ...x, ...patch } : x)), audit: [audit, ...s.audit] };
    }),

  createContent: (input) => {
    const id = `CP-${++idc}`;
    set((s) => {
      const post: ContentPost = {
        id,
        clientId: input.clientId,
        title: input.title,
        channel: input.channel,
        scheduledAt: input.scheduledAt,
        status: input.status,
        ownerId: input.ownerId,
        checkUrl: input.checkUrl,
        liveUrl: input.liveUrl,
      };
      const audit = pushAudit(s, { action: "create", entity: "content", entityId: id, entityLabel: input.title });
      return { content: [post, ...s.content], audit: [audit, ...s.audit] };
    });
    return id;
  },

  updateContent: (id, patch) =>
    set((s) => {
      const p = s.content.find((x) => x.id === id);
      if (!p) return s;
      const audit = pushAudit(s, { action: "update", entity: "content", entityId: id, entityLabel: patch.title ?? p.title });
      return { content: s.content.map((x) => (x.id === id ? { ...x, ...patch } : x)), audit: [audit, ...s.audit] };
    }),

  moveContent: (id, status) =>
    set((s) => {
      const p = s.content.find((x) => x.id === id);
      if (!p || p.status === status) return s;
      const audit = pushAudit(s, { action: "update", entity: "content", entityId: id, entityLabel: p.title, field: "status", before: p.status, after: status });
      return { content: s.content.map((x) => (x.id === id ? { ...x, status } : x)), audit: [audit, ...s.audit] };
    }),

  moveTask: (id, status) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) })),

  updateTask: (id, patch) =>
    set((s) => {
      const t = s.tasks.find((x) => x.id === id);
      if (!t) return s;
      const audit = pushAudit(s, { action: "update", entity: "task", entityId: id, entityLabel: patch.title ?? t.title });
      // notify the assignee if reassigned to someone else
      const reassigned = patch.assigneeId && patch.assigneeId !== t.assigneeId && patch.assigneeId !== s.actingUserId;
      const notify = reassigned
        ? [{ id: nid("N"), userId: patch.assigneeId!, kind: "task" as const, title: "Task assigned to you", body: patch.title ?? t.title, at: new Date().toISOString(), read: false, href: "/tasks" }, ...s.notifications]
        : s.notifications;
      return { tasks: s.tasks.map((x) => (x.id === id ? { ...x, ...patch } : x)), audit: [audit, ...s.audit], notifications: notify };
    }),

  deleteTask: (id) =>
    set((s) => {
      const t = s.tasks.find((x) => x.id === id);
      const audit = t ? [pushAudit(s, { action: "delete", entity: "task", entityId: id, entityLabel: t.title }), ...s.audit] : s.audit;
      return { tasks: s.tasks.filter((x) => x.id !== id), audit };
    }),

  markNotificationRead: (id) =>
    set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),

  markAllNotificationsRead: (userId) =>
    set((s) => ({ notifications: s.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)) })),

  addAnnouncement: (title, body, audience) =>
    set((s) => {
      const an: Announcement = { id: nid("AN"), title, body, authorId: s.actingUserId, at: new Date().toISOString(), audience };
      const audit = pushAudit(s, { action: "create", entity: "announcement", entityId: an.id, entityLabel: title });
      return { announcements: [an, ...s.announcements], audit: [audit, ...s.audit] };
    }),

  createTicket: (input) => {
    const id = nid("TK");
    set((s) => {
      const now = new Date().toISOString();
      const ticket: Ticket = {
        id,
        subject: input.subject,
        description: input.description,
        raisedById: s.actingUserId,
        assigneeId: "u-meera",
        departmentId: "dept-admin",
        category: input.category,
        priority: input.priority,
        status: "open",
        createdAt: now,
        updatedAt: now,
        comments: [],
      };
      return { tickets: [ticket, ...s.tickets] };
    });
    return id;
  },

  setTicketStatus: (id, status) =>
    set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t)) })),

  saveCompany: (patch) => set((s) => ({ company: { ...s.company, ...patch } })),
  setApprovalRules: (patch) => set((s) => ({ approvalRules: { ...s.approvalRules, ...patch } })),

  // ─────────────────────────── QIMS ──────────────────────────
  createAuditReport: (leadId) =>
    set((s) => {
      const existing = s.auditReports.find((r) => r.leadId === leadId);
      const now = new Date().toISOString();
      const genItems = [
        { key: "website", label: "Website", status: "fail" as const, detail: "No website / weak presence found.", recommendation: "Build a conversion-focused site." },
        { key: "gmb", label: "Google Business", status: "warn" as const, detail: "Listing unoptimised.", recommendation: "Claim + optimise GMB." },
        { key: "social", label: "Social presence", status: "warn" as const, detail: "Irregular posting.", recommendation: "Content retainer." },
      ];
      if (existing) {
        return {
          auditReports: s.auditReports.map((r) =>
            r.id === existing.id
              ? { ...r, status: "draft", createdAt: now, score: r.score || 45, summary: r.summary || "Auto-generated digital-health audit. Review and edit before sending.", items: r.items.length ? r.items : genItems }
              : r
          ),
        };
      }
      const lead = s.leads.find((l) => l.id === leadId);
      const report: AuditReport = {
        id: nid("AR"),
        leadId,
        company: lead?.company ?? "Unknown",
        status: "draft",
        ownerId: s.actingUserId,
        createdAt: now,
        score: 45,
        summary: "Auto-generated digital-health audit. Review and edit before sending.",
        items: genItems,
      };
      return { auditReports: [report, ...s.auditReports] };
    }),

  setAuditReportStatus: (id, status) =>
    set((s) => {
      const now = new Date().toISOString();
      return {
        auditReports: s.auditReports.map((r) =>
          r.id === id
            ? {
                ...r,
                status,
                sentAt: status === "sent" ? now : r.sentAt,
                decidedAt: status === "accepted" || status === "rejected" ? now : r.decidedAt,
              }
            : r
        ),
      };
    }),

  verifyAuditReport: (id) =>
    set((s) => ({
      auditReports: s.auditReports.map((r) => (r.id === id ? { ...r, verifiedById: s.actingUserId } : r)),
    })),

  submitProposalForReview: (id) =>
    set((s) => {
      const audit = pushAudit(s, { action: "update", entity: "proposal", entityId: id, entityLabel: s.proposals.find((p) => p.id === id)?.number ?? id, field: "reviewStatus", after: "internal_review" });
      return { proposals: s.proposals.map((p) => (p.id === id ? { ...p, reviewStatus: "internal_review", status: p.status === "draft" ? "pending_approval" : p.status } : p)), audit: [audit, ...s.audit] };
    }),

  verifyProposal: (id) =>
    set((s) => {
      const audit = pushAudit(s, { action: "approve", entity: "proposal", entityId: id, entityLabel: s.proposals.find((p) => p.id === id)?.number ?? id, after: "Verified for client" });
      return { proposals: s.proposals.map((p) => (p.id === id ? { ...p, reviewStatus: "verified", verifiedById: s.actingUserId } : p)), audit: [audit, ...s.audit] };
    }),

  shareProposal: (id) => {
    const token = `qt_${Math.abs(hashStr(id + Date.now())).toString(36)}`;
    set((s) => ({
      proposals: s.proposals.map((p) => (p.id === id ? { ...p, reviewStatus: "shared", status: p.status === "accepted" ? p.status : "sent", shareToken: token } : p)),
    }));
    return token;
  },

  shareAuditReport: (id) => {
    const token = `at_${Math.abs(hashStr(id + Date.now())).toString(36)}`;
    const now = new Date().toISOString();
    set((s) => ({
      auditReports: s.auditReports.map((r) =>
        r.id === id
          ? {
              ...r,
              shareToken: token,
              status: r.status === "accepted" || r.status === "rejected" ? r.status : "sent",
              sentAt: r.status === "accepted" || r.status === "rejected" ? r.sentAt : now,
            }
          : r
      ),
    }));
    return token;
  },

  auditDecision: (token, decision, via, contact, rejectReason) =>
    set((s) => {
      const r = s.auditReports.find((x) => x.shareToken === token);
      if (!r) return s;
      const now = new Date().toISOString();
      return {
        auditReports: s.auditReports.map((x) =>
          x.id === r.id ? { ...x, status: decision, decidedAt: now, customer: { decision, decidedAt: now, via, contact, rejectReason } } : x
        ),
      };
    }),

  customerDecision: (token, decision, via, contact, rejectReason) =>
    set((s) => {
      const p = s.proposals.find((x) => x.shareToken === token);
      if (!p) return s;
      const now = new Date().toISOString();
      const leadStage: LeadStage | undefined = decision === "accepted" ? "won" : "lost";
      const activity: Activity = {
        id: nid("A"),
        leadId: p.leadId,
        type: "proposal",
        actorId: p.ownerId,
        at: now,
        title: `Customer ${decision} quotation ${p.number}`,
        body: rejectReason ? `Reason: ${rejectReason}` : `via ${via === "gmail" ? "Google" : "Phone OTP"} (${contact})`,
      };
      return {
        proposals: s.proposals.map((x) => (x.id === p.id ? { ...x, status: decision, customer: { decision, decidedAt: now, via, contact, rejectReason } } : x)),
        leads: s.leads.map((l) => (l.id === p.leadId ? { ...l, stage: leadStage!, lostReason: decision === "rejected" ? rejectReason : l.lostReason, lastActivityAt: now } : l)),
        activities: [activity, ...s.activities],
      };
    }),

  // reviewer bounces a quotation back to the BDA to revise
  rejectProposal: (id, reason) =>
    set((s) => {
      const p = s.proposals.find((x) => x.id === id);
      if (!p) return s;
      const now = new Date().toISOString();
      const audit = pushAudit(s, { action: "update", entity: "proposal", entityId: id, entityLabel: p.number, field: "reviewStatus", after: "rejected — revise", reason });
      const notify: AppNotification = { id: nid("N"), userId: p.ownerId, kind: "quotation", title: `Quotation ${p.number} sent back to revise`, body: reason, at: now, read: false, href: `/proposals/${id}` };
      const activity: Activity = { id: nid("A"), leadId: p.leadId, type: "proposal", actorId: s.actingUserId, at: now, title: `Quotation ${p.number} returned for revision`, body: reason };
      return {
        proposals: s.proposals.map((x) => (x.id === id ? { ...x, status: "draft", reviewStatus: undefined, verifiedById: undefined } : x)),
        audit: [audit, ...s.audit],
        notifications: [notify, ...s.notifications],
        activities: [activity, ...s.activities],
      };
    }),

  rejectAuditReport: (id, reason) =>
    set((s) => {
      const r = s.auditReports.find((x) => x.id === id);
      if (!r) return s;
      const audit = pushAudit(s, { action: "update", entity: "audit_report", entityId: id, entityLabel: r.company, field: "status", after: "returned — revise", reason });
      const notify: AppNotification = { id: nid("N"), userId: r.ownerId, kind: "audit_report", title: `Audit for ${r.company} sent back to revise`, body: reason, at: new Date().toISOString(), read: false, href: `/audit-reports/${id}` };
      return {
        auditReports: s.auditReports.map((x) => (x.id === id ? { ...x, status: "draft", verifiedById: undefined } : x)),
        audit: [audit, ...s.audit],
        notifications: [notify, ...s.notifications],
      };
    }),

  updateAuditReport: (id, patch) =>
    set((s) => {
      const r = s.auditReports.find((x) => x.id === id);
      if (!r) return s;
      const audit = pushAudit(s, { action: "update", entity: "audit_report", entityId: id, entityLabel: r.company, after: "Edited" });
      return { auditReports: s.auditReports.map((x) => (x.id === id ? { ...x, ...patch } : x)), audit: [audit, ...s.audit] };
    }),

  upsertAuditReport: (leadId, patch) => {
    let id = "";
    set((s) => {
      const now = new Date().toISOString();
      const existing = s.auditReports.find((r) => r.leadId === leadId);
      const lead = s.leads.find((l) => l.id === leadId);
      if (existing) {
        id = existing.id;
        return { auditReports: s.auditReports.map((r) => (r.id === existing.id ? { ...r, ...patch, status: r.status === "sent" || r.status === "accepted" ? r.status : "draft" } : r)) };
      }
      id = nid("AR");
      const report: AuditReport = {
        id, leadId, company: lead?.company ?? "Unknown", status: "draft", ownerId: s.actingUserId, createdAt: now,
        score: patch.overallScore ?? patch.score ?? 60, summary: patch.summary ?? "", items: patch.items ?? [], ...patch,
      };
      return { auditReports: [report, ...s.auditReports] };
    });
    return id;
  },

  logDocumentSend: (leadId, docLabel, channel) =>
    set((s) => {
      const now = new Date().toISOString();
      const activity: Activity = { id: nid("A"), leadId, type: channel === "email" ? "email" : "whatsapp", actorId: s.actingUserId, at: now, title: `${docLabel} sent via ${channel === "email" ? "Email" : "WhatsApp"}` };
      const audit = pushAudit(s, { action: "create", entity: "document", entityId: leadId, entityLabel: docLabel, after: `Sent via ${channel === "email" ? "Email" : "WhatsApp"}` });
      return { activities: [activity, ...s.activities], audit: [audit, ...s.audit] };
    }),

  updateInvoice: (id, patch) =>
    set((s) => {
      const iv = s.invoices.find((x) => x.id === id);
      if (!iv) return s;
      const audit = pushAudit(s, { action: "update", entity: "invoice", entityId: id, entityLabel: iv.number, after: "Edited" });
      return { invoices: s.invoices.map((x) => (x.id === id ? { ...x, ...patch } : x)), audit: [audit, ...s.audit] };
    }),

  updateProposal: (id, patch) =>
    set((s) => {
      const p = s.proposals.find((x) => x.id === id);
      if (!p) return s;
      const audit = pushAudit(s, { action: "update", entity: "proposal", entityId: id, entityLabel: p.number, after: "Edited" });
      return { proposals: s.proposals.map((x) => (x.id === id ? { ...x, ...patch } : x)), audit: [audit, ...s.audit] };
    }),

  convertProposalToInvoice: (proposalId) => {
    const id = nid("INV");
    set((s) => {
      const p = s.proposals.find((x) => x.id === proposalId);
      if (!p) return s;
      const lead = s.leads.find((l) => l.id === p.leadId);
      const t = proposalTotals(p.items);
      const now = new Date();
      const due = new Date(now.getTime() + 15 * 86400000);
      const number = `${s.company.invoicePrefix}${String(9 + s.invoices.length).padStart(4, "0")}`;
      const invoice: Invoice = {
        id,
        number,
        leadId: p.leadId,
        company: lead?.company ?? "Client",
        issuedAt: now.toISOString(),
        dueAt: due.toISOString(),
        status: "issued",
        subtotal: Math.round(t.subtotal),
        gst: Math.round(t.gst),
        tdsAmount: 0,
        total: Math.round(t.total),
        received: 0,
        milestone: `From quotation ${p.number}`,
        recurring: p.items.some((i) => i.billingType === "retainer"),
      };
      const activity: Activity = { id: nid("A"), leadId: p.leadId, type: "note", actorId: s.actingUserId, at: now.toISOString(), title: `Invoice ${number} created from ${p.number}` };
      const audit = pushAudit(s, { action: "create", entity: "invoice", entityId: id, entityLabel: number, after: `Converted from ${p.number}` });
      return { invoices: [invoice, ...s.invoices], activities: [activity, ...s.activities], audit: [audit, ...s.audit] };
    });
    return id;
  },

  addBrief: (leadId, text) =>
    set((s) => {
      const brief: Brief = { id: nid("BR"), leadId, authorId: s.actingUserId, at: new Date().toISOString(), text };
      const activity: Activity = { id: nid("A"), leadId, type: "note", actorId: s.actingUserId, at: brief.at, title: "Added a brief", body: text };
      return { briefs: [brief, ...s.briefs], activities: [activity, ...s.activities] };
    }),

  assignLead: (leadId, userIds, deptIds) =>
    set((s) => {
      const lead = s.leads.find((l) => l.id === leadId);
      if (!lead) return s;
      const audit = pushAudit(s, { action: "update", entity: "lead", entityId: leadId, entityLabel: lead.company, field: "assignment", after: `${userIds.length} people · ${deptIds.length} teams` });
      // notify newly-assigned people
      const already = new Set(lead.assignedUserIds ?? []);
      const now = new Date().toISOString();
      const newNotes: AppNotification[] = userIds
        .filter((uid) => !already.has(uid) && uid !== s.actingUserId)
        .map((uid) => ({ id: nid("N"), userId: uid, kind: "task", title: `Assigned to ${lead.company}`, body: "You've been added to this deal's execution team.", at: now, read: false, href: `/leads/${leadId}` }));
      return {
        leads: s.leads.map((l) => (l.id === leadId ? { ...l, assignedUserIds: userIds, assignedDeptIds: deptIds } : l)),
        audit: [audit, ...s.audit],
        notifications: [...newNotes, ...s.notifications],
      };
    }),

  acquireLead: (leadId) =>
    set((s) => {
      const lead = s.leads.find((l) => l.id === leadId);
      if (!lead || !lead.pooled) return s;
      const now = new Date().toISOString();
      const audit = pushAudit(s, { action: "update", entity: "lead", entityId: leadId, entityLabel: lead.company, field: "owner", before: "Explore pool", after: userById(s.actingUserId)?.name });
      const activity: Activity = { id: nid("A"), leadId, type: "note", actorId: s.actingUserId, at: now, title: "Acquired from Explore", body: `${userById(s.actingUserId)?.name} picked this lead up from the shared pool.` };
      return {
        leads: s.leads.map((l) =>
          l.id === leadId ? { ...l, ownerId: s.actingUserId, pooled: false, pooledBy: undefined, pooledAt: undefined, pooledNote: undefined, lastActivityAt: now } : l
        ),
        audit: [audit, ...s.audit],
        activities: [activity, ...s.activities],
      };
    }),

  releaseLead: (leadId, note) =>
    set((s) => {
      const lead = s.leads.find((l) => l.id === leadId);
      if (!lead) return s;
      const now = new Date().toISOString();
      const audit = pushAudit(s, { action: "update", entity: "lead", entityId: leadId, entityLabel: lead.company, field: "owner", before: userById(lead.ownerId)?.name ?? lead.ownerId, after: "Explore pool", reason: note });
      const activity: Activity = { id: nid("A"), leadId, type: "note", actorId: s.actingUserId, at: now, title: "Sent to Explore", body: note || "Released back to the shared lead pool." };
      return {
        leads: s.leads.map((l) =>
          l.id === leadId ? { ...l, pooled: true, pooledBy: s.actingUserId, pooledAt: now, pooledNote: note, ownerId: "", lastActivityAt: now } : l
        ),
        audit: [audit, ...s.audit],
        activities: [activity, ...s.activities],
      };
    }),

  bulkCreateLeads: (inputs) => {
    let count = 0;
    set((s) => {
      const now = new Date().toISOString();
      const newLeads: Lead[] = [];
      const newActivities: Activity[] = [];
      for (const input of inputs) {
        if (!input.company?.trim()) continue;
        const id = nid("L");
        count++;
        newLeads.push({
          id,
          company: input.company,
          contactName: input.contactName,
          role: input.role || "Owner",
          phone: input.phone,
          email: input.email,
          city: input.city,
          industry: input.industry,
          website: input.website || undefined,
          stage: "new",
          source: input.source,
          interest: input.interest,
          ownerId: s.actingUserId,
          score: input.website ? 55 : 68,
          estimatedValue: input.estimatedValue || 0,
          billingType: input.interest === "website" ? "one_time" : input.interest === "social_media" || input.interest === "outreach" ? "retainer" : "mixed",
          createdAt: now,
          lastActivityAt: now,
          tags: input.website ? [] : ["no-website"],
          queueReason: { kind: "hot_new", label: "Imported lead" },
        });
        newActivities.push({ id: nid("A"), leadId: id, type: "note", actorId: s.actingUserId, at: now, title: "Lead imported", body: "Added via bulk import (Excel/CSV)" });
      }
      if (!newLeads.length) return s;
      const audit = pushAudit(s, { action: "create", entity: "lead", entityId: "bulk", entityLabel: `${newLeads.length} leads`, after: "Imported from Excel/CSV" });
      return { leads: [...newLeads, ...s.leads], activities: [...newActivities, ...s.activities], audit: [audit, ...s.audit] };
    });
    return count;
  },

  // ─────────────────────────── Milestones & payments ───────────────────────────
  addMilestones: (leadId, milestones) =>
    set((s) => {
      const lead = s.leads.find((l) => l.id === leadId);
      const now = new Date().toISOString();
      const created: Milestone[] = milestones.map((m) => ({ id: nid("MS"), leadId, label: m.label, amount: m.amount, status: "pending", dueAt: m.dueAt }));
      const audit = pushAudit(s, { action: "create", entity: "milestone", entityId: leadId, entityLabel: lead?.company ?? leadId, after: `${created.length} milestones` });
      const activity: Activity = { id: nid("A"), leadId, type: "note", actorId: s.actingUserId, at: now, title: "Payment milestones set", body: created.map((m) => `${m.label}: ${m.amount}`).join(" · ") };
      return { milestones: [...s.milestones, ...created], audit: [audit, ...s.audit], activities: [activity, ...s.activities] };
    }),

  deleteMilestone: (id) => set((s) => ({ milestones: s.milestones.filter((m) => m.id !== id) })),

  logPayment: (input) => {
    let receiptNumber = "";
    set((s) => {
      const now = new Date().toISOString();
      receiptNumber = `${s.company.receiptPrefix}${String(1 + s.payments.length).padStart(4, "0")}`;
      const pay: PaymentRecord = {
        id: nid("PAY"),
        receiptNumber,
        leadId: input.leadId,
        invoiceId: input.invoiceId,
        milestoneId: input.milestoneId,
        company: input.company,
        contactName: input.contactName,
        amount: input.amount,
        mode: input.mode,
        reference: input.reference,
        at: now,
        note: input.note,
        recordedById: s.actingUserId,
      };
      // mark milestone paid
      const milestones = input.milestoneId ? s.milestones.map((m) => (m.id === input.milestoneId ? { ...m, status: "paid" as const, paidAt: now } : m)) : s.milestones;
      // roll payment into the invoice's received / status
      const invoices = input.invoiceId
        ? s.invoices.map((iv) => {
            if (iv.id !== input.invoiceId) return iv;
            const received = iv.received + input.amount;
            const status = received >= iv.total - iv.tdsAmount ? ("paid" as const) : ("partially_paid" as const);
            return { ...iv, received, status };
          })
        : s.invoices;
      const audit = pushAudit(s, { action: "create", entity: "payment", entityId: pay.id, entityLabel: receiptNumber, after: `${input.amount} via ${input.mode}` });
      const activity: Activity | null = input.leadId
        ? { id: nid("A"), leadId: input.leadId, type: "note", actorId: s.actingUserId, at: now, title: `Payment received — ${receiptNumber}`, body: `${input.amount} via ${input.mode}${input.reference ? ` (${input.reference})` : ""}` }
        : null;
      return { payments: [pay, ...s.payments], milestones, invoices, audit: [audit, ...s.audit], activities: activity ? [activity, ...s.activities] : s.activities };
    });
    return receiptNumber;
  },

  // ─────────────────────────── Forms ───────────────────────────
  createForm: (input) => {
    const id = nid("FRM");
    set((s) => {
      const token = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24)}-${Math.abs(hashStr(id)).toString(36).slice(0, 4)}`;
      const form: FormDef = {
        id, token, title: input.title, description: input.description, ownerId: s.actingUserId,
        createdAt: new Date().toISOString(), published: true, fields: input.fields, autoCreateLead: input.autoCreateLead, responseCount: 0,
      };
      return { forms: [form, ...s.forms] };
    });
    return id;
  },

  updateForm: (id, patch) => set((s) => ({ forms: s.forms.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
  deleteForm: (id) => set((s) => ({ forms: s.forms.filter((f) => f.id !== id), formResponses: s.formResponses.filter((r) => r.formId !== id) })),

  submitFormResponse: (token, answers) =>
    set((s) => {
      const form = s.forms.find((f) => f.token === token);
      if (!form) return s;
      const resp: FormResponse = { id: nid("FR"), formId: form.id, at: new Date().toISOString(), answers };
      let leads = s.leads;
      let activities = s.activities;
      const forms = s.forms.map((f) => (f.id === form.id ? { ...f, responseCount: f.responseCount + 1 } : f));
      // auto-create a lead if configured
      if (form.autoCreateLead) {
        const built = buildLeadFromResponse(form, answers, form.ownerId);
        resp.convertedLeadId = built.id;
        leads = [built, ...leads];
        activities = [{ id: nid("A"), leadId: built.id, type: "note", actorId: form.ownerId, at: built.createdAt, title: "Lead from form", body: `Submitted “${form.title}”` }, ...activities];
      }
      return { formResponses: [resp, ...s.formResponses], forms, leads, activities };
    }),

  convertResponseToLead: (responseId) => {
    let newId: string | undefined;
    set((s) => {
      const resp = s.formResponses.find((r) => r.id === responseId);
      if (!resp || resp.convertedLeadId) return s;
      const form = s.forms.find((f) => f.id === resp.formId);
      if (!form) return s;
      const built = buildLeadFromResponse(form, resp.answers, s.actingUserId);
      newId = built.id;
      const activity: Activity = { id: nid("A"), leadId: built.id, type: "note", actorId: s.actingUserId, at: built.createdAt, title: "Lead from form response", body: `Converted a response to “${form.title}”` };
      return {
        leads: [built, ...s.leads],
        formResponses: s.formResponses.map((r) => (r.id === responseId ? { ...r, convertedLeadId: built.id } : r)),
        activities: [activity, ...s.activities],
      };
    });
    return newId;
  },

  saveDocOverride: (key, html) => set((s) => ({ docOverrides: { ...s.docOverrides, [key]: html } })),
  resetDocOverride: (key) =>
    set((s) => {
      const next = { ...s.docOverrides };
      delete next[key];
      return { docOverrides: next };
    }),

  saveTemplateDesign: (type, design) => set((s) => ({ templateDesigns: { ...s.templateDesigns, [type]: design } })),
  resetTemplateDesign: (type) =>
    set((s) => {
      const next = { ...s.templateDesigns };
      delete next[type];
      return { templateDesigns: next };
    }),
  saveDocDesign: (key, design) => set((s) => ({ docDesigns: { ...s.docDesigns, [key]: JSON.stringify(design) } })),
  resetDocDesign: (key) =>
    set((s) => {
      const next = { ...s.docDesigns };
      delete next[key];
      return { docDesigns: next };
    }),
  };
});

// build a Lead from a form's mapped answers
function buildLeadFromResponse(form: FormDef, answers: Record<string, string>, ownerId: string): Lead {
  const id = nid("L");
  const get = (map: FormField["mapTo"]) => {
    const f = form.fields.find((x) => x.mapTo === map);
    return f ? (answers[f.id] ?? "").trim() : "";
  };
  const interestRaw = get("interest").toLowerCase();
  const interest: ServiceInterest = interestRaw.includes("social") ? "social_media" : interestRaw.includes("web") ? "website" : interestRaw.includes("out") ? "outreach" : interestRaw.includes("combo") ? "combo" : "website";
  const now = new Date().toISOString();
  const website = "";
  return {
    id,
    company: get("company") || "Untitled lead",
    contactName: get("contactName") || "—",
    role: "Owner",
    phone: get("phone"),
    email: get("email") || undefined,
    city: get("city") || "—",
    industry: get("industry") || "—",
    website: website || undefined,
    stage: "new",
    source: "inbound_website",
    interest,
    interests: [interest],
    ownerId,
    score: 70,
    estimatedValue: 0,
    billingType: interest === "website" ? "one_time" : "retainer",
    createdAt: now,
    lastActivityAt: now,
    tags: ["form-lead"],
    queueReason: { kind: "hot_new", label: "New form submission" },
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return h;
}

// ── labels ──
export function labelStage(s: LeadStage): string {
  return {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    proposal_sent: "Proposal Sent",
    negotiation: "Negotiation",
    won: "Won",
    lost: "Lost",
  }[s];
}

export function labelDisposition(d: Disposition): string {
  return {
    connected: "Connected",
    no_answer: "No Answer",
    busy: "Busy",
    callback: "Callback",
    not_interested: "Not Interested",
    wrong_number: "Wrong Number",
  }[d];
}

function humanField(f: string): string {
  const map: Record<string, string> = {
    estimatedValue: "Estimated Value",
    stage: "Stage",
    ownerId: "Owner",
    phone: "Phone",
    email: "Email",
    score: "Score",
    contactName: "Contact Name",
  };
  return map[f] ?? f;
}
