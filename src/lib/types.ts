export type ServicePointType =
  | "Reception"
  | "Records"
  | "Cashier"
  | "Triage"
  | "Consultation"
  | "Laboratory"
  | "Pharmacy"
  | "Radiology";

export const SERVICE_POINT_TYPES: ServicePointType[] = [
  "Reception",
  "Records",
  "Cashier",
  "Triage",
  "Consultation",
  "Laboratory",
  "Pharmacy",
  "Radiology",
];

export interface ServicePoint {
  id: string;
  name: string;
  type: ServicePointType;
  location: string;
  active: boolean;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  isMain: boolean;
  active: boolean;
  servicePoints: ServicePoint[];
  createdAt: string;
}

export interface ModuleState {
  enabled: boolean;
  settings: Record<string, boolean | number | string[]>;
}

export interface Tenant {
  name: string;
  plan: string;
  branchLimit: number;
  userLimit: number;
  entitledModules: string[];
}

export const AUDIT_CATEGORIES = [
  "Branches",
  "Users",
  "Roles",
  "Modules",
  "Numbering",
  "Forms",
  "Settings",
  "Patients",
  "Sign-in",
  "Support",
  "Audit",
] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export interface AuditChange {
  field: string;
  before: string;
  after: string;
}

export interface AuditTarget {
  type: "branch" | "user" | "role" | "module" | "form" | "category" | "numbering" | "settings" | "patient";
  id: string;
  name: string;
}

/**
 * One line of the audit log (docs/ARCHITECTURE.md §7): who, what, when, where, and the values before and after.
 * Entries are only ever added, never edited or removed.
 */
export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  actorRole: string;
  /** What happened, written to follow the actor's name, e.g. "deactivated branch Lekki Annex Clinic". */
  action: string;
  category: AuditCategory;
  target?: AuditTarget;
  changes?: AuditChange[];
  /** The branch it happened at, or "Hospital-wide". */
  where: string;
  /** How it was done, e.g. "Web admin" or "Front desk PC 2". */
  via: string;
  /** Touches money, access or patient identity. */
  sensitive?: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  /** The Hospital Super Admin role can't be edited or deleted, so a hospital can never lock itself out. */
  locked?: boolean;
  createdAt: string;
}

export type UserStatus = "invited" | "active" | "suspended";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  roleIds: string[];
  /** "all" or a list of branch ids the user may work in. */
  branchScope: "all" | string[];
  status: UserStatus;
  lastActiveAt?: string;
  createdAt: string;
}
