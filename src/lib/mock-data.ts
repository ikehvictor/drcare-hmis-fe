import { CORE_FIELDS, STANDARD_FIELDS, type FormField, type PatientCategory, type RegistrationForm } from "./forms";
import { defaultSettings, MODULES } from "./modules";
import type { NumberingConfig } from "./numbering";
import { ALL_PERMISSION_KEYS } from "./permissions";
import type { HospitalSettings } from "./settings";
import type { AuditEntry, Branch, ModuleState, Role, StaffCategory, Tenant, User } from "./types";

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

const ADA = { actor: "Ada Okafor", actorRole: "Hospital Super Admin" };
const TUNDE = { actor: "Tunde Bakare", actorRole: "Records Officer" };
const NGOZI = { actor: "Ngozi Eze", actorRole: "Head Cashier" };
const DRCARE = { actor: "Dr. Care Support", actorRole: "Dr. Care staff" };
const WEB = "Web admin · Chrome on Mac";

// Seven weeks of history for a hospital onboarded on 2 September 2026, newest first.
export const seedAudit: AuditEntry[] = [
  {
    id: "aud_20",
    at: "2026-10-20T08:30:00.000Z",
    ...ADA,
    action: "signed in",
    category: "Sign-in",
    where: "Hospital-wide",
    via: WEB,
  },
  {
    id: "aud_19",
    at: "2026-10-20T07:50:00.000Z",
    ...NGOZI,
    action: "signed in",
    category: "Sign-in",
    where: "Main Campus",
    via: "Cashier PC 1",
  },
  {
    id: "aud_18",
    at: "2026-10-19T16:05:00.000Z",
    ...TUNDE,
    action: "signed in",
    category: "Sign-in",
    where: "Main Campus",
    via: "Front desk PC 1",
  },
  {
    id: "aud_17",
    at: "2026-10-18T12:00:00.000Z",
    ...ADA,
    action: "created an account for Musa Ibrahim (musa.ibrahim@lakeside.example)",
    category: "Users",
    target: { type: "user", id: "usr_musa", name: "Musa Ibrahim" },
    changes: [
      { field: "Roles", before: "—", after: "Records Officer, Cashier" },
      { field: "Branch access", before: "—", after: "Lekki Annex Clinic" },
    ],
    where: "Hospital-wide",
    via: WEB,
    sensitive: true,
  },
  {
    id: "aud_16",
    at: "2026-10-17T14:12:00.000Z",
    ...ADA,
    action: "added service point Consulting Room A to Lekki Annex Clinic",
    category: "Branches",
    target: { type: "branch", id: "br_annex", name: "Lekki Annex Clinic" },
    changes: [
      { field: "Type", before: "—", after: "Consultation" },
      { field: "Location", before: "—", after: "Ground floor" },
    ],
    where: "Lekki Annex Clinic",
    via: WEB,
  },
  {
    id: "aud_15",
    at: "2026-10-09T15:40:00.000Z",
    ...DRCARE,
    action: "ended the support session",
    category: "Support",
    where: "Hospital-wide",
    via: "Dr. Care support (remote)",
  },
  {
    id: "aud_14",
    at: "2026-10-09T15:02:00.000Z",
    ...DRCARE,
    action: "started a support session approved by Ada Okafor, for up to 2 hours",
    category: "Support",
    changes: [{ field: "Reason", before: "—", after: "Help setting up the Lekki Annex price list" }],
    where: "Hospital-wide",
    via: "Dr. Care support (remote)",
    sensitive: true,
  },
  {
    id: "aud_13",
    at: "2026-10-03T08:15:00.000Z",
    ...NGOZI,
    action: "signed in",
    category: "Sign-in",
    where: "Lekki Annex Clinic",
    via: "Front desk PC 2",
  },
  {
    id: "aud_12",
    at: "2026-10-02T23:41:00.000Z",
    actor: "Someone",
    actorRole: "Not signed in",
    action: "failed to sign in as ngozi.eze@lakeside.example 3 times; the account was locked for 15 minutes",
    category: "Sign-in",
    where: "Lekki Annex Clinic",
    via: "Front desk PC 2",
    sensitive: true,
  },
  {
    id: "aud_11",
    at: "2026-09-20T09:40:00.000Z",
    ...ADA,
    action: "changed settings: branch overrides",
    category: "Settings",
    target: { type: "settings", id: "settings", name: "Settings" },
    changes: [{ field: "Lekki Annex Clinic · Sign out after", before: "Hospital setting", after: "30 minutes" }],
    where: "Lekki Annex Clinic",
    via: WEB,
  },
  {
    id: "aud_10",
    at: "2026-09-20T09:20:00.000Z",
    ...ADA,
    action: "added service point Records & Reception to Lekki Annex Clinic",
    category: "Branches",
    target: { type: "branch", id: "br_annex", name: "Lekki Annex Clinic" },
    changes: [{ field: "Type", before: "—", after: "Records" }],
    where: "Lekki Annex Clinic",
    via: WEB,
  },
  {
    id: "aud_9",
    at: "2026-09-20T09:00:00.000Z",
    ...ADA,
    action: "created branch Lekki Annex Clinic (LKA)",
    category: "Branches",
    target: { type: "branch", id: "br_annex", name: "Lekki Annex Clinic" },
    changes: [
      { field: "Code", before: "—", after: "LKA" },
      { field: "City / area", before: "—", after: "Lekki Phase 1" },
    ],
    where: "Lekki Annex Clinic",
    via: WEB,
  },
  {
    id: "aud_8",
    at: "2026-09-12T14:20:00.000Z",
    ...ADA,
    action: "updated role Head Cashier",
    category: "Roles",
    target: { type: "role", id: "role_head_cashier", name: "Head Cashier" },
    changes: [{ field: "Permissions added", before: "—", after: "Void payments, View collection reports" }],
    where: "Hospital-wide",
    via: WEB,
    sensitive: true,
  },
  {
    id: "aud_7",
    at: "2026-09-06T08:02:00.000Z",
    ...TUNDE,
    action: "signed in for the first time",
    category: "Sign-in",
    where: "Main Campus",
    via: "Front desk PC 1",
  },
  {
    id: "aud_6",
    at: "2026-09-05T10:30:00.000Z",
    ...ADA,
    action: "created an account for Ngozi Eze (ngozi.eze@lakeside.example)",
    category: "Users",
    target: { type: "user", id: "usr_ngozi", name: "Ngozi Eze" },
    changes: [
      { field: "Roles", before: "—", after: "Head Cashier" },
      { field: "Branch access", before: "—", after: "All branches" },
    ],
    where: "Hospital-wide",
    via: WEB,
    sensitive: true,
  },
  {
    id: "aud_5",
    at: "2026-09-05T10:00:00.000Z",
    ...ADA,
    action: "created an account for Tunde Bakare (tunde.bakare@lakeside.example)",
    category: "Users",
    target: { type: "user", id: "usr_tunde", name: "Tunde Bakare" },
    changes: [
      { field: "Roles", before: "—", after: "Records Officer" },
      { field: "Branch access", before: "—", after: "Main Campus" },
    ],
    where: "Hospital-wide",
    via: WEB,
    sensitive: true,
  },
  {
    id: "aud_4",
    at: "2026-09-02T10:12:00.000Z",
    ...ADA,
    action: "signed in for the first time and set a password",
    category: "Sign-in",
    where: "Hospital-wide",
    via: WEB,
  },
  {
    id: "aud_3",
    at: "2026-09-02T09:10:00.000Z",
    ...DRCARE,
    action: "created the Hospital Super Admin account for Ada Okafor",
    category: "Users",
    target: { type: "user", id: "usr_ada", name: "Ada Okafor" },
    where: "Hospital-wide",
    via: "Dr. Care platform console",
    sensitive: true,
  },
  {
    id: "aud_2",
    at: "2026-09-02T09:05:00.000Z",
    ...DRCARE,
    action: "entitled the hospital to Medical Records and Cash Point",
    category: "Modules",
    changes: [{ field: "Modules on the plan", before: "—", after: "Medical Records, Cash Point" }],
    where: "Hospital-wide",
    via: "Dr. Care platform console",
  },
  {
    id: "aud_1",
    at: "2026-09-02T09:00:00.000Z",
    ...DRCARE,
    action: "onboarded Lakeside Specialist Hospital on the Growth plan",
    category: "Support",
    changes: [
      { field: "Branch limit", before: "—", after: "3" },
      { field: "User limit", before: "—", after: "40" },
    ],
    where: "Hospital-wide",
    via: "Dr. Care platform console",
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
    staffCategoryId: "stc_admin",
    roleIds: ["role_super"],
    extraPermissions: [],
    removedPermissions: [],
    branchScope: "all",
    status: "active",
    mustChangePassword: false,
    lastActiveAt: "2026-10-20T08:30:00.000Z",
    createdAt: T0,
  },
  {
    id: "usr_tunde",
    name: "Tunde Bakare",
    email: "tunde.bakare@lakeside.example",
    phone: "+234 803 444 5566",
    jobTitle: "Senior Records Officer",
    staffCategoryId: "stc_records",
    roleIds: ["role_records"],
    extraPermissions: [],
    removedPermissions: [],
    branchScope: ["br_main"],
    status: "active",
    mustChangePassword: false,
    lastActiveAt: "2026-10-19T16:05:00.000Z",
    createdAt: "2026-09-05T10:00:00.000Z",
  },
  {
    id: "usr_ngozi",
    name: "Ngozi Eze",
    email: "ngozi.eze@lakeside.example",
    phone: "+234 805 777 8899",
    jobTitle: "Head Cashier",
    staffCategoryId: "stc_cash",
    roleIds: ["role_head_cashier"],
    extraPermissions: [],
    removedPermissions: [],
    branchScope: "all",
    status: "active",
    mustChangePassword: false,
    lastActiveAt: "2026-10-20T07:50:00.000Z",
    createdAt: "2026-09-05T10:30:00.000Z",
  },
  {
    id: "usr_musa",
    name: "Musa Ibrahim",
    email: "musa.ibrahim@lakeside.example",
    phone: "+234 806 222 3344",
    jobTitle: "Front Desk Officer",
    staffCategoryId: "stc_records",
    roleIds: ["role_records", "role_cashier"],
    extraPermissions: [],
    removedPermissions: [],
    branchScope: ["br_annex"],
    status: "active",
    mustChangePassword: true,
    createdAt: "2026-10-18T12:00:00.000Z",
  },
];

export const seedStaffCategories: StaffCategory[] = [
  {
    id: "stc_doctor",
    name: "Doctor",
    specialties: [
      "General practice",
      "Internal medicine",
      "Paediatrics",
      "Obstetrics & gynaecology",
      "General surgery",
    ],
    defaultRoleIds: [],
  },
  {
    id: "stc_nurse",
    name: "Nurse",
    specialties: ["General nursing", "Midwifery", "Theatre", "Paediatric nursing"],
    defaultRoleIds: [],
  },
  { id: "stc_records", name: "Records & front desk", specialties: [], defaultRoleIds: ["role_records"] },
  { id: "stc_cash", name: "Cashier & accounts", specialties: [], defaultRoleIds: ["role_cashier"] },
  { id: "stc_admin", name: "Administration", specialties: [], defaultRoleIds: [] },
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
