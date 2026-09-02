import type { User, Team, ServicePackage, SalaryStructure, LeaveBalance } from "@/lib/types";

export const teams: Team[] = [
  { id: "team-1", name: "West Sales" },
  { id: "team-2", name: "South Sales" },
];

// monthly salary split into components
function sal(monthly: number): SalaryStructure {
  const basic = Math.round(monthly * 0.5);
  const hra = Math.round(monthly * 0.2);
  return { basic, hra, special: monthly - basic - hra };
}
const bal = (casual: number, sick: number, earned: number): LeaveBalance => ({ casual, sick, earned });

// ─────────────────────────────────────────────────────────────
// The real gradskills team, mirroring the `users` table in Supabase
// (project coasdmsmcfzsamycjdzt). App user ids are the DB integer ids as
// strings ("1".."10"). These act as the synchronous baseline; on app load
// `setUsers()` refreshes this list from the database. Salary figures are
// prototype placeholders (the DB doesn't store payroll).
// ─────────────────────────────────────────────────────────────
export const users: User[] = [
  {
    id: "1", name: "Abhijeet Navandar", email: "navandarabhijeet@gmail.com", employeeId: "EMP-1",
    role: "admin", accessLevel: "admin", departmentId: "dept-admin", designation: "Founder",
    status: "active", employmentType: "full_time", phone: "", loginId: "navandarabhijeet",
    ctcAnnual: 0, salary: sal(0), leaveBalance: bal(12, 8, 0),
  },
  {
    id: "2", name: "Vishwas Gupta", email: "kakkirenivishwas@gmail.com", employeeId: "EMP-2",
    role: "admin", accessLevel: "admin", departmentId: "dept-admin", designation: "Founder",
    status: "active", employmentType: "full_time", phone: "", loginId: "kakkirenivishwas",
    ctcAnnual: 0, salary: sal(0), leaveBalance: bal(12, 8, 0),
  },
  {
    id: "3", name: "Hemanth Kuncham", email: "hemanthkuncham8055@gmail.com", employeeId: "EMP-3",
    role: "bda", accessLevel: "employee", departmentId: "dept-tech", designation: "Software Product Builder Intern",
    managerId: "1", status: "active", employmentType: "intern", joinedAt: "2026-06-05", phone: "",
    loginId: "hemanthkuncham8055", leaveBalance: bal(12, 8, 0),
  },
  {
    id: "4", name: "Yalaga Joshitha", email: "yalagajoshitha@gmail.com", employeeId: "EMP-4",
    role: "bda", accessLevel: "employee", departmentId: "dept-tech", designation: "Software Product Builder Intern",
    managerId: "1", status: "active", employmentType: "intern", joinedAt: "2026-06-05", phone: "",
    loginId: "yalagajoshitha", leaveBalance: bal(12, 8, 0),
  },
  {
    id: "5", name: "Mois Khan", email: "moiskhanmd9090@gmail.com", employeeId: "EMP-5",
    role: "bda", accessLevel: "employee", departmentId: "dept-tech", designation: "Software Product Builder Intern",
    managerId: "1", status: "active", employmentType: "intern", joinedAt: "2026-06-05", phone: "",
    loginId: "moiskhanmd9090", leaveBalance: bal(12, 8, 0),
  },
  {
    id: "6", name: "Vinay G", email: "vinayg1752004@gmail.com", employeeId: "EMP-6",
    role: "bda", accessLevel: "employee", departmentId: "dept-tech", designation: "Software Product Builder Intern",
    managerId: "1", status: "active", employmentType: "intern", joinedAt: "2026-06-05", phone: "",
    loginId: "vinayg1752004", leaveBalance: bal(12, 8, 0),
  },
  {
    id: "7", name: "Manvith N", email: "nizmanvith@gmail.com", employeeId: "EMP-7",
    role: "bda", accessLevel: "employee", departmentId: "dept-tech", designation: "Software Product Builder Intern",
    managerId: "1", status: "active", employmentType: "intern", joinedAt: "2026-06-05", phone: "",
    loginId: "nizmanvith", leaveBalance: bal(12, 8, 0),
  },
  {
    id: "9", name: "Nidhi Shukla", email: "shuklanidhi1020@gmail.com", employeeId: "EMP-9",
    role: "bda", accessLevel: "employee", departmentId: "dept-bda", designation: "Business Development Intern",
    managerId: "2", status: "active", employmentType: "intern", joinedAt: "2026-06-01", phone: "",
    loginId: "shuklanidhi1020", leaveBalance: bal(12, 8, 0),
  },
  {
    id: "10", name: "Hafsa Mohammed Lateef", email: "hafsalateef2000@gmail.com", employeeId: "EMP-10",
    role: "bda", accessLevel: "employee", departmentId: "dept-bda", designation: "Business Development Associate",
    managerId: "2", status: "active", employmentType: "intern", joinedAt: "2026-07-20", phone: "7396965749",
    loginId: "hafsalateef2000", leaveBalance: bal(12, 8, 0),
  },
];

// Default acting user before login (a founder/admin); real session comes from login.
export const CURRENT_BDA_ID = "7";  // Manvith
export const CURRENT_ADMIN_ID = "1"; // Abhijeet

/**
 * Replace the in-memory user registry with the live list from the database.
 * Mutates the exported `users` array in place so live ES-module bindings and
 * all `userById()` call sites immediately see the fresh data.
 */
export function setUsers(fresh: User[]): void {
  if (!fresh.length) return;
  users.splice(0, users.length, ...fresh);
}

export function userById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

export function userName(id: string): string {
  return userById(id)?.name ?? "Unknown";
}

export function usersByDept(departmentId: string): User[] {
  return users.filter((u) => u.departmentId === departmentId);
}

/** direct + indirect reports of a manager (their subtree) */
export function reportsOf(managerId: string): User[] {
  const direct = users.filter((u) => u.managerId === managerId);
  return direct.flatMap((u) => [u, ...reportsOf(u.id)]);
}

// ── Service catalogue — what a digital agency actually sells ──
export const servicePackages: ServicePackage[] = [
  {
    id: "pkg-smm-starter",
    category: "social_media",
    name: "Social — Starter",
    tagline: "Consistent presence for a single platform",
    sacCode: "998361",
    gstRate: 18,
    billingType: "retainer",
    price: 15000,
    deliverables: ["12 feed posts / month", "1 platform (Instagram)", "Basic captions & hashtags", "Monthly report"],
    timelineDays: 30,
    revisions: 1,
  },
  {
    id: "pkg-smm-growth",
    category: "social_media",
    name: "Social — Growth",
    tagline: "Multi-platform content with reels",
    sacCode: "998361",
    gstRate: 18,
    billingType: "retainer",
    price: 30000,
    deliverables: ["16 feed posts / month", "8 reels / month", "2 platforms", "Story designs", "Bi-weekly report"],
    timelineDays: 30,
    revisions: 2,
  },
  {
    id: "pkg-smm-pro",
    category: "social_media",
    name: "Social — Pro",
    tagline: "Full-service social with ads management",
    sacCode: "998361",
    gstRate: 18,
    billingType: "retainer",
    price: 55000,
    deliverables: ["24 posts / month", "12 reels / month", "3 platforms", "Ad campaign management", "Influencer coordination", "Weekly report"],
    timelineDays: 30,
    revisions: 3,
  },
  {
    id: "pkg-web-landing",
    category: "website",
    name: "Website — Landing Page",
    tagline: "High-converting single page",
    sacCode: "998314",
    gstRate: 18,
    billingType: "one_time",
    price: 25000,
    deliverables: ["1 responsive landing page", "Contact form", "Basic SEO", "1 year hosting"],
    timelineDays: 10,
    revisions: 2,
  },
  {
    id: "pkg-web-5page",
    category: "website",
    name: "Website — 5 Page",
    tagline: "Complete business website",
    sacCode: "998314",
    gstRate: 18,
    billingType: "one_time",
    price: 55000,
    deliverables: ["5 responsive pages", "CMS setup", "Contact + enquiry forms", "On-page SEO", "1 year hosting + SSL"],
    timelineDays: 21,
    revisions: 3,
  },
  {
    id: "pkg-web-ecom",
    category: "website",
    name: "Website — E-commerce",
    tagline: "Online store with payments",
    sacCode: "998314",
    gstRate: 18,
    billingType: "one_time",
    price: 120000,
    deliverables: ["Product catalogue", "Payment gateway", "Order management", "Up to 100 products", "SEO + analytics"],
    timelineDays: 45,
    revisions: 3,
  },
  {
    id: "pkg-out-setup",
    category: "outreach",
    name: "Outreach — Lead Gen",
    tagline: "Cold outreach & appointment setting",
    sacCode: "998599",
    gstRate: 18,
    billingType: "retainer",
    price: 40000,
    deliverables: ["Prospect list building", "Email + LinkedIn sequences", "40 qualified leads / month", "Weekly pipeline report"],
    timelineDays: 30,
    revisions: 0,
  },
  {
    id: "pkg-web-amc",
    category: "website",
    name: "Website — Maintenance (AMC)",
    tagline: "Ongoing updates & support",
    sacCode: "998314",
    gstRate: 18,
    billingType: "retainer",
    price: 8000,
    deliverables: ["Monthly updates", "Security patches", "Uptime monitoring", "2 hrs content changes"],
    timelineDays: 30,
    revisions: 0,
  },
];

export function packageById(id: string) {
  return servicePackages.find((p) => p.id === id);
}
