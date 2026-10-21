"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type {
  AuditEntry,
  Branch,
  CustomFunction,
  ModuleState,
  Role,
  ServicePoint,
  StaffCategory,
  Tenant,
  User,
  UserStatus,
} from "./types";
import { diff, listDiff, show } from "./audit";
import { branchScopeLabel, effectivePermissions, staffLabel } from "./access";
import { CUSTOM_PREFIX, permissionByKey } from "./permissions";
import {
  CURRENT_USER_ID,
  seedAudit,
  seedBranches,
  seedCategories,
  seedForms,
  seedModules,
  seedNumbering,
  seedRoles,
  seedSettings,
  seedStaffCategories,
  seedTenant,
  seedUsers,
} from "./mock-data";
import { moduleById, type SettingValue } from "./modules";
import type { NumberingConfig } from "./numbering";
import { CORE_FIELDS, type PatientCategory, type RegistrationForm } from "./forms";
import { timeoutLabel, type HospitalSettings } from "./settings";
import { formatDob, fullName, issueNumber, type Patient } from "./patients";

// Front-end only: state lives in memory and is mirrored to localStorage so the
// demo survives a refresh. This is replaced by API calls once the backend exists.
const STORAGE_KEY = "drcare-admin-demo-v7";

interface State {
  tenant: Tenant;
  branches: Branch[];
  roles: Role[];
  users: User[];
  staffCategories: StaffCategory[];
  /** Functions the hospital has named itself; see CustomFunction. */
  customFunctions: CustomFunction[];
  modules: Record<string, ModuleState>;
  /** Modules the hospital has asked Dr. Care to add to its plan. */
  moduleRequests: string[];
  numbering: NumberingConfig;
  forms: RegistrationForm[];
  categories: PatientCategory[];
  settings: HospitalSettings;
  /** Append-only audit log, newest first. */
  audit: AuditEntry[];
  /** Registered patients, newest first. Records are never deleted. */
  patients: Patient[];
  /** Next running number per counter; see counterKey in ./patients. */
  patientCounters: Record<string, number>;
  /** Who is signed in at the front desk and the branch they're working at. */
  desk: { userId: string; branchId: string };
}

export type BranchInput = Pick<Branch, "name" | "code" | "address" | "city" | "state" | "phone" | "isMain">;
export type ServicePointInput = Pick<ServicePoint, "name" | "type" | "location">;
export type RoleInput = Pick<Role, "name" | "description" | "permissions">;
export type CategoryInput = Pick<PatientCategory, "code" | "name" | "formId">;
export type UserInput = Pick<
  User,
  "name" | "email" | "phone" | "jobTitle" | "staffCategoryId" | "specialty" | "roleIds" | "branchScope"
>;
export type StaffCategoryInput = Omit<StaffCategory, "id">;
export type PatientInput = Omit<
  Patient,
  "id" | "number" | "categoryName" | "branchName" | "registeredAt" | "registeredBy"
> & {
  /** The desk user registering the patient. */
  clerkId: string;
  /** Numbers of possible matches the clerk saw and decided were different people. */
  notMatching?: string[];
};

interface Store extends State {
  addBranch: (input: BranchInput) => Branch;
  updateBranch: (id: string, input: BranchInput) => void;
  setBranchActive: (id: string, active: boolean) => void;
  addServicePoint: (branchId: string, input: ServicePointInput) => void;
  updateServicePoint: (branchId: string, pointId: string, input: ServicePointInput) => void;
  setServicePointActive: (branchId: string, pointId: string, active: boolean) => void;
  addRole: (input: RoleInput) => Role;
  updateRole: (id: string, input: RoleInput) => void;
  deleteRole: (id: string) => void;
  /** Creates an active account with a password the admin chose; the password itself is never stored. */
  createUser: (input: UserInput, mustChangePassword: boolean) => User;
  updateUser: (id: string, input: UserInput) => void;
  setUserPassword: (id: string, mustChangePassword: boolean) => void;
  /** Functions given to or taken from one person, on top of their roles. */
  setUserAccess: (id: string, extra: string[], removed: string[]) => void;
  addStaffCategory: (input: StaffCategoryInput) => void;
  updateStaffCategory: (id: string, input: StaffCategoryInput) => void;
  /** Only removes a category nobody is in. */
  deleteStaffCategory: (id: string) => void;
  addCustomFunction: (label: string, description: string) => CustomFunction;
  /** Only removes a function no role or person has. */
  deleteCustomFunction: (key: string) => void;
  setUserStatus: (id: string, status: UserStatus) => void;
  /** Switches several modules at once, so a module and its dependencies change together. */
  setModulesEnabled: (ids: string[], enabled: boolean) => void;
  updateModuleSettings: (id: string, settings: Record<string, SettingValue>) => void;
  requestModule: (id: string) => void;
  isModuleOn: (id: string) => boolean;
  saveNumbering: (config: Omit<NumberingConfig, "configured" | "updatedAt">) => void;
  addForm: (name: string, description: string, copyFrom?: RegistrationForm) => RegistrationForm;
  saveForm: (form: RegistrationForm) => void;
  /** Only removes a form no category uses. */
  deleteForm: (id: string) => void;
  addCategory: (input: CategoryInput) => void;
  updateCategory: (id: string, input: CategoryInput) => void;
  setCategoryActive: (id: string, active: boolean) => void;
  /** Saves one part of the settings; `what` names it in the audit log. */
  saveSettings: (patch: Partial<HospitalSettings>, what: string) => void;
  /** Records that the audit log was exported; exporting is itself audited. */
  exportedAudit: (count: number, filtered: boolean) => void;
  /** Issues the next patient number, saves the record and logs it. Returns the new patient's id. */
  registerPatient: (input: PatientInput) => string;
  setDesk: (desk: { userId: string; branchId: string }) => void;
  /** Active users who may register patients right now. */
  deskUsers: User[];
  currentUserId: string;
  /** False until saved demo data has been read from the browser. */
  ready: boolean;
  toast: string | null;
  notify: (message: string) => void;
  resetDemo: () => void;
}

const StoreContext = createContext<Store | null>(null);

const initialState = (): State => ({
  tenant: seedTenant,
  branches: seedBranches,
  roles: seedRoles,
  users: seedUsers,
  staffCategories: seedStaffCategories,
  customFunctions: [],
  modules: seedModules,
  moduleRequests: [],
  numbering: seedNumbering,
  forms: seedForms,
  categories: seedCategories,
  settings: seedSettings,
  audit: seedAudit,
  patients: [],
  patientCounters: {},
  desk: { userId: "usr_tunde", branchId: "br_main" },
});

const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
const ME = { actor: "Ada Okafor", actorRole: "Hospital Super Admin" };
const VIA = "Web admin · this browser";
const HOSPITAL_WIDE = "Hospital-wide";
const DESK_VIA = "Front desk · this browser";

type LogInput = Omit<AuditEntry, "id" | "at" | "actor" | "actorRole" | "via" | "where"> & { where?: string };

const BRANCH_LABELS = {
  name: "Name",
  code: "Code",
  address: "Address",
  city: "City / area",
  state: "State",
  phone: "Phone",
  isMain: "Main branch",
} as const;
const POINT_LABELS = { name: "Name", type: "Type", location: "Location" } as const;
const CATEGORY_LABELS = { name: "Name", code: "Code", formId: "Form" } as const;

const permissionLabel = (key: string) => permissionByKey(key)?.label ?? key;
/** Labels for built-in functions and the hospital's own. */
const fnLabel = (s: State) => (key: string) =>
  permissionByKey(key)?.label ?? s.customFunctions.find((c) => c.key === key)?.label ?? key;
const formName = (s: State, id: string) => s.forms.find((f) => f.id === id)?.name ?? id;
const roleName = (s: State, id: string) => s.roles.find((r) => r.id === id)?.name ?? id;

function userChanges(s: State, before: User | undefined, after: UserInput) {
  return [
    ...diff(before, after, { name: "Name", email: "Email", phone: "Phone", jobTitle: "Job title" }),
    ...diff(
      before && { staff: staffLabel(before, s.staffCategories) },
      { staff: staffLabel(after, s.staffCategories) },
      { staff: "Staff category" },
    ),
    ...(before
      ? listDiff(
          "Roles",
          before.roleIds.map((id) => roleName(s, id)),
          after.roleIds.map((id) => roleName(s, id)),
        )
      : [{ field: "Roles", before: "—", after: after.roleIds.map((id) => roleName(s, id)).join(", ") }]),
    ...diff(
      before && { access: branchScopeLabel(before, s.branches) },
      { access: branchScopeLabel({ branchScope: after.branchScope } as User, s.branches) },
      { access: "Branch access" },
    ),
  ];
}

function settingsChanges(s: State, before: HospitalSettings, after: HospitalSettings) {
  const minutes = (v: unknown) => (typeof v === "number" ? timeoutLabel(v) : show(v));
  const branchName = (id: string) => s.branches.find((b) => b.id === id)?.name ?? id;
  const approval = (r?: { required: boolean; approverRoleId: string }) =>
    r?.required ? `Approved by ${roleName(s, r.approverRoleId)}` : "No approval";
  const approvalKeys = [...new Set([...Object.keys(before.approvals), ...Object.keys(after.approvals)])];
  const branchIds = [...new Set([...Object.keys(before.branchOverrides), ...Object.keys(after.branchOverrides)])];
  return [
    ...diff(
      { ...before.profile, logo: before.profile.logo ? "Uploaded" : "None" },
      {
        ...after.profile,
        logo: after.profile.logo ? (after.profile.logo === before.profile.logo ? "Uploaded" : "New logo") : "None",
      },
      {
        displayName: "Hospital name",
        shortName: "Short name",
        email: "Contact email",
        phone: "Contact phone",
        address: "Address",
        dateFormat: "Date format",
        logo: "Logo",
      },
    ),
    ...diff(
      before.security,
      after.security,
      {
        sessionTimeoutMinutes: "Sign out after",
        pinSwitch: "Quick PIN switch",
        twoFactor: "Two-step sign-in",
        passwordMinLength: "Minimum password length",
      },
      { sessionTimeoutMinutes: minutes },
    ),
    ...approvalKeys
      .map((k) => ({
        field: `Approval · ${permissionLabel(k)}`,
        before: approval(before.approvals[k]),
        after: approval(after.approvals[k]),
      }))
      .filter((c) => c.before !== c.after),
    ...branchIds.flatMap((id) =>
      diff(
        before.branchOverrides[id] ?? {},
        after.branchOverrides[id] ?? {},
        {
          sessionTimeoutMinutes: `${branchName(id)} · Sign out after`,
          pinSwitch: `${branchName(id)} · Quick PIN switch`,
        },
        {
          sessionTimeoutMinutes: (v) => (v === undefined ? "Hospital setting" : minutes(v)),
          pinSwitch: (v) => (v === undefined ? "Hospital setting" : show(v)),
        },
      ),
    ),
  ];
}

const categoryChanges = (s: State, before: StaffCategoryInput | undefined, after: StaffCategoryInput) => [
  ...diff(before, after, { name: "Name" }),
  ...listDiff("Specialties", before?.specialties ?? [], after.specialties),
  ...listDiff(
    "Suggested roles",
    (before?.defaultRoleIds ?? []).map((r) => roleName(s, r)),
    after.defaultRoleIds.map((r) => roleName(s, r)),
  ),
];

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from browser storage
      if (raw) setState({ ...initialState(), ...JSON.parse(raw) });
    } catch {
      // Storage unavailable or corrupt: keep the seed data.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore: the demo still works in memory.
    }
  }, [state, loaded]);

  // Only ever prepends: entries are never edited or removed.
  const log = (s: State, e: LogInput): AuditEntry[] => [
    { id: newId("aud"), at: new Date().toISOString(), ...ME, via: VIA, ...e, where: e.where ?? HOSPITAL_WIDE },
    ...s.audit,
  ];

  const addBranch = useCallback((input: BranchInput) => {
    const branch: Branch = {
      ...input,
      id: newId("br"),
      code: input.code.toUpperCase(),
      active: true,
      servicePoints: [],
      createdAt: new Date().toISOString(),
    };
    setState((s) => ({
      ...s,
      branches: [...s.branches.map((b) => (input.isMain ? { ...b, isMain: false } : b)), branch],
      audit: log(s, {
        action: `created branch ${branch.name} (${branch.code})`,
        category: "Branches",
        target: { type: "branch", id: branch.id, name: branch.name },
        changes: diff(undefined, branch, BRANCH_LABELS),
        where: branch.name,
      }),
    }));
    return branch;
  }, []);

  const updateBranch = useCallback((id: string, input: BranchInput) => {
    setState((s) => {
      const before = s.branches.find((b) => b.id === id);
      const after = { ...input, code: input.code.toUpperCase() };
      return {
        ...s,
        branches: s.branches.map((b) =>
          b.id === id ? { ...b, ...after } : input.isMain ? { ...b, isMain: false } : b,
        ),
        audit: log(s, {
          action: `updated branch ${input.name}`,
          category: "Branches",
          target: { type: "branch", id, name: input.name },
          changes: diff(before, after, BRANCH_LABELS),
          where: input.name,
        }),
      };
    });
  }, []);

  const setBranchActive = useCallback((id: string, active: boolean) => {
    setState((s) => {
      const b = s.branches.find((x) => x.id === id);
      return {
        ...s,
        branches: s.branches.map((x) => (x.id === id ? { ...x, active } : x)),
        audit: log(s, {
          action: `${active ? "reactivated" : "deactivated"} branch ${b?.name ?? ""}`,
          category: "Branches",
          target: b && { type: "branch", id, name: b.name },
          changes: [{ field: "Status", before: active ? "Inactive" : "Active", after: active ? "Active" : "Inactive" }],
          where: b?.name,
        }),
      };
    });
  }, []);

  const mapBranch = (s: State, branchId: string, fn: (b: Branch) => Branch) =>
    s.branches.map((b) => (b.id === branchId ? fn(b) : b));

  const addServicePoint = useCallback((branchId: string, input: ServicePointInput) => {
    setState((s) => {
      const branch = s.branches.find((b) => b.id === branchId);
      return {
        ...s,
        branches: mapBranch(s, branchId, (b) => ({
          ...b,
          servicePoints: [...b.servicePoints, { ...input, id: newId("sp"), active: true }],
        })),
        audit: log(s, {
          action: `added service point ${input.name} to ${branch?.name ?? "a branch"}`,
          category: "Branches",
          target: branch && { type: "branch", id: branchId, name: branch.name },
          changes: diff(undefined, input, { type: "Type", location: "Location" }),
          where: branch?.name,
        }),
      };
    });
  }, []);

  const updateServicePoint = useCallback((branchId: string, pointId: string, input: ServicePointInput) => {
    setState((s) => {
      const branch = s.branches.find((b) => b.id === branchId);
      const before = branch?.servicePoints.find((p) => p.id === pointId);
      return {
        ...s,
        branches: mapBranch(s, branchId, (b) => ({
          ...b,
          servicePoints: b.servicePoints.map((p) => (p.id === pointId ? { ...p, ...input } : p)),
        })),
        audit: log(s, {
          action: `updated service point ${input.name}`,
          category: "Branches",
          target: branch && { type: "branch", id: branchId, name: branch.name },
          changes: diff(before, input, POINT_LABELS),
          where: branch?.name,
        }),
      };
    });
  }, []);

  const setServicePointActive = useCallback((branchId: string, pointId: string, active: boolean) => {
    setState((s) => {
      const branch = s.branches.find((b) => b.id === branchId);
      const point = branch?.servicePoints.find((p) => p.id === pointId);
      return {
        ...s,
        branches: mapBranch(s, branchId, (b) => ({
          ...b,
          servicePoints: b.servicePoints.map((p) => (p.id === pointId ? { ...p, active } : p)),
        })),
        audit: log(s, {
          action: `${active ? "opened" : "closed"} service point ${point?.name ?? ""}`,
          category: "Branches",
          target: branch && { type: "branch", id: branchId, name: branch.name },
          changes: [{ field: "Open", before: show(!active), after: show(active) }],
          where: branch?.name,
        }),
      };
    });
  }, []);

  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const addRole = useCallback((input: RoleInput) => {
    const role: Role = { ...input, id: newId("role"), createdAt: new Date().toISOString() };
    setState((s) => ({
      ...s,
      roles: [...s.roles, role],
      audit: log(s, {
        action: `created role ${role.name}`,
        category: "Roles",
        target: { type: "role", id: role.id, name: role.name },
        changes: listDiff("Permissions", [], role.permissions.map(fnLabel(s))),
        sensitive: true,
      }),
    }));
    return role;
  }, []);

  const updateRole = useCallback((id: string, input: RoleInput) => {
    setState((s) => {
      const before = s.roles.find((r) => r.id === id);
      if (!before || before.locked) return s;
      return {
        ...s,
        roles: s.roles.map((r) => (r.id === id ? { ...r, ...input } : r)),
        audit: log(s, {
          action: `updated role ${input.name}`,
          category: "Roles",
          target: { type: "role", id, name: input.name },
          changes: [
            ...diff(before, input, { name: "Name", description: "Description" }),
            ...listDiff("Permissions", before.permissions.map(fnLabel(s)), input.permissions.map(fnLabel(s))),
          ],
          sensitive: true,
        }),
      };
    });
  }, []);

  const deleteRole = useCallback((id: string) => {
    setState((s) => {
      const role = s.roles.find((r) => r.id === id);
      // A role in use or the locked Super Admin role is never removed.
      if (!role || role.locked || s.users.some((u) => u.roleIds.includes(id))) return s;
      return {
        ...s,
        roles: s.roles.filter((r) => r.id !== id),
        staffCategories: s.staffCategories.map((c) => ({
          ...c,
          defaultRoleIds: c.defaultRoleIds.filter((r) => r !== id),
        })),
        audit: log(s, {
          action: `deleted role ${role.name}`,
          category: "Roles",
          target: { type: "role", id, name: role.name },
          changes: listDiff("Permissions", role.permissions.map(fnLabel(s)), []),
          sensitive: true,
        }),
      };
    });
  }, []);

  const createUser = useCallback((input: UserInput, mustChangePassword: boolean) => {
    const now = new Date().toISOString();
    const user: User = {
      ...input,
      id: newId("usr"),
      status: "active",
      extraPermissions: [],
      removedPermissions: [],
      mustChangePassword,
      passwordSetAt: now,
      createdAt: now,
    };
    setState((s) => ({
      ...s,
      users: [...s.users, user],
      audit: log(s, {
        action: `created an account for ${user.name} (${user.email})`,
        category: "Users",
        target: { type: "user", id: user.id, name: user.name },
        changes: [
          ...userChanges(s, undefined, user),
          {
            field: "Password",
            before: "—",
            after: mustChangePassword ? "Set by admin · must change at first sign-in" : "Set by admin",
          },
        ],
        sensitive: true,
      }),
    }));
    return user;
  }, []);

  const updateUser = useCallback((id: string, input: UserInput) => {
    setState((s) => {
      const before = s.users.find((u) => u.id === id);
      return {
        ...s,
        users: s.users.map((u) => (u.id === id ? { ...u, ...input } : u)),
        audit: log(s, {
          action: `updated ${input.name}'s account`,
          category: "Users",
          target: { type: "user", id, name: input.name },
          changes: userChanges(s, before, input),
          sensitive: true,
        }),
      };
    });
  }, []);

  const setUserStatus = useCallback((id: string, status: UserStatus) => {
    if (id === CURRENT_USER_ID) return;
    setState((s) => {
      const u = s.users.find((x) => x.id === id);
      const verb = status === "suspended" ? "suspended" : "reactivated";
      return {
        ...s,
        users: s.users.map((x) => (x.id === id ? { ...x, status } : x)),
        audit: log(s, {
          action: `${verb} ${u?.name ?? "a user"}`,
          category: "Users",
          target: u && { type: "user", id, name: u.name },
          changes: [{ field: "Status", before: show(u?.status), after: status }],
          sensitive: true,
        }),
      };
    });
  }, []);

  const setUserPassword = useCallback((id: string, mustChangePassword: boolean) => {
    setState((s) => {
      const u = s.users.find((x) => x.id === id);
      if (!u) return s;
      return {
        ...s,
        users: s.users.map((x) =>
          x.id === id ? { ...x, mustChangePassword, passwordSetAt: new Date().toISOString() } : x,
        ),
        audit: log(s, {
          action: `set a new password for ${u.name}`,
          category: "Users",
          target: { type: "user", id, name: u.name },
          changes: [
            {
              field: "Password",
              before: "Previous password",
              after: mustChangePassword ? "Set by admin · must change at next sign-in" : "Set by admin",
            },
          ],
          sensitive: true,
        }),
      };
    });
  }, []);

  const setUserAccess = useCallback((id: string, extra: string[], removed: string[]) => {
    // Nobody changes their own access, so an admin can't lock themselves out.
    if (id === CURRENT_USER_ID) return;
    setState((s) => {
      const u = s.users.find((x) => x.id === id);
      if (!u) return s;
      const label = fnLabel(s);
      return {
        ...s,
        users: s.users.map((x) => (x.id === id ? { ...x, extraPermissions: extra, removedPermissions: removed } : x)),
        audit: log(s, {
          action: `changed what ${u.name} can do`,
          category: "Users",
          target: { type: "user", id, name: u.name },
          changes: [
            ...listDiff("Also allowed", u.extraPermissions.map(label), extra.map(label)),
            ...listDiff("Not allowed", u.removedPermissions.map(label), removed.map(label)),
          ],
          sensitive: true,
        }),
      };
    });
  }, []);

  const addStaffCategory = useCallback((input: StaffCategoryInput) => {
    const id = newId("stc");
    setState((s) => ({
      ...s,
      staffCategories: [...s.staffCategories, { ...input, id }],
      audit: log(s, {
        action: `added staff category ${input.name}`,
        category: "Staff",
        target: { type: "staff-category", id, name: input.name },
        changes: categoryChanges(s, undefined, input),
      }),
    }));
  }, []);

  const updateStaffCategory = useCallback((id: string, input: StaffCategoryInput) => {
    setState((s) => {
      const before = s.staffCategories.find((c) => c.id === id);
      if (!before) return s;
      return {
        ...s,
        staffCategories: s.staffCategories.map((c) => (c.id === id ? { ...c, ...input } : c)),
        // People keep a specialty that was removed until someone edits them, so nothing is lost silently.
        audit: log(s, {
          action: `updated staff category ${input.name}`,
          category: "Staff",
          target: { type: "staff-category", id, name: input.name },
          changes: categoryChanges(s, before, input),
        }),
      };
    });
  }, []);

  const deleteStaffCategory = useCallback((id: string) => {
    setState((s) => {
      const c = s.staffCategories.find((x) => x.id === id);
      if (!c || s.users.some((u) => u.staffCategoryId === id)) return s;
      return {
        ...s,
        staffCategories: s.staffCategories.filter((x) => x.id !== id),
        audit: log(s, {
          action: `deleted staff category ${c.name}`,
          category: "Staff",
          target: { type: "staff-category", id, name: c.name },
        }),
      };
    });
  }, []);

  const addCustomFunction = useCallback((label: string, description: string) => {
    const fn: CustomFunction = { key: `${CUSTOM_PREFIX}${newId("fn")}`, label, description };
    setState((s) => ({
      ...s,
      customFunctions: [...s.customFunctions, fn],
      audit: log(s, {
        action: `added the function “${label}”`,
        category: "Roles",
        changes: diff(undefined, fn, { label: "Function", description: "Description" }),
      }),
    }));
    return fn;
  }, []);

  const deleteCustomFunction = useCallback((key: string) => {
    setState((s) => {
      const fn = s.customFunctions.find((c) => c.key === key);
      const used =
        s.roles.some((r) => r.permissions.includes(key)) ||
        s.users.some((u) => u.extraPermissions.includes(key) || u.removedPermissions.includes(key));
      if (!fn || used) return s;
      return {
        ...s,
        customFunctions: s.customFunctions.filter((c) => c.key !== key),
        audit: log(s, { action: `deleted the function “${fn.label}”`, category: "Roles" }),
      };
    });
  }, []);

  const setModulesEnabled = useCallback((ids: string[], enabled: boolean) => {
    setState((s) => {
      // Only entitled, non-core modules can be switched.
      const changed = ids.filter((id) => s.modules[id] && !moduleById(id)?.core && s.modules[id].enabled !== enabled);
      if (!changed.length) return s;
      const names = changed.map((id) => moduleById(id)?.name ?? id).join(" and ");
      return {
        ...s,
        modules: { ...s.modules, ...Object.fromEntries(changed.map((id) => [id, { ...s.modules[id]!, enabled }])) },
        audit: log(s, {
          action: `switched ${enabled ? "on" : "off"} ${names}`,
          category: "Modules",
          target: changed.length === 1 ? { type: "module", id: changed[0]!, name: names } : undefined,
          changes: changed.map((m) => ({
            field: moduleById(m)?.name ?? m,
            before: enabled ? "Off" : "On",
            after: enabled ? "On" : "Off",
          })),
        }),
      };
    });
  }, []);

  const updateModuleSettings = useCallback((id: string, settings: Record<string, SettingValue>) => {
    setState((s) =>
      s.modules[id]
        ? {
            ...s,
            modules: { ...s.modules, [id]: { ...s.modules[id], settings } },
            audit: log(s, {
              action: `changed ${moduleById(id)?.name ?? id} options`,
              category: "Modules",
              target: { type: "module", id, name: moduleById(id)?.name ?? id },
              changes: diff(
                s.modules[id].settings,
                settings,
                Object.fromEntries((moduleById(id)?.settings ?? []).map((x) => [x.key, x.label])),
                Object.fromEntries(
                  (moduleById(id)?.settings ?? [])
                    .filter((x) => x.type === "money")
                    .map((x) => [x.key, (v: unknown) => `₦${show(v)}`]),
                ),
              ),
            }),
          }
        : s,
    );
  }, []);

  const requestModule = useCallback((id: string) => {
    setState((s) =>
      s.moduleRequests.includes(id)
        ? s
        : {
            ...s,
            moduleRequests: [...s.moduleRequests, id],
            audit: log(s, {
              action: `asked Dr. Care to add ${moduleById(id)?.name ?? id}`,
              category: "Modules",
              target: { type: "module", id, name: moduleById(id)?.name ?? id },
            }),
          },
    );
  }, []);

  const saveNumbering = useCallback((config: Omit<NumberingConfig, "configured" | "updatedAt">) => {
    setState((s) => ({
      ...s,
      numbering: { ...config, configured: true, updatedAt: new Date().toISOString() },
      audit: log(s, {
        action: `set the patient number format to ${config.template}`,
        category: "Numbering",
        target: { type: "numbering", id: "numbering", name: "Patient numbering" },
        changes: diff(s.numbering.configured ? s.numbering : undefined, config, {
          template: "Format",
          prefix: "Prefix",
          scope: "Counting",
          reset: "Restart",
          startAt: "First number",
          keepLegacyNumber: "Keep old card numbers",
        }),
      }),
    }));
  }, []);

  const addForm = useCallback((name: string, description: string, copyFrom?: RegistrationForm) => {
    // A blank form still starts with the core fields every patient record has.
    const sections = copyFrom
      ? copyFrom.sections.map((sec) => ({
          ...sec,
          id: newId("sec"),
          fields: sec.fields.map((f) => ({ ...f, options: f.options && [...f.options], id: newId("fld") })),
        }))
      : [
          {
            id: newId("sec"),
            title: "Patient details",
            fields: CORE_FIELDS.map((f) => ({ ...f, id: newId("fld"), kind: "core" as const })),
          },
        ];
    const form: RegistrationForm = {
      id: newId("form"),
      name,
      description,
      updatedAt: new Date().toISOString(),
      sections,
    };
    setState((s) => ({
      ...s,
      forms: [...s.forms, form],
      audit: log(s, {
        action: `created the ${name} form${copyFrom ? ` from ${copyFrom.name}` : ""}`,
        category: "Forms",
        target: { type: "form", id: form.id, name },
      }),
    }));
    return form;
  }, []);

  const saveForm = useCallback((form: RegistrationForm) => {
    setState((s) => {
      const before = s.forms.find((f) => f.id === form.id);
      const fields = (f?: RegistrationForm) => f?.sections.flatMap((sec) => sec.fields) ?? [];
      const required = (f?: RegistrationForm) =>
        fields(f)
          .filter((x) => x.required)
          .map((x) => x.label);
      return {
        ...s,
        forms: s.forms.map((f) => (f.id === form.id ? { ...form, updatedAt: new Date().toISOString() } : f)),
        audit: log(s, {
          action: `updated the ${form.name} form`,
          category: "Forms",
          target: { type: "form", id: form.id, name: form.name },
          changes: [
            ...diff(before, form, { name: "Name", description: "Description" }),
            ...listDiff(
              "Sections",
              before?.sections.map((x) => x.title) ?? [],
              form.sections.map((x) => x.title),
            ),
            ...listDiff(
              "Fields",
              fields(before).map((x) => x.label),
              fields(form).map((x) => x.label),
            ),
            ...listDiff("Required", required(before), required(form)),
          ],
        }),
      };
    });
  }, []);

  const deleteForm = useCallback((id: string) => {
    setState((s) => {
      const form = s.forms.find((f) => f.id === id);
      if (!form || s.categories.some((c) => c.formId === id)) return s;
      return {
        ...s,
        forms: s.forms.filter((f) => f.id !== id),
        audit: log(s, {
          action: `deleted the ${form.name} form`,
          category: "Forms",
          target: { type: "form", id, name: form.name },
        }),
      };
    });
  }, []);

  const addCategory = useCallback((input: CategoryInput) => {
    setState((s) => ({
      ...s,
      categories: [...s.categories, { ...input, id: newId("cat"), active: true }],
      audit: log(s, {
        action: `added patient category ${input.name} (${input.code})`,
        category: "Forms",
        changes: diff(undefined, { ...input, formId: formName(s, input.formId) }, CATEGORY_LABELS),
      }),
    }));
  }, []);

  const updateCategory = useCallback((id: string, input: CategoryInput) => {
    setState((s) => {
      const before = s.categories.find((c) => c.id === id);
      return {
        ...s,
        categories: s.categories.map((c) => (c.id === id ? { ...c, ...input } : c)),
        audit: log(s, {
          action: `updated patient category ${input.name}`,
          category: "Forms",
          changes: diff(
            before && { ...before, formId: formName(s, before.formId) },
            { ...input, formId: formName(s, input.formId) },
            CATEGORY_LABELS,
          ),
        }),
      };
    });
  }, []);

  const setCategoryActive = useCallback((id: string, active: boolean) => {
    setState((s) => {
      const c = s.categories.find((x) => x.id === id);
      return {
        ...s,
        categories: s.categories.map((x) => (x.id === id ? { ...x, active } : x)),
        audit: log(s, {
          action: `${active ? "reactivated" : "deactivated"} patient category ${c?.name ?? ""}`,
          category: "Forms",
          changes: [{ field: "In use", before: show(!active), after: show(active) }],
        }),
      };
    });
  }, []);

  const saveSettings = useCallback((patch: Partial<HospitalSettings>, what: string) => {
    setState((s) => {
      const after = { ...s.settings, ...patch };
      return {
        ...s,
        settings: after,
        audit: log(s, {
          action: `changed ${what}`,
          category: "Settings",
          target: { type: "settings", id: "settings", name: "Settings" },
          changes: settingsChanges(s, s.settings, after),
          // Who must approve risky actions is itself a risky change.
          sensitive: JSON.stringify(s.settings.approvals) !== JSON.stringify(after.approvals),
        }),
      };
    });
  }, []);

  const exportedAudit = useCallback((count: number, filtered: boolean) => {
    setState((s) => ({
      ...s,
      audit: log(s, {
        action: `exported ${filtered ? "a filtered view of " : ""}the audit log (${count} ${count === 1 ? "entry" : "entries"})`,
        category: "Audit",
      }),
    }));
  }, []);

  const registerPatient = useCallback((input: PatientInput) => {
    const id = newId("pat");
    const { clerkId, notMatching, ...rest } = input;
    setState((s) => {
      const branch = s.branches.find((b) => b.id === input.branchId);
      const category = s.categories.find((c) => c.id === input.categoryId);
      const clerk = s.users.find((u) => u.id === clerkId);
      if (!branch || !category || !clerk || s.patients.some((p) => p.id === id)) return s;
      const now = new Date();
      const { number, counters } = issueNumber(
        s.numbering,
        s.patientCounters,
        new Set(s.patients.map((p) => p.number.toUpperCase())),
        {
          branchId: branch.id,
          branchCode: branch.code,
          categoryId: category.id,
          categoryCode: category.code,
          date: now,
        },
      );

      const patient: Patient = {
        ...rest,
        id,
        number,
        categoryName: category.name,
        branchName: branch.name,
        registeredAt: now.toISOString(),
        registeredBy: clerk.name,
      };
      const name = fullName(patient);
      return {
        ...s,
        patients: [patient, ...s.patients],
        patientCounters: counters,
        audit: [
          {
            id: newId("aud"),
            at: patient.registeredAt,
            actor: clerk.name,
            actorRole: clerk.roleIds.map((r) => roleName(s, r)).join(", "),
            via: DESK_VIA,
            action: `registered patient ${name} as ${number}`,
            category: "Patients",
            target: { type: "patient", id, name: `${name} (${number})` },
            where: branch.name,
            sensitive: true,
            // Identity only: the rest of the answers stay on the record, not in the log.
            changes: [
              { field: "Patient number", before: "—", after: number },
              { field: "Category", before: "—", after: `${category.name} (${category.code})` },
              { field: "Name", before: "—", after: name },
              { field: "Sex", before: "—", after: show(patient.sex) },
              {
                field: "Date of birth",
                before: "—",
                after: patient.dobEstimated
                  ? `Estimated, born ${patient.dateOfBirth.slice(0, 4)}`
                  : formatDob(patient.dateOfBirth),
              },
              { field: "Phone", before: "—", after: show(patient.phone) },
              ...(patient.legacyNumber ? [{ field: "Old card number", before: "—", after: patient.legacyNumber }] : []),
              ...(notMatching?.length
                ? [
                    {
                      field: "Possible duplicate",
                      before: notMatching.join(", "),
                      after: "Checked: a different person",
                    },
                  ]
                : []),
            ],
          },
          ...s.audit,
        ],
      };
    });
    return id;
  }, []);

  const setDesk = useCallback((desk: { userId: string; branchId: string }) => setState((s) => ({ ...s, desk })), []);

  const resetDemo = useCallback(() => setState(initialState()), []);

  const deskUsers = useMemo(
    () =>
      state.users.filter(
        (u) =>
          u.status === "active" &&
          effectivePermissions(u, state.roles, (id) => !!state.modules[id]?.enabled).has("patients.register"),
      ),
    [state.users, state.roles, state.modules],
  );

  const value = useMemo<Store>(
    () => ({
      ...state,
      addBranch,
      updateBranch,
      setBranchActive,
      addServicePoint,
      updateServicePoint,
      setServicePointActive,
      addRole,
      updateRole,
      deleteRole,
      createUser,
      updateUser,
      setUserPassword,
      setUserAccess,
      addStaffCategory,
      updateStaffCategory,
      deleteStaffCategory,
      addCustomFunction,
      deleteCustomFunction,
      setUserStatus,
      setModulesEnabled,
      updateModuleSettings,
      requestModule,
      isModuleOn: (id: string) => !!state.modules[id]?.enabled,
      saveNumbering,
      addForm,
      saveForm,
      deleteForm,
      addCategory,
      updateCategory,
      setCategoryActive,
      saveSettings,
      exportedAudit,
      registerPatient,
      setDesk,
      deskUsers,
      currentUserId: CURRENT_USER_ID,
      ready: loaded,
      toast,
      notify,
      resetDemo,
    }),
    [
      state,
      addBranch,
      updateBranch,
      setBranchActive,
      addServicePoint,
      updateServicePoint,
      setServicePointActive,
      addRole,
      updateRole,
      deleteRole,
      createUser,
      updateUser,
      setUserPassword,
      setUserAccess,
      addStaffCategory,
      updateStaffCategory,
      deleteStaffCategory,
      addCustomFunction,
      deleteCustomFunction,
      setUserStatus,
      setModulesEnabled,
      updateModuleSettings,
      requestModule,
      saveNumbering,
      addForm,
      saveForm,
      deleteForm,
      addCategory,
      updateCategory,
      setCategoryActive,
      saveSettings,
      exportedAudit,
      registerPatient,
      setDesk,
      deskUsers,
      toast,
      notify,
      resetDemo,
      loaded,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
