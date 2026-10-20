"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ActivityItem, Branch, Role, ServicePoint, Tenant, User, UserStatus } from "./types";
import { CURRENT_USER_ID, seedActivity, seedBranches, seedRoles, seedTenant, seedUsers } from "./mock-data";

// Front-end only: state lives in memory and is mirrored to localStorage so the
// demo survives a refresh. This is replaced by API calls once the backend exists.
const STORAGE_KEY = "drcare-admin-demo-v2";

interface State {
  tenant: Tenant;
  branches: Branch[];
  roles: Role[];
  users: User[];
  activity: ActivityItem[];
}

export type BranchInput = Pick<Branch, "name" | "code" | "address" | "city" | "state" | "phone" | "isMain">;
export type ServicePointInput = Pick<ServicePoint, "name" | "type" | "location">;
export type RoleInput = Pick<Role, "name" | "description" | "permissions">;
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
