import type { ServicePointType } from "./types";

// Module manifests (docs/ARCHITECTURE.md §3). The platform entitles a hospital to modules;
// the hospital admin switches entitled ones on or off and sets their options.
// Once the backend exists, these come from the module registry instead of this file.

export type ModuleSetting =
  | { key: string; type: "boolean"; label: string; help?: string; default: boolean }
  | { key: string; type: "money"; label: string; help?: string; default: number }
  | { key: string; type: "multi"; label: string; help?: string; options: string[]; default: string[] };

export type SettingValue = boolean | number | string[];

export interface ModuleManifest {
  id: string;
  name: string;
  summary: string;
  /** Other modules that must be on for this one to work. */
  dependsOn: string[];
  servicePointTypes: ServicePointType[];
  settings: ModuleSetting[];
  /** Always on and can't be switched off. */
  core?: boolean;
  /** Roadmap phase, shown on modules the hospital isn't entitled to. */
  phase?: string;
}

export const MODULES: ModuleManifest[] = [
  {
    id: "core",
    name: "Core platform",
    summary: "Branches, users, roles, settings and the audit log. Every hospital has it.",
    dependsOn: [],
    servicePointTypes: ["Reception"],
    settings: [],
    core: true,
  },
  {
    id: "medical-records",
    name: "Medical Records",
    summary: "Register patients with your own forms and patient numbers, search them and keep records clean.",
    dependsOn: [],
    servicePointTypes: ["Records"],
    settings: [
      { key: "requirePhone", type: "boolean", label: "Phone number is required", default: true },
      {
        key: "allowEstimatedAge",
        type: "boolean",
        label: "Allow estimated age",
        help: "For patients who don't know their date of birth.",
        default: true,
      },
      { key: "captureNextOfKin", type: "boolean", label: "Capture next of kin", default: true },
      {
        key: "duplicateCheck",
        type: "boolean",
        label: "Check for duplicates before saving",
        help: "Warns when name, date of birth and phone match an existing patient.",
        default: true,
      },
    ],
  },
  {
    id: "cash-point",
    name: "Cash Point",
    summary: "Bills, payments, receipts and cashier shifts, with refunds and discounts that leave an audit trail.",
    dependsOn: ["medical-records"],
    servicePointTypes: ["Cashier"],
    settings: [
      {
        key: "paymentMethods",
        type: "multi",
        label: "Payment methods accepted",
        options: ["Cash", "POS", "Bank transfer", "Deposit"],
        default: ["Cash", "POS", "Bank transfer"],
      },
      { key: "allowPartPayment", type: "boolean", label: "Allow part payments", default: true },
      {
        key: "allowDeposits",
        type: "boolean",
        label: "Allow deposits",
        help: "Patients pay in advance and services draw from their balance.",
        default: false,
      },
      {
        key: "refundApprovalAbove",
        type: "money",
        label: "Refunds need approval above",
        help: "A second person must approve larger refunds. Set 0 to approve every refund.",
        default: 10000,
      },
    ],
  },
  {
    id: "patient-flow",
    name: "Patient Flow & Queues",
    summary: "Design each patient journey, with live queues and pay-before-service gates.",
    dependsOn: ["medical-records"],
    servicePointTypes: ["Triage"],
    settings: [],
    phase: "Phase 3",
  },
  {
    id: "consultation",
    name: "Consultation / EMR",
    summary: "Clinical notes, diagnoses with ICD-10 codes and prescriptions.",
    dependsOn: ["medical-records"],
    servicePointTypes: ["Consultation"],
    settings: [],
    phase: "Later",
  },
  {
    id: "laboratory",
    name: "Laboratory",
    summary: "Test requests, sample tracking and results.",
    dependsOn: ["medical-records", "cash-point"],
    servicePointTypes: ["Laboratory"],
    settings: [],
    phase: "Later",
  },
  {
    id: "pharmacy",
    name: "Pharmacy & Inventory",
    summary: "Dispensing, stock levels and expiry alerts.",
    dependsOn: ["medical-records", "cash-point"],
    servicePointTypes: ["Pharmacy"],
    settings: [],
    phase: "Later",
  },
  {
    id: "radiology",
    name: "Radiology",
    summary: "Imaging requests, scheduling and reports.",
    dependsOn: ["medical-records", "cash-point"],
    servicePointTypes: ["Radiology"],
    settings: [],
    phase: "Later",
  },
  {
    id: "hmo",
    name: "HMO & Insurance Claims",
    summary: "Schemes, enrollee checks, authorisation codes and claims.",
    dependsOn: ["cash-point"],
    servicePointTypes: [],
    settings: [],
    phase: "Later",
  },
];

export const moduleById = (id: string) => MODULES.find((m) => m.id === id);

export const defaultSettings = (m: ModuleManifest): Record<string, SettingValue> =>
  Object.fromEntries(m.settings.map((s) => [s.key, s.default]));

/** Modules that depend on `id`, directly or not, and are currently on. */
export function enabledDependents(id: string, enabled: (id: string) => boolean): ModuleManifest[] {
  const out: ModuleManifest[] = [];
  const visit = (target: string) => {
    for (const m of MODULES) {
      if (m.dependsOn.includes(target) && enabled(m.id) && !out.includes(m)) {
        out.push(m);
        visit(m.id);
      }
    }
  };
  visit(id);
  return out;
}

/** Modules `id` needs that are currently off, directly or not. */
export function missingDependencies(id: string, enabled: (id: string) => boolean): ModuleManifest[] {
  const out: ModuleManifest[] = [];
  const visit = (target: string) => {
    for (const dep of moduleById(target)?.dependsOn ?? []) {
      const m = moduleById(dep);
      if (m && !enabled(dep) && !out.includes(m)) {
        visit(dep);
        out.push(m);
      }
    }
  };
  visit(id);
  return out;
}
