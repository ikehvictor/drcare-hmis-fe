"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ActivityItem, Branch, ServicePoint, Tenant } from "./types";
import { seedActivity, seedBranches, seedTenant } from "./mock-data";

// Front-end only: state lives in memory and is mirrored to localStorage so the
// demo survives a refresh. This is replaced by API calls once the backend exists.
const STORAGE_KEY = "drcare-admin-demo-v1";

interface State {
  tenant: Tenant;
  branches: Branch[];
  activity: ActivityItem[];
}

export type BranchInput = Pick<Branch, "name" | "code" | "address" | "city" | "state" | "phone" | "isMain">;
export type ServicePointInput = Pick<ServicePoint, "name" | "type" | "location">;

interface Store extends State {
  addBranch: (input: BranchInput) => Branch;
  updateBranch: (id: string, input: BranchInput) => void;
  setBranchActive: (id: string, active: boolean) => void;
  addServicePoint: (branchId: string, input: ServicePointInput) => void;
  updateServicePoint: (branchId: string, pointId: string, input: ServicePointInput) => void;
  setServicePointActive: (branchId: string, pointId: string, active: boolean) => void;
  resetDemo: () => void;
}

const StoreContext = createContext<Store | null>(null);

const initialState = (): State => ({
  tenant: seedTenant,
  branches: seedBranches,
  activity: seedActivity,
});

const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
const ACTOR = "Ada Okafor";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from browser storage
      if (raw) setState(JSON.parse(raw));
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

  const log = (s: State, action: string): ActivityItem[] => [
    { id: newId("act"), actor: ACTOR, action, at: new Date().toISOString() },
    ...s.activity,
  ].slice(0, 30);

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
        b.id === id
          ? { ...b, ...input, code: input.code.toUpperCase() }
          : input.isMain
            ? { ...b, isMain: false }
            : b,
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
      resetDemo,
    }),
    [state, addBranch, updateBranch, setBranchActive, addServicePoint, updateServicePoint, setServicePointActive, resetDemo],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
