import {
  Blocks,
  Building2,
  FileText,
  Hash,
  LayoutDashboard,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Other paths that belong under this item, e.g. a record opened from a list. */
  also?: string[];
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
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Branches & service points", href: "/admin/branches", icon: Building2 },
    ],
  },
  {
    label: "People & access",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Roles & permissions", href: "/admin/roles", icon: ShieldCheck },
    ],
  },
  {
    label: "Configuration",
    items: [
      { label: "Modules", href: "/admin/modules", icon: Blocks },
      { label: "Patient numbering", href: "/admin/numbering", icon: Hash },
      { label: "Registration forms", href: "/admin/forms", icon: FileText },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
  {
    label: "Oversight",
    items: [{ label: "Audit log", href: "/admin/audit", icon: ScrollText }],
  },
];

export const ALL_NAV_ITEMS = NAV.flatMap((g) => g.items);

// The records clerk's front desk (docs/ARCHITECTURE.md §5): find a patient first, register only if they're new.
export const DESK_NAV: NavGroup[] = [
  {
    label: "Medical Records",
    items: [
      { label: "Find a patient", href: "/desk", icon: Search, also: ["/desk/patients"] },
      { label: "Register a patient", href: "/desk/register", icon: UserPlus },
    ],
  },
];
