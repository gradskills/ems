import type { Project, GitCommit } from "@/lib/types";
import { daysAgo, hoursAgo } from "@/lib/seed/dates";
import { seededInt } from "@/lib/clock";

// deterministic mini git-log for a project
function commits(seed: string, authors: string[], n: number): GitCommit[] {
  const msgs = [
    "feat: initial project scaffold + CI",
    "feat: auth flow with OTP login",
    "fix: mobile nav overlap on iOS Safari",
    "feat: product catalogue grid + filters",
    "chore: bump deps, enable strict TS",
    "feat: Razorpay checkout integration",
    "fix: cart total rounding on GST",
    "refactor: extract shared UI kit",
    "feat: admin order dashboard",
    "perf: lazy-load hero video",
    "fix: SEO meta tags + sitemap",
    "feat: contact form → email webhook",
    "test: add e2e for checkout",
    "feat: blog CMS integration",
  ];
  const branches = ["main", "main", "main", "feat/checkout", "fix/mobile"];
  const out: GitCommit[] = [];
  for (let i = 0; i < n; i++) {
    const at = hoursAgo(i * 9 + seededInt(`${seed}-t-${i}`, 0, 6));
    out.push({
      sha: seededInt(`${seed}-sha-${i}`, 0x100000, 0xffffff).toString(16).padStart(7, "0"),
      message: msgs[seededInt(`${seed}-m-${i}`, 0, msgs.length)],
      authorName: authors[seededInt(`${seed}-a-${i}`, 0, authors.length)],
      at,
      branch: branches[seededInt(`${seed}-b-${i}`, 0, branches.length)],
      additions: seededInt(`${seed}-add-${i}`, 8, 340),
      deletions: seededInt(`${seed}-del-${i}`, 0, 120),
    });
  }
  return out;
}

export const projects: Project[] = [
  {
    id: "PRJ-1",
    name: "Sharma Sweets — E-commerce Store",
    description:
      "Online mithai store with catalogue, cart, Razorpay checkout, GST invoicing and an admin order dashboard. Migrating them off a static Wix page.",
    link: "https://staging.sharmasweets.in",
    repoUrl: "github.com/pixelforge/sharma-sweets",
    status: "active",
    priority: "high",
    departmentId: "dept-tech",
    clientCompany: "Sharma Sweets",
    clientContact: "Rajesh Sharma",
    clientEmail: "rajesh@sharmasweets.in",
    memberIds: ["u-aditya", "u-neha"],
    managerId: "u-vikram",
    startedAt: daysAgo(38),
    dueAt: daysAgo(-16),
    progress: 62,
    techStack: ["Next.js", "TypeScript", "Tailwind", "Razorpay", "Postgres"],
    commits: commits("prj1", ["Aditya Verma", "Neha Gupta"], 12),
  },
  {
    id: "PRJ-2",
    name: "Kadam Interiors — Portfolio Website",
    description:
      "5-page responsive portfolio with a project gallery, enquiry form and on-page SEO. CMS so their team can add projects.",
    link: "https://kadaminteriors.com",
    repoUrl: "github.com/pixelforge/kadam-interiors",
    status: "completed",
    priority: "medium",
    departmentId: "dept-tech",
    clientCompany: "Kadam Interiors",
    clientContact: "Sujata Kadam",
    clientEmail: "sujata@kadaminteriors.com",
    memberIds: ["u-neha"],
    managerId: "u-vikram",
    startedAt: daysAgo(70),
    dueAt: daysAgo(20),
    progress: 100,
    techStack: ["Next.js", "Sanity CMS", "Tailwind"],
    commits: commits("prj2", ["Neha Gupta"], 8),
  },
  {
    id: "PRJ-3",
    name: "Green Leaf Ayurveda — Landing + Booking",
    description:
      "High-converting landing page with an appointment-booking widget and WhatsApp lead capture for a wellness clinic.",
    link: "https://staging.greenleafayurveda.in",
    repoUrl: "github.com/pixelforge/greenleaf",
    status: "active",
    priority: "urgent",
    departmentId: "dept-tech",
    clientCompany: "Green Leaf Ayurveda",
    clientContact: "Dr. Menon",
    clientEmail: "care@greenleafayurveda.in",
    memberIds: ["u-aditya", "u-karan"],
    managerId: "u-vikram",
    startedAt: daysAgo(18),
    dueAt: daysAgo(-6),
    progress: 34,
    techStack: ["Next.js", "Calendly API", "Tailwind"],
    commits: commits("prj3", ["Aditya Verma", "Karan Singh"], 7),
  },
  {
    id: "PRJ-4",
    name: "Internal — PixelForge Sales OS",
    description:
      "This very platform: EMS + QIMS. Tracked internally so the tech team can log time against product work.",
    link: "https://sales-os.pixelforge.in",
    repoUrl: "github.com/pixelforge/sales-os",
    status: "active",
    priority: "medium",
    departmentId: "dept-tech",
    clientCompany: "PixelForge (Internal)",
    memberIds: ["u-aditya", "u-neha", "u-karan"],
    managerId: "u-vikram",
    startedAt: daysAgo(55),
    progress: 48,
    techStack: ["Next.js 16", "React 19", "Zustand", "Tailwind v4"],
    commits: commits("prj4", ["Aditya Verma", "Neha Gupta", "Karan Singh"], 14),
  },
];

export function projectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}
export function projectsForMember(userId: string): Project[] {
  return projects.filter((p) => p.memberIds.includes(userId) || p.managerId === userId);
}
