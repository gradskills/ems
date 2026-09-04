import type { Department, CompanySettings, ApprovalRules } from "@/lib/types";

// Roles are fixed categories: admin, bda, tech, media + any custom ones added at runtime.
export const departments: Department[] = [
  {
    id: "dept-admin",
    key: "admin",
    name: "Admin",
    color: "danger",
    icon: "ShieldCheck",
    features: [],
    system: true,
  },
  {
    id: "dept-bda",
    key: "bda",
    name: "BDA",
    color: "primary",
    icon: "Phone",
    features: ["leads", "quotations", "invoices", "prospect_audit", "audit_reports"],
    system: true,
  },
  {
    id: "dept-tech",
    key: "tech",
    name: "Tech",
    color: "info",
    icon: "Code2",
    features: ["projects", "timesheets", "bugs"],
    system: true,
  },
  {
    id: "dept-media",
    key: "media",
    name: "Media",
    color: "purple",
    icon: "Megaphone",
    features: ["clients", "content_calendar", "campaigns"],
    system: true,
  },
];

export function departmentById(id: string): Department | undefined {
  return departments.find((d) => d.id === id);
}
export function departmentByKey(key: string): Department | undefined {
  return departments.find((d) => d.key === key);
}

export const companySettings: CompanySettings = {
  legalName: "Gradskills EMS",
  brandName: "Gradskills",
  tagline: "For Innovators, By Creators",
  regId: "UDYAM-TS-02-0005904",
  gstin: "27ABCDE1234F1Z5",
  pan: "ABCDE1234F",
  address: "402, Sunrise Tech Park, Andheri East",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400069",
  email: "hello@gradskills.in",
  phone: "+91 22 4000 1234",
  website: "",
  bankName: "AXIS BANK",
  accountHolder: "Gradskills",
  accountNo: "5805278555",
  accountType: "Savings",
  ifsc: "UTIB0001628",
  logoText: "Gradskills",
  signatureName: "Abhijeet Navandar",
  signatureRole: "Founder",
  invoicePrefix: "INV/2025-26/",
  quotePrefix: "QT/2025-26/",
  receiptPrefix: "REC/2025-26/",
  financialYear: "2025-26",
  quotationTerms: "Scope changes will be charged additionally.",
  invoiceTerms: "Payment is due by the due date mentioned above. Please make the payment to the bank details provided.",
  auditTagline: "Website · SEO · Branding · Content · Social Media · Marketing",
};

export const approvalRules: ApprovalRules = {
  discountBdaMaxPct: 10, // BDA can self-approve up to 10%
  discountManagerMaxPct: 20, // up to 20% needs a manager; above → admin
};
