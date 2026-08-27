// ─────────────────────────────────────────────────────────────
// BDA Sales Platform — domain types
// Shapes mirror the eventual Postgres tables so the swap from
// in-memory fixtures to Supabase is mechanical, not a redesign.
// ─────────────────────────────────────────────────────────────

// Legacy sales-role triad — kept so the original BDA screens keep working.
// New EMS code should read `accessLevel` + `departmentId` instead.
export type Role = "bda" | "manager" | "admin";

// Access tier — what someone is allowed to do, independent of their department.
export type AccessLevel = "admin" | "manager" | "employee";

// Departments are DYNAMIC — admins can add more at runtime. `key` is a stable
// slug used for feature-gating; `features` lists which module screens the dept sees.
export type DeptFeature =
  | "leads"
  | "quotations"
  | "invoices"
  | "prospect_audit"
  | "audit_reports"
  | "projects"
  | "timesheets"
  | "bugs"
  | "clients"
  | "content_calendar"
  | "campaigns";

export interface Department {
  id: string;
  key: string; // "bda" | "tech" | "media" | "hr" | custom
  name: string;
  color: "slate" | "primary" | "success" | "warning" | "danger" | "info" | "purple";
  icon?: string; // lucide icon name
  features: DeptFeature[];
  system?: boolean; // built-in dept, cannot be deleted
}

export type EmploymentType = "full_time" | "part_time" | "intern" | "contract";
export type EmployeeStatus = "active" | "on_leave" | "resigned" | "inactive";

export interface SalaryStructure {
  basic: number; // monthly components (₹)
  hra: number;
  special: number;
}

export interface LeaveBalance {
  casual: number; // remaining days
  sick: number;
  earned: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role; // legacy alias
  accessLevel: AccessLevel;
  departmentId: string;
  designation?: string; // "Senior BDA", "Frontend Engineer"
  managerId?: string; // reporting manager
  status?: EmployeeStatus;
  employmentType?: EmploymentType;
  joinedAt?: string;
  location?: string;
  phone: string;
  avatarColor?: string;
  teamId?: string;
  monthlyTargetCalls?: number;
  monthlyTargetRevenue?: number;
  // ── HR / payroll ──
  ctcAnnual?: number;
  salary?: SalaryStructure;
  bankLast4?: string;
  leaveBalance?: LeaveBalance;
  // ── portal login (prototype: plaintext, no backend) ──
  loginId?: string; // username used to sign in
  password?: string; // demo-only plaintext credential
  mustChangePassword?: boolean; // true right after onboarding until they set their own
}

// A credential hand-off "email" — simulated in-app outbox, not really sent.
export interface CredentialEmail {
  id: string;
  userId: string;
  to: string; // recipient work email
  name: string;
  loginId: string;
  tempPassword: string;
  loginUrl: string;
  sentAt: string;
}

export type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal_sent"
  | "negotiation"
  | "won"
  | "lost";

export type LeadSource =
  | "google_maps"
  | "manual_research"
  | "referral"
  | "inbound_website"
  | "indiamart"
  | "walk_in";

export type ServiceInterest = "social_media" | "website" | "outreach" | "combo";

export interface Lead {
  id: string;
  company: string;
  contactName: string;
  role: string; // decision maker role, e.g. "Owner", "Marketing Head"
  phone: string;
  email?: string;
  city: string;
  industry: string;
  website?: string; // undefined = no website (a hot signal for us)
  instagram?: string;
  stage: LeadStage;
  source: LeadSource;
  interest: ServiceInterest; // primary interest (kept for back-compat = interests[0])
  interests?: ServiceInterest[]; // a lead can be interested in multiple services
  ownerId: string;
  score: number; // 0-100
  estimatedValue: number;
  billingType: "one_time" | "retainer" | "mixed";
  createdAt: string;
  lastActivityAt: string;
  nextActionAt?: string;
  nextActionNote?: string;
  tags: string[];
  // duplicate detection: another owner previously touched this number/company
  duplicateOf?: { ownerName: string; lastTouchedAt: string };
  lostReason?: string;
  // the "why is this in my list today" reason chip
  queueReason?: QueueReason;
  // execution assignment once a deal is won — people and/or whole teams
  assignedUserIds?: string[];
  assignedDeptIds?: string[];
  // ── Explore pool: an unclaimed lead any BDA can acquire, or one a BDA
  // released back to the pool. `pooled` = currently in the shared pool. ──
  pooled?: boolean;
  pooledBy?: string; // BDA who sent it to Explore (undefined = fresh research/inbound)
  pooledAt?: string;
  pooledNote?: string; // why it was released ("wrong city", "no bandwidth", …)
}

// A short conversation brief anyone on the deal (BDA/manager/admin) can add.
export interface Brief {
  id: string;
  leadId: string;
  authorId: string;
  at: string;
  text: string;
}

export type QueueReason =
  | { kind: "callback_due"; label: string }
  | { kind: "followup_due"; label: string }
  | { kind: "hot_new"; label: string }
  | { kind: "going_cold"; label: string }
  | { kind: "proposal_opened"; label: string };

export type ActivityType =
  | "call"
  | "email"
  | "whatsapp"
  | "note"
  | "meeting"
  | "stage_change"
  | "proposal"
  | "field_edit";

export interface Activity {
  id: string;
  leadId: string;
  type: ActivityType;
  actorId: string;
  at: string;
  title: string;
  body?: string;
  meta?: Record<string, string | number | boolean>;
}

export type Disposition =
  | "connected"
  | "no_answer"
  | "busy"
  | "callback"
  | "not_interested"
  | "wrong_number";

export interface Call {
  id: string;
  leadId: string;
  agentId: string;
  at: string;
  direction: "outbound" | "inbound";
  toNumber: string;
  disposition: Disposition;
  durationSec: number;
  recordingSource: "manual_upload" | "companion_sync" | "telephony_webhook" | "mock";
  hasRecording: boolean;
  transcriptId?: string;
  notes?: string;
}

export interface TranscriptTurn {
  speaker: "agent" | "customer";
  at: number; // seconds offset
  text: string;
}

export interface Transcript {
  id: string;
  callId: string;
  language: string;
  turns: TranscriptTurn[];
}

/** AI-extracted structured insight — every field carries a confirmation flag */
export interface CallInsight {
  id: string;
  callId: string;
  leadId: string;
  fields: AiField[];
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
  talkRatioAgent: number; // 0-1
}

export interface AiField {
  key: string; // e.g. "requirement", "budget", "timeline", "objection", "next_action"
  label: string;
  value: string;
  confidence: number; // 0-1
  status: "pending" | "accepted" | "rejected";
  // applies to lead field of this name when accepted
  appliesTo?: keyof Lead | "task";
}

export type PackageCategory = "social_media" | "website" | "outreach";

export interface ServicePackage {
  id: string;
  category: PackageCategory;
  name: string; // "Growth", "5-page Website"
  tagline: string;
  sacCode: string;
  gstRate: number; // 18
  billingType: "one_time" | "retainer";
  price: number; // per month if retainer, one-time otherwise
  deliverables: string[];
  timelineDays: number;
  revisions: number;
}

export type ProposalStatus =
  | "draft"
  | "pending_approval"
  | "sent"
  | "opened"
  | "accepted"
  | "rejected"
  | "expired";

export interface ProposalItem {
  packageId: string;
  name: string;
  billingType: "one_time" | "retainer";
  sacCode: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  gstRate: number;
}

export interface Proposal {
  id: string;
  number: string; // QT/2025-26/0042
  leadId: string;
  ownerId: string;
  version: number;
  status: ProposalStatus;
  createdAt: string;
  validTill: string;
  items: ProposalItem[];
  openCount: number;
  approval?: {
    required: boolean;
    reason?: string;
    approvedBy?: string;
    approvedAt?: string;
  };
  emailDraft?: string;
  // ── internal review → verify → share to customer ──
  reviewStatus?: "internal_review" | "verified" | "shared";
  verifiedById?: string;
  shareToken?: string; // powers the public customer portal link
  customer?: {
    decision?: "accepted" | "rejected";
    decidedAt?: string;
    via?: "gmail" | "otp";
    contact?: string; // masked email / phone the customer signed in with
    rejectReason?: string;
  };
}

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue";

export interface Invoice {
  id: string;
  number: string; // INV/2025-26/0007
  leadId: string;
  company: string;
  issuedAt: string;
  dueAt: string;
  status: InvoiceStatus;
  subtotal: number;
  gst: number;
  tdsSection?: "194C" | "194J";
  tdsAmount: number;
  total: number; // subtotal + gst
  received: number;
  milestone?: string; // "50% advance"
  recurring: boolean;
}

export interface AuditEntry {
  id: string;
  at: string;
  actorId: string;
  actorRole: Role;
  action: "create" | "update" | "delete" | "export" | "view_recording" | "login" | "approve";
  entity: string; // "lead" | "proposal" | ...
  entityId: string;
  entityLabel: string;
  field?: string;
  before?: string;
  after?: string;
  reason?: string;
  impersonating?: string; // when admin acts as a BDA
}

export interface ProspectAuditResult {
  id: string;
  company: string;
  url?: string;
  checks: ProspectCheck[];
  score: number; // lead-heat: higher = more they need us
  opener: string; // suggested call opener
  createdAt: string;
}

export interface ProspectCheck {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

// ── Delivery / client portal ──
export type DeliveryStage = "onboarding" | "design" | "development" | "content" | "review" | "launched";

export interface DeliveryProject {
  id: string;
  leadId: string;
  company: string;
  type: ServiceInterest;
  stage: DeliveryStage;
  startedAt: string;
  ownerId: string;
  retainer: boolean;
  retainerEndsAt?: string;
  healthScore: number; // 0-100
  onboarding: OnboardingTask[];
  deliverables: Deliverable[];
}

export interface OnboardingTask {
  id: string;
  label: string;
  done: boolean;
}

export interface Deliverable {
  id: string;
  label: string;
  soldQty: number;
  deliveredQty: number;
  approvedByClient: boolean;
  period?: string; // "Aug 2025"
}

export interface Team {
  id: string;
  name: string;
}

// ═══════════════════════════════════════════════════════════════
// EMS — attendance, leave, payroll, tasks
// ═══════════════════════════════════════════════════════════════

export type AttendanceStatus =
  | "present"
  | "wfh"
  | "half_day"
  | "leave"
  | "absent"
  | "holiday"
  | "week_off";

export type BreakType = "tea" | "snacks" | "lunch" | "casual";

export interface BreakSession {
  id: string;
  type: BreakType;
  startedAt: string; // ISO
  plannedMinutes: number;
  endedAt?: string; // ISO — set when the person clocks back in
  remindersSent: number; // how many "come back" nudges fired
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkIn?: string; // ISO
  checkOut?: string; // ISO
  workedMinutes?: number;
  breaks?: BreakSession[];
  note?: string;
  checkInCoords?: { lat: number; lng: number };
  checkInTimezone?: string;
  checkInPhoto?: string; // base64 data URL of clock-in selfie
}

export type LeaveType = "casual" | "sick" | "earned" | "unpaid" | "comp_off";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveRequest {
  id: string;
  userId: string;
  type: LeaveType;
  from: string; // YYYY-MM-DD
  to: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedAt: string;
  approverId?: string;
  decidedAt?: string;
  decisionNote?: string;
}

export type PayslipStatus = "draft" | "processed" | "paid";

export interface PayComponent {
  label: string;
  amount: number;
}

export interface Payslip {
  id: string;
  userId: string;
  month: string; // YYYY-MM
  status: PayslipStatus;
  earnings: PayComponent[];
  deductions: PayComponent[];
  paidDays: number;
  lopDays: number; // loss of pay
  gross: number;
  net: number;
  generatedAt?: string;
  paidAt?: string;
}

export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigneeId: string;
  createdById: string;
  departmentId: string;
  projectId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  dueAt?: string;
  tags?: string[];
  estimateHrs?: number;
  loggedHrs?: number;
}

// ═══════════════════════════════════════════════════════════════
// Tech department — projects + git
// ═══════════════════════════════════════════════════════════════

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";

export interface GitCommit {
  sha: string;
  message: string;
  authorName: string;
  at: string;
  branch: string;
  additions: number;
  deletions: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  link?: string; // live/preview URL
  repoUrl?: string;
  status: ProjectStatus;
  priority: TaskPriority;
  departmentId: string;
  leadId?: string; // originating won lead
  clientCompany: string;
  clientContact?: string;
  clientEmail?: string;
  memberIds: string[];
  managerId?: string;
  startedAt: string;
  dueAt?: string;
  progress: number; // 0-100
  techStack: string[];
  commits: GitCommit[];
}

// ═══════════════════════════════════════════════════════════════
// Media & Marketing
// ═══════════════════════════════════════════════════════════════

export type ClientStatus = "onboarding" | "active" | "paused" | "churned";

export interface MediaClient {
  id: string;
  company: string;
  contact?: string;
  status: ClientStatus;
  ownerId: string;
  departmentId: string;
  platforms: string[];
  monthlyRetainer: number;
  since: string;
  leadId?: string;
  deliverables: Deliverable[];
}

export type CampaignStatus = "draft" | "scheduled" | "running" | "completed" | "paused";

export interface Campaign {
  id: string;
  clientId: string;
  name: string;
  status: CampaignStatus;
  channel: string; // "Instagram", "Meta Ads", "Google Ads"
  startAt: string;
  endAt?: string;
  reach: number;
  engagement: number; // %
  spend: number;
  leads: number;
}

export type ContentStatus =
  | "idea"
  | "draft"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "published";

export interface ContentPost {
  id: string;
  clientId: string;
  title: string;
  channel: string;
  scheduledAt: string;
  status: ContentStatus;
  ownerId: string;
}

// ═══════════════════════════════════════════════════════════════
// Cross-cutting — tickets, notifications, announcements, settings
// ═══════════════════════════════════════════════════════════════

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export interface TicketComment {
  by: string;
  at: string;
  text: string;
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  raisedById: string;
  assigneeId?: string;
  departmentId?: string;
  category: string; // "IT", "HR", "Facilities", "Client"
  priority: TaskPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  comments: TicketComment[];
}

export type NotificationKind =
  | "leave"
  | "task"
  | "quotation"
  | "approval"
  | "invoice"
  | "announcement"
  | "ticket"
  | "audit_report"
  | "meeting"
  | "system";

export interface AppNotification {
  id: string;
  userId: string; // recipient
  kind: NotificationKind;
  title: string;
  body?: string;
  at: string;
  read: boolean;
  href?: string;
}

// ── Meetings — a BDA schedules a client meeting and loops in a manager/admin.
// Insights (upfront context) and minutes (record) are timestamped notes. ──
export type MeetingStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type MeetingMode = "in_person" | "video" | "phone";

export interface MeetingNote {
  id: string;
  authorId: string;
  at: string;
  text: string;
}

export interface Meeting {
  id: string;
  title: string;
  organizerId: string; // the BDA who scheduled it
  attendeeIds: string[]; // internal invitees — manager(s)/admin, teammates
  leadId?: string; // the client this meeting is about
  clientContact?: string; // free-text client-side attendee(s) if no lead
  scheduledAt: string; // ISO start time
  durationMin: number;
  mode: MeetingMode;
  location?: string; // address, meeting room, or video link
  agenda?: string; // one-liner: what the meeting is about
  status: MeetingStatus;
  insights: MeetingNote[]; // upfront context added before it starts
  minutes: MeetingNote[]; // minutes of the meeting
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  authorId: string;
  at: string;
  audience: "all" | string; // "all" or a departmentId
  pinned?: boolean;
}

export interface CompanySettings {
  legalName: string;
  brandName: string;
  tagline: string; // "For Innovators, By Creators"
  regId: string; // UDYAM / registration id shown on documents
  gstin: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  email: string;
  phone: string;
  website: string;
  bankName: string;
  accountHolder: string;
  accountNo: string;
  accountType: string; // Savings / Current
  ifsc: string;
  logoText: string;
  logoDataUrl?: string; // uploaded logo (data: URL) — replaces logoText on documents
  signatureName: string;
  signatureRole: string;
  signatureDataUrl?: string; // uploaded signature image (data: URL)
  invoicePrefix: string;
  quotePrefix: string;
  receiptPrefix: string;
  financialYear: string;
  // document terms shown on the respective templates
  quotationTerms: string;
  invoiceTerms: string;
  auditTagline: string; // sub-headline used on the audit report cover
}

// Discount thresholds that decide who must approve a quotation.
export interface ApprovalRules {
  discountBdaMaxPct: number; // <= this → no approval needed
  discountManagerMaxPct: number; // <= this → manager approves; above → admin
}

// ═══════════════════════════════════════════════════════════════
// QIMS — per-lead audit report pipeline
// ═══════════════════════════════════════════════════════════════

export type AuditReportStatus =
  | "need_to_create"
  | "draft"
  | "pending_verification"
  | "sent"
  | "opened"
  | "accepted"
  | "rejected";

export interface AuditReportItem {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  recommendation?: string;
}

// Rich, template-driven audit content — every block is optional so a BDA can skip
// any section and it is simply omitted from the generated document.
export interface AuditArea {
  key: string;
  name: string;
  score: number; // 0-100
  status: string; // "Good" | "Needs Work" | "Strong" | "Average"
  priority?: "High" | "Medium" | "Low";
  summary?: string; // short blurb for the findings-overview grid
  working?: string[];
  issues?: string[];
  recommendations?: string[];
}
export interface RoadmapPhase {
  title: string; // "Foundation"
  range: string; // "0–30 Days"
  items: string[];
}
export interface ImpactMetric {
  value: string; // "+150%"
  label: string; // "Increase in Local Search Visibility"
}

export interface AuditReport {
  id: string;
  leadId: string;
  company: string;
  status: AuditReportStatus;
  ownerId: string;
  createdAt: string;
  sentAt?: string;
  decidedAt?: string;
  verifiedById?: string;
  score: number; // 0-100 digital-health (overall)
  summary: string;
  opener?: string;
  items: AuditReportItem[];
  // ── rich template content (optional) ──
  overallScore?: number;
  takeaway?: string;
  areas?: AuditArea[];
  roadmap?: RoadmapPhase[];
  impact?: ImpactMetric[];
  overallOpportunity?: string;
}

// ═══════════════════════════════════════════════════════════════
// Payments & milestones
// ═══════════════════════════════════════════════════════════════
export type PaymentMode = "cash" | "upi" | "cheque" | "netbanking" | "card" | "bank_transfer";

export interface Milestone {
  id: string;
  leadId: string;
  invoiceId?: string;
  label: string; // "Project kickoff", "Delivery"
  amount: number;
  status: "pending" | "paid";
  dueAt?: string;
  paidAt?: string;
}

export interface PaymentRecord {
  id: string;
  receiptNumber: string;
  leadId?: string;
  invoiceId?: string;
  milestoneId?: string;
  company: string;
  contactName?: string;
  amount: number;
  mode: PaymentMode;
  reference?: string; // cheque no. / UPI txn id
  at: string;
  note?: string;
  recordedById: string;
}

// ═══════════════════════════════════════════════════════════════
// Forms — a Google-Forms-style builder that turns responses into leads
// ═══════════════════════════════════════════════════════════════
export type FormFieldType = "short_text" | "long_text" | "email" | "phone" | "number" | "select" | "checkbox";

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[]; // for select / checkbox
  // maps this field's answer onto a Lead property when a response is converted
  mapTo?: "company" | "contactName" | "email" | "phone" | "city" | "industry" | "interest" | "note" | "none";
}

export interface FormDef {
  id: string;
  token: string; // public share token → /f/[token]
  title: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  published: boolean;
  fields: FormField[];
  autoCreateLead: boolean; // create a lead automatically on each submission
  responseCount: number;
}

export interface FormResponse {
  id: string;
  formId: string;
  at: string;
  answers: Record<string, string>; // fieldId → answer
  convertedLeadId?: string;
}

// ═══════════════════════════════════════════════════════════════
// Design Studio — a Canva-style block editor for documents
// ═══════════════════════════════════════════════════════════════
export type DesignElType = "text" | "image" | "shape";
export type DocType = "quotation" | "invoice" | "receipt" | "audit";

export interface DesignEl {
  id: string;
  type: DesignElType;
  x: number; y: number; w: number; h: number; // px, in the page's coordinate space
  z?: number;
  // text
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right";
  color?: string;
  lineHeight?: number;
  // fill / background (text box or shape)
  bg?: string;
  radius?: number;
  // image
  src?: string; // data URL
}

export interface DesignPage {
  id: string;
  bg: string;
  els: DesignEl[];
}

export interface Design {
  width: number;  // page width in px (A4 @96dpi = 794)
  height: number; // A4 @96dpi = 1123
  pages: DesignPage[];
}
