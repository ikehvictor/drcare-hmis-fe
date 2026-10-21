// Permissions are declared by modules (docs/ARCHITECTURE.md §3 and §7). Hospital admins compose them into roles.
// Once the backend exists, this catalogue comes from the module manifests instead of being hard-coded here.

export interface Permission {
  key: string;
  label: string;
  description: string;
  /** Sensitive actions can later be set to need a second approver. */
  sensitive?: boolean;
}

export interface PermissionGroup {
  /** Module id the permissions belong to; switching the module off removes them. */
  moduleId: string;
  module: string;
  description: string;
  permissions: Permission[];
}

export const PERMISSION_CATALOGUE: PermissionGroup[] = [
  {
    moduleId: "core",
    module: "Administration",
    description: "Running the hospital's own setup.",
    permissions: [
      {
        key: "admin.branches.manage",
        label: "Manage branches & service points",
        description: "Add, edit and deactivate branches and the desks or rooms in them.",
      },
      {
        key: "admin.users.manage",
        label: "Manage users",
        description: "Create staff accounts, set passwords, change what they can do and suspend accounts.",
        sensitive: true,
      },
      {
        key: "admin.roles.manage",
        label: "Manage roles",
        description: "Create roles and change what each role can do.",
        sensitive: true,
      },
      {
        key: "admin.settings.manage",
        label: "Change hospital settings",
        description: "Modules, numbering, forms and other configuration.",
      },
      { key: "admin.audit.view", label: "View audit log", description: "See who did what, when and where." },
    ],
  },
  {
    moduleId: "medical-records",
    module: "Medical Records",
    description: "Registering patients and keeping their records.",
    permissions: [
      {
        key: "patients.view",
        label: "Search and view patients",
        description: "Find patients by number, name or phone and open their record.",
      },
      {
        key: "patients.register",
        label: "Register new patients",
        description: "Create a patient record and issue a patient number.",
      },
      {
        key: "patients.edit",
        label: "Edit patient details",
        description: "Correct demographics, next of kin and payer details.",
      },
      {
        key: "patients.merge",
        label: "Merge duplicate patients",
        description: "Combine two records of the same person.",
        sensitive: true,
      },
      {
        key: "patients.deactivate",
        label: "Deactivate patient records",
        description: "Records are never deleted, only deactivated with a reason.",
        sensitive: true,
      },
      {
        key: "patients.print",
        label: "Print patient cards",
        description: "Print or reprint patient cards and labels.",
      },
    ],
  },
  {
    moduleId: "cash-point",
    module: "Cash Point",
    description: "Billing patients and taking payments.",
    permissions: [
      { key: "billing.view", label: "View bills", description: "See charges, bills and what is outstanding." },
      { key: "billing.charge", label: "Add charges", description: "Add a service to a patient's bill." },
      {
        key: "payment.receive",
        label: "Receive payments",
        description: "Take cash, POS, transfer or deposit payments and issue receipts.",
      },
      { key: "payment.refund", label: "Issue refunds", description: "Return money to a patient.", sensitive: true },
      {
        key: "payment.void",
        label: "Void payments",
        description: "Cancel a payment recorded by mistake.",
        sensitive: true,
      },
      {
        key: "billing.discount",
        label: "Apply discounts & waivers",
        description: "Reduce or waive what a patient owes.",
        sensitive: true,
      },
      {
        key: "till.manage",
        label: "Open and close a till",
        description: "Start a cashier shift with a float and close it with a count.",
      },
      {
        key: "reports.collections",
        label: "View collection reports",
        description: "Daily collections by cashier, method, service and branch.",
      },
    ],
  },
];

export const ALL_PERMISSIONS = PERMISSION_CATALOGUE.flatMap((g) => g.permissions);
export const ALL_PERMISSION_KEYS = ALL_PERMISSIONS.map((p) => p.key);

export const permissionByKey = (key: string) => ALL_PERMISSIONS.find((p) => p.key === key);

/** Functions a hospital names itself start with this, so they never clash with ones a module declares. */
export const CUSTOM_PREFIX = "custom.";

/** The catalogue plus the hospital's own functions, which no module checks yet. */
export function permissionCatalogue(custom: { key: string; label: string; description: string }[]): PermissionGroup[] {
  if (!custom.length) return PERMISSION_CATALOGUE;
  return [
    ...PERMISSION_CATALOGUE,
    {
      moduleId: "core",
      module: "Your hospital's functions",
      description: "Named by your hospital. No module checks these yet, so they record who is responsible.",
      permissions: custom.map((c) => ({ key: c.key, label: c.label, description: c.description })),
    },
  ];
}
