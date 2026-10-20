"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ActivityItem, Branch, ModuleState, Role, ServicePoint, Tenant, User, UserStatus } from "./types";
import {
  CURRENT_USER_ID,
  seedActivity,
  seedBranches,
  seedCategories,
  seedForms,
  seedModules,
  seedNumbering,
  seedRoles,
  seedSettings,
  seedTenant,
  seedUsers,
} from "./mock-data";
import { moduleById, type SettingValue } from "./modules";
import type { NumberingConfig } from "./numbering";
import { CORE_FIELDS, type PatientCategory, type RegistrationForm } from "./forms";
import type { HospitalSettings } from "./settings";

// Front-end only: state lives in memory and is mirrored to localStorage so the
// demo survives a refresh. This is replaced by API calls once the backend exists.
const STORAGE_KEY = "drcare-admin-demo-v4";

interface State {
  tenant: Tenant;
  branches: Branch[];
  roles: Role[];
  users: User[];
  modules: Record<string, ModuleState>;
  /** Modules the hospital has asked Dr. Care to add to its plan. */
  moduleRequests: string[];
  numbering: NumberingConfig;
  forms: RegistrationForm[];
  categories: PatientCategory[];
  settings: HospitalSettings;
  activity: ActivityItem[];
}

export type BranchInput = Pick<Branch, "name" | "code" | "address" | "city" | "state" | "phone" | "isMain">;
export type ServicePointInput = Pick<ServicePoint, "name" | "type" | "location">;
export type RoleInput = Pick<Role, "name" | "description" | "permissions">;
export type CategoryInput = Pick<PatientCategory, "code" | "name" | "formId">;
export type UserInput = Pick<User, "name" | "email" | "phone" | "jobTitle" | "roleIds" | "branchScope">;

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
  inviteUser: (input: UserInput) => User;
  updateUser: (id: string, input: UserInput) => void;
  setUserStatus: (id: string, status: UserStatus) => void;
  resendInvite: (id: string) => void;
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
  /** Saves one part of the settings; `what` names it in the activity log. */
  saveSettings: (patch: Partial<HospitalSettings>, what: string) => void;
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
  modules: seedModules,
  moduleRequests: [],
  numbering: seedNumbering,
  forms: seedForms,
  categories: seedCategories,
  settings: seedSettings,
  activity: seedActivity,
});

const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
const ACTOR = "Ada Okafor";

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

  const log = (s: State, action: string): ActivityItem[] =>
    [{ id: newId("act"), actor: ACTOR, action, at: new Date().toISOString() }, ...s.activity].slice(0, 30);

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
      activity: log(s, `created branch ${branch.name} (${branch.code})`),
    }));
    return branch;
  }, []);

  const updateBranch = useCallback((id: string, input: BranchInput) => {
    setState((s) => ({
      ...s,
      branches: s.branches.map((b) =>
        b.id === id ? { ...b, ...input, code: input.code.toUpperCase() } : input.isMain ? { ...b, isMain: false } : b,
      ),
      activity: log(s, `updated branch ${input.name}`),
    }));
  }, []);

  const setBranchActive = useCallback((id: string, active: boolean) => {
    setState((s) => {
      const b = s.branches.find((x) => x.id === id);
      return {
        ...s,
        branches: s.branches.map((x) => (x.id === id ? { ...x, active } : x)),
        activity: log(s, `${active ? "reactivated" : "deactivated"} branch ${b?.name ?? ""}`),
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
        activity: log(s, `added service point ${input.name} to ${branch?.name ?? "branch"}`),
      };
    });
  }, []);

  const updateServicePoint = useCallback((branchId: string, pointId: string, input: ServicePointInput) => {
    setState((s) => ({
      ...s,
      branches: mapBranch(s, branchId, (b) => ({
        ...b,
        servicePoints: b.servicePoints.map((p) => (p.id === pointId ? { ...p, ...input } : p)),
      })),
      activity: log(s, `updated service point ${input.name}`),
    }));
  }, []);

  const setServicePointActive = useCallback((branchId: string, pointId: string, active: boolean) => {
    setState((s) => {
      const point = s.branches.find((b) => b.id === branchId)?.servicePoints.find((p) => p.id === pointId);
      return {
        ...s,
        branches: mapBranch(s, branchId, (b) => ({
          ...b,
          servicePoints: b.servicePoints.map((p) => (p.id === pointId ? { ...p, active } : p)),
        })),
        activity: log(s, `${active ? "opened" : "closed"} service point ${point?.name ?? ""}`),
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
    setState((s) => ({ ...s, roles: [...s.roles, role], activity: log(s, `created role ${role.name}`) }));
    return role;
  }, []);

  const updateRole = useCallback((id: string, input: RoleInput) => {
    setState((s) => ({
      ...s,
      roles: s.roles.map((r) => (r.id === id && !r.locked ? { ...r, ...input } : r)),
      activity: log(s, `updated role ${input.name}`),
    }));
  }, []);

  const deleteRole = useCallback((id: string) => {
    setState((s) => {
      const role = s.roles.find((r) => r.id === id);
      // A role in use or the locked Super Admin role is never removed.
      if (!role || role.locked || s.users.some((u) => u.roleIds.includes(id))) return s;
      return { ...s, roles: s.roles.filter((r) => r.id !== id), activity: log(s, `deleted role ${role.name}`) };
    });
  }, []);

  const inviteUser = useCallback((input: UserInput) => {
    const user: User = { ...input, id: newId("usr"), status: "invited", createdAt: new Date().toISOString() };
    setState((s) => ({ ...s, users: [...s.users, user], activity: log(s, `invited ${user.name} (${user.email})`) }));
    return user;
  }, []);

  const updateUser = useCallback((id: string, input: UserInput) => {
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === id ? { ...u, ...input } : u)),
      activity: log(s, `updated ${input.name}'s account`),
    }));
  }, []);

  const setUserStatus = useCallback((id: string, status: UserStatus) => {
    if (id === CURRENT_USER_ID) return;
    setState((s) => {
      const u = s.users.find((x) => x.id === id);
      const verb = status === "suspended" ? "suspended" : "reactivated";
      return {
        ...s,
        users: s.users.map((x) => (x.id === id ? { ...x, status } : x)),
        activity: log(s, `${verb} ${u?.name ?? "a user"}`),
      };
    });
  }, []);

  const resendInvite = useCallback((id: string) => {
    setState((s) => {
      const u = s.users.find((x) => x.id === id);
      return { ...s, activity: log(s, `resent the invitation to ${u?.name ?? "a user"}`) };
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
        activity: log(s, `switched ${enabled ? "on" : "off"} ${names}`),
      };
    });
  }, []);

  const updateModuleSettings = useCallback((id: string, settings: Record<string, SettingValue>) => {
    setState((s) =>
      s.modules[id]
        ? {
            ...s,
            modules: { ...s.modules, [id]: { ...s.modules[id], settings } },
            activity: log(s, `changed ${moduleById(id)?.name ?? id} options`),
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
            activity: log(s, `asked Dr. Care to add ${moduleById(id)?.name ?? id}`),
          },
    );
  }, []);

  const saveNumbering = useCallback((config: Omit<NumberingConfig, "configured" | "updatedAt">) => {
    setState((s) => ({
      ...s,
      numbering: { ...config, configured: true, updatedAt: new Date().toISOString() },
      activity: log(s, `set the patient number format to ${config.template}`),
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
    setState((s) => ({ ...s, forms: [...s.forms, form], activity: log(s, `created the ${name} form`) }));
    return form;
  }, []);

  const saveForm = useCallback((form: RegistrationForm) => {
    setState((s) => ({
      ...s,
      forms: s.forms.map((f) => (f.id === form.id ? { ...form, updatedAt: new Date().toISOString() } : f)),
      activity: log(s, `updated the ${form.name} form`),
    }));
  }, []);

  const deleteForm = useCallback((id: string) => {
    setState((s) => {
      const form = s.forms.find((f) => f.id === id);
      if (!form || s.categories.some((c) => c.formId === id)) return s;
      return { ...s, forms: s.forms.filter((f) => f.id !== id), activity: log(s, `deleted the ${form.name} form`) };
    });
  }, []);

  const addCategory = useCallback((input: CategoryInput) => {
    setState((s) => ({
      ...s,
      categories: [...s.categories, { ...input, id: newId("cat"), active: true }],
      activity: log(s, `added patient category ${input.name} (${input.code})`),
    }));
  }, []);

  const updateCategory = useCallback((id: string, input: CategoryInput) => {
    setState((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...input } : c)),
      activity: log(s, `updated patient category ${input.name}`),
    }));
  }, []);

  const setCategoryActive = useCallback((id: string, active: boolean) => {
    setState((s) => {
      const c = s.categories.find((x) => x.id === id);
      return {
        ...s,
        categories: s.categories.map((x) => (x.id === id ? { ...x, active } : x)),
        activity: log(s, `${active ? "reactivated" : "deactivated"} patient category ${c?.name ?? ""}`),
      };
    });
  }, []);

  const saveSettings = useCallback((patch: Partial<HospitalSettings>, what: string) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch }, activity: log(s, `changed ${what}`) }));
  }, []);

  const resetDemo = useCallback(() => setState(initialState()), []);

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
      inviteUser,
      updateUser,
      setUserStatus,
      resendInvite,
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
      inviteUser,
      updateUser,
      setUserStatus,
      resendInvite,
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
