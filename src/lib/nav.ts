import {
  Blocks,
  Building2,
  FileText,
  Hash,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Sections up to this stage are built; later ones show a placeholder. */
export const CURRENT_STAGE = 2;

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Stage the section ships in. */
  stage: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// Order follows Phase 0 of docs/ARCHITECTURE.md: structure → people → modules → configuration → audit.
export const NAV: NavGroup[] = [
  {
    label: "Hospital",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard, stage: 1 },
      { label: "Branches & service points", href: "/admin/branches", icon: Building2, stage: 1 },
    ],
  },
  {
    label: "People & access",
    items: [
      { label: "Users", href: "/admin/users", icon: Users, stage: 2 },
      { label: "Roles & permissions", href: "/admin/roles", icon: ShieldCheck, stage: 2 },
    ],
  },
  {
    label: "Configuration",
    items: [
      { label: "Modules", href: "/admin/modules", icon: Blocks, stage: 3 },
      { label: "Patient numbering", href: "/admin/numbering", icon: Hash, stage: 3 },
      { label: "Registration forms", href: "/admin/forms", icon: FileText, stage: 4 },
      { label: "Settings", href: "/admin/settings", icon: Settings, stage: 4 },
    ],
  },
  {
    label: "Oversight",
    items: [{ label: "Audit log", href: "/admin/audit", icon: ScrollText, stage: 5 }],
  },
];

export const ALL_NAV_ITEMS = NAV.flatMap((g) => g.items);
