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
