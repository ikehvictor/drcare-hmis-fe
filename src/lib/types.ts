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
  "Staff",
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
  type:
    | "branch"
    | "user"
    | "role"
    | "module"
    | "form"
    | "category"
    | "numbering"
    | "settings"
    | "patient"
    | "staff-category";
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

export type UserStatus = "active" | "suspended";

/** A kind of staff, e.g. Doctor or Nurse, with its specialties. Hospitals make their own. */
export interface StaffCategory {
  id: string;
  name: string;
  /** Optional, e.g. Cardiology or Paediatrics for doctors. */
  specialties: string[];
  /** Roles suggested when creating an account in this category. */
  defaultRoleIds: string[];
}

/**
 * A function the hospital names itself, e.g. "Approve the nurses' duty roster". It can be put in roles and given to
 * people like any other, but no module checks it yet, so it records responsibility rather than enforcing it.
 */
export interface CustomFunction {
  key: string;
  label: string;
  description: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  staffCategoryId?: string;
  specialty?: string;
  roleIds: string[];
  /** Functions given to this person on top of their roles. */
  extraPermissions: string[];
  /** Functions their roles give that this person may not use. */
  removedPermissions: string[];
  /** "all" or a list of branch ids the user may work in. */
  branchScope: "all" | string[];
  status: UserStatus;
  /** The admin set their password; they must choose their own when they first sign in. */
  mustChangePassword: boolean;
  passwordSetAt?: string;
  lastActiveAt?: string;
  createdAt: string;
}
