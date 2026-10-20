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

export interface Tenant {
  name: string;
  plan: string;
  branchLimit: number;
  userLimit: number;
  entitledModules: string[];
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  at: string;
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
