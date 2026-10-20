import type { ActivityItem, Branch, Tenant } from "./types";

export const seedTenant: Tenant = {
  name: "Lakeside Specialist Hospital",
  plan: "Growth",
  branchLimit: 3,
  userLimit: 40,
  entitledModules: ["Medical Records", "Cash Point"],
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
  { id: "act_3", actor: "Ada Okafor", action: "added service point Consulting Room A to Lekki Annex Clinic", at: "2026-10-17T14:12:00.000Z" },
  { id: "act_2", actor: "Ada Okafor", action: "created branch Lekki Annex Clinic (LKA)", at: "2026-09-20T09:00:00.000Z" },
  { id: "act_1", actor: "Dr. Care Platform", action: "onboarded Lakeside Specialist Hospital on the Growth plan", at: "2026-09-02T09:00:00.000Z" },
];
