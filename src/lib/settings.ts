// Hospital settings. Some can be overridden per branch (docs/ARCHITECTURE.md §2, "Rule of inheritance":
// platform default → hospital → branch). Sensitive actions can require a second approver (§7).

export type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
export type TwoFactor = "off" | "admins" | "everyone";

export interface HospitalProfile {
  displayName: string;
  shortName: string;
  email: string;
  phone: string;
  address: string;
  /** Uploaded logo as a data URL; front-end only until file storage exists. */
  logo?: string;
  country: string;
  currency: string;
  timezone: string;
  dateFormat: DateFormat;
}

export interface SecuritySettings {
  sessionTimeoutMinutes: number;
  pinSwitch: boolean;
  twoFactor: TwoFactor;
  passwordMinLength: number;
}

/** Settings a branch may set differently from the hospital. Missing = use the hospital setting. */
export type BranchOverride = Partial<Pick<SecuritySettings, "sessionTimeoutMinutes" | "pinSwitch">>;

export interface ApprovalRule {
  required: boolean;
  approverRoleId: string;
}

export interface HospitalSettings {
  profile: HospitalProfile;
  security: SecuritySettings;
  /** Keyed by sensitive permission key. */
  approvals: Record<string, ApprovalRule>;
  branchOverrides: Record<string, BranchOverride>;
}

export const SESSION_TIMEOUTS = [5, 10, 15, 30, 60, 120];
export const DATE_FORMATS: DateFormat[] = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];
export const MAX_LOGO_BYTES = 300 * 1024;

export const timeoutLabel = (m: number) => (m < 60 ? `${m} minutes` : m === 60 ? "1 hour" : `${m / 60} hours`);
