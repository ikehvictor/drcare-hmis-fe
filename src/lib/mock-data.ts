import { CORE_FIELDS, STANDARD_FIELDS, type FormField, type PatientCategory, type RegistrationForm } from "./forms";
import { defaultSettings, MODULES } from "./modules";
import type { NumberingConfig } from "./numbering";
import { ALL_PERMISSION_KEYS } from "./permissions";
import type { HospitalSettings } from "./settings";
import type { ActivityItem, Branch, ModuleState, Role, Tenant, User } from "./types";

export const seedTenant: Tenant = {
  name: "Lakeside Specialist Hospital",
  plan: "Growth",
  branchLimit: 3,
  userLimit: 40,
  entitledModules: ["core", "medical-records", "cash-point"],
};

export const seedBranches: Branch[] = [
  {
    id: "br_main",
    name: "Main Campus",
    code: "LKS",
    address: "14 Adeola Odeku Street",
    city: "Victoria Island",
    state: "Lagos",
    phone: "+234 801 234 5678",
    isMain: true,
    active: true,
    createdAt: "2026-09-02T09:00:00.000Z",
    servicePoints: [
      { id: "sp_1", name: "Front Desk", type: "Reception", location: "Ground floor, lobby", active: true },
      { id: "sp_2", name: "Medical Records", type: "Records", location: "Ground floor, room 3", active: true },
      { id: "sp_3", name: "Main Cashier", type: "Cashier", location: "Ground floor, room 4", active: true },
      { id: "sp_4", name: "Triage Bay", type: "Triage", location: "First floor", active: true },
      { id: "sp_5", name: "OPD Room 1", type: "Consultation", location: "First floor, room 11", active: true },
      { id: "sp_6", name: "OPD Room 2", type: "Consultation", location: "First floor, room 12", active: false },
    ],
  },
  {
    id: "br_annex",
    name: "Lekki Annex Clinic",
    code: "LKA",
    address: "3 Admiralty Way",
    city: "Lekki Phase 1",
    state: "Lagos",
    phone: "+234 809 876 5432",
    isMain: false,
    active: true,
    createdAt: "2026-09-20T09:00:00.000Z",
    servicePoints: [
      { id: "sp_7", name: "Records & Reception", type: "Records", location: "Ground floor", active: true },
      { id: "sp_8", name: "Annex Cashier", type: "Cashier", location: "Ground floor", active: true },
      { id: "sp_9", name: "Consulting Room A", type: "Consultation", location: "Ground floor", active: true },
    ],
  },
];

export const seedActivity: ActivityItem[] = [
  {
    id: "act_3",
    actor: "Ada Okafor",
    action: "added service point Consulting Room A to Lekki Annex Clinic",
    at: "2026-10-17T14:12:00.000Z",
  },
  {
    id: "act_2",
    actor: "Ada Okafor",
    action: "created branch Lekki Annex Clinic (LKA)",
    at: "2026-09-20T09:00:00.000Z",
  },
  {
    id: "act_1",
    actor: "Dr. Care Platform",
    action: "onboarded Lakeside Specialist Hospital on the Growth plan",
    at: "2026-09-02T09:00:00.000Z",
  },
];

const T0 = "2026-09-02T09:00:00.000Z";

// Default roles a hospital starts with. All but the Super Admin are ordinary roles they can edit or delete.
export const seedRoles: Role[] = [
  {
    id: "role_super",
    name: "Hospital Super Admin",
    description: "Full control of the hospital. Can't be edited, so the hospital can never lock itself out.",
    permissions: ALL_PERMISSION_KEYS,
    locked: true,
    createdAt: T0,
  },
  {
    id: "role_records",
    name: "Records Officer",
    description: "Registers patients at the front desk and keeps their records up to date.",
    permissions: ["patients.view", "patients.register", "patients.edit", "patients.print"],
    createdAt: T0,
  },
  {
    id: "role_cashier",
    name: "Cashier",
    description: "Takes payments at the cash point during a till shift.",
    permissions: ["patients.view", "billing.view", "billing.charge", "payment.receive", "till.manage"],
    createdAt: T0,
  },
  {
    id: "role_head_cashier",
    name: "Head Cashier",
    description: "Supervises cashiers; can refund, void and see daily collections.",
    permissions: [
      "patients.view",
      "billing.view",
      "billing.charge",
      "payment.receive",
      "payment.refund",
      "payment.void",
      "till.manage",
      "reports.collections",
    ],
    createdAt: T0,
  },
  {
    id: "role_accountant",
    name: "Accountant",
    description: "Reviews money in and out; approves discounts and waivers.",
    permissions: ["billing.view", "billing.discount", "reports.collections", "admin.audit.view"],
    createdAt: T0,
  },
];

export const CURRENT_USER_ID = "usr_ada";

export const seedUsers: User[] = [
  {
    id: CURRENT_USER_ID,
    name: "Ada Okafor",
    email: "ada.okafor@lakeside.example",
    phone: "+234 802 111 2233",
    jobTitle: "Hospital Administrator",
    roleIds: ["role_super"],
    branchScope: "all",
    status: "active",
    lastActiveAt: "2026-10-20T08:30:00.000Z",
    createdAt: T0,
  },
  {
    id: "usr_tunde",
    name: "Tunde Bakare",
    email: "tunde.bakare@lakeside.example",
    phone: "+234 803 444 5566",
    jobTitle: "Senior Records Officer",
    roleIds: ["role_records"],
    branchScope: ["br_main"],
    status: "active",
    lastActiveAt: "2026-10-19T16:05:00.000Z",
    createdAt: "2026-09-05T10:00:00.000Z",
  },
  {
    id: "usr_ngozi",
    name: "Ngozi Eze",
    email: "ngozi.eze@lakeside.example",
    phone: "+234 805 777 8899",
    jobTitle: "Head Cashier",
    roleIds: ["role_head_cashier"],
    branchScope: "all",
    status: "active",
    lastActiveAt: "2026-10-20T07:50:00.000Z",
    createdAt: "2026-09-05T10:30:00.000Z",
  },
  {
    id: "usr_musa",
    name: "Musa Ibrahim",
    email: "musa.ibrahim@lakeside.example",
    phone: "+234 806 222 3344",
    jobTitle: "Front Desk Officer",
    roleIds: ["role_records", "role_cashier"],
    branchScope: ["br_annex"],
    status: "invited",
    createdAt: "2026-10-18T12:00:00.000Z",
  },
];

// A newly onboarded hospital: entitled modules start switched off with default options.
export const seedModules: Record<string, ModuleState> = Object.fromEntries(
  MODULES.filter((m) => seedTenant.entitledModules.includes(m.id)).map((m) => [
    m.id,
    { enabled: !!m.core, settings: defaultSettings(m) },
  ]),
);

export const seedNumbering: NumberingConfig = {
  template: "{PREFIX}/{SEQ:6}",
  prefix: "LKS",
  scope: "hospital",
  reset: "never",
  startAt: 1,
  keepLegacyNumber: false,
  configured: false,
};

const field = (seed: Omit<FormField, "id" | "kind">, kind: FormField["kind"], i: string): FormField => ({
  ...seed,
  id: `fld_${i}_${seed.key}`,
  kind,
});
const core = (form: string) => CORE_FIELDS.map((f) => field(f, "core", form));
const std = (form: string, ...keys: string[]) =>
  keys.map((k) => field(STANDARD_FIELDS.find((f) => f.key === k)!, "standard", form));

export const seedForms: RegistrationForm[] = [
  {
    id: "form_general",
    name: "General registration",
    description: "Adults walking in or referred.",
    updatedAt: T0,
    sections: [
      {
        id: "sec_g1",
        title: "Patient details",
        fields: [...core("g"), ...std("g", "email", "maritalStatus", "occupation")],
      },
      { id: "sec_g2", title: "Contact & address", fields: std("g", "address", "stateOfOrigin") },
      { id: "sec_g3", title: "Next of kin", fields: std("g", "nokName", "nokRelationship", "nokPhone") },
    ],
  },
  {
    id: "form_child",
    name: "Child registration",
    description: "Under 16s, registered by a parent or guardian.",
    updatedAt: T0,
    sections: [
      { id: "sec_c1", title: "Child", fields: [...core("c"), ...std("c", "genotype", "allergies")] },
      {
        id: "sec_c2",
        title: "Parent or guardian",
        fields: std("c", "guardianName", "guardianPhone").map((f) => ({ ...f, required: true })),
      },
    ],
  },
  {
    id: "form_anc",
    name: "Antenatal registration",
    description: "Booking visit for antenatal care.",
    updatedAt: T0,
    sections: [
      {
        id: "sec_a1",
        title: "Patient details",
        fields: [...core("a"), ...std("a", "maritalStatus", "bloodGroup", "genotype")],
      },
      {
        id: "sec_a2",
        title: "Pregnancy",
        fields: std("a", "lmp", "gravida").map((f) => ({ ...f, required: f.key === "lmp" })),
      },
      { id: "sec_a3", title: "Next of kin", fields: std("a", "nokName", "nokPhone") },
    ],
  },
];

export const seedCategories: PatientCategory[] = [
  { id: "cat_gen", code: "GEN", name: "General", formId: "form_general", active: true },
  { id: "cat_chd", code: "CHD", name: "Child", formId: "form_child", active: true },
  { id: "cat_anc", code: "ANC", name: "Antenatal", formId: "form_anc", active: true },
  { id: "cat_cor", code: "COR", name: "Corporate staff", formId: "form_general", active: true },
];

export const seedSettings: HospitalSettings = {
  profile: {
    displayName: seedTenant.name,
    shortName: "Lakeside",
    email: "info@lakeside.example",
    phone: "+234 801 234 5678",
    address: "14 Adeola Odeku Street, Victoria Island, Lagos",
    country: "Nigeria",
    currency: "NGN (₦)",
    timezone: "Africa/Lagos (WAT)",
    dateFormat: "DD/MM/YYYY",
  },
  security: { sessionTimeoutMinutes: 15, pinSwitch: true, twoFactor: "admins", passwordMinLength: 10 },
  approvals: {
    "admin.users.manage": { required: false, approverRoleId: "role_super" },
    "admin.roles.manage": { required: false, approverRoleId: "role_super" },
    "patients.merge": { required: true, approverRoleId: "role_super" },
    "patients.deactivate": { required: false, approverRoleId: "role_super" },
    "payment.refund": { required: true, approverRoleId: "role_head_cashier" },
    "payment.void": { required: true, approverRoleId: "role_head_cashier" },
    "billing.discount": { required: true, approverRoleId: "role_super" },
  },
  branchOverrides: { br_annex: { sessionTimeoutMinutes: 30 } },
};
