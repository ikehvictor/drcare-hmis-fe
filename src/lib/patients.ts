// Patients registered at the front desk (docs/ARCHITECTURE.md §5). The backend will issue numbers inside a
// transaction and check duplicates in the database; until then this file does both against the demo store.

import { render, type NumberingConfig } from "./numbering";
import type { FormField, FormSection } from "./forms";
import { EMAIL_RE } from "./access";

export interface PatientAnswer {
  key: string;
  label: string;
  value: string;
}

export interface Patient {
  id: string;
  number: string;
  /** The patient's old card number, when the hospital keeps them. */
  legacyNumber?: string;
  firstName: string;
  lastName: string;
  sex: string;
  /** YYYY-MM-DD. For an estimated age, 1 January of the estimated birth year. */
  dateOfBirth: string;
  dobEstimated: boolean;
  phone: string;
  categoryId: string;
  categoryName: string;
  formName: string;
  branchId: string;
  branchName: string;
  /** Every answer, as the form looked when the patient was registered. */
  sections: { title: string; answers: PatientAnswer[] }[];
  registeredAt: string;
  registeredBy: string;
}

/** The Medical Records options that change how the desk registers patients. */
export interface RecordsOptions {
  requirePhone: boolean;
  allowEstimatedAge: boolean;
  captureNextOfKin: boolean;
  duplicateCheck: boolean;
}

export const recordsOptions = (settings: Record<string, unknown> | undefined): RecordsOptions => ({
  requirePhone: settings?.requirePhone !== false,
  allowEstimatedAge: settings?.allowEstimatedAge !== false,
  captureNextOfKin: settings?.captureNextOfKin !== false,
  duplicateCheck: settings?.duplicateCheck !== false,
});

/* ---------- Patient numbers ---------- */

export interface NumberContext {
  branchId: string;
  branchCode: string;
  categoryId: string;
  categoryCode: string;
  date: Date;
}

/** Which counter a registration draws from: the scope (whole hospital, a branch or a category) and the period. */
export function counterKey(config: Pick<NumberingConfig, "scope" | "reset">, ctx: NumberContext) {
  const scope =
    config.scope === "branch"
      ? `branch:${ctx.branchId}`
      : config.scope === "category"
        ? `cat:${ctx.categoryId}`
        : "all";
  const y = ctx.date.getFullYear();
  const period =
    config.reset === "yearly"
      ? `${y}`
      : config.reset === "monthly"
        ? `${y}-${String(ctx.date.getMonth() + 1).padStart(2, "0")}`
        : "";
  return { scope, key: `${scope}|${period}` };
}

/**
 * The next patient number and the counters after issuing it. The starting number applies to a counter's first
 * period; after a reset it begins at 1. A number already on a patient is skipped, so numbers never repeat even if
 * the admin changes the format, scope or starting number later.
 */
export function issueNumber(
  config: NumberingConfig,
  counters: Record<string, number>,
  taken: Set<string>,
  ctx: NumberContext,
) {
  const { scope, key } = counterKey(config, ctx);
  const used = Object.keys(counters).some((k) => k.startsWith(`${scope}|`));
  let seq = counters[key] ?? (used ? 1 : config.startAt);
  const make = (n: number) =>
    render(config.template, {
      prefix: config.prefix,
      branchCode: ctx.branchCode,
      categoryCode: ctx.categoryCode,
      date: ctx.date,
      seq: n,
    });
  while (taken.has(make(seq).toUpperCase())) seq++;
  return { number: make(seq), counters: { ...counters, [key]: seq + 1 } };
}

/* ---------- Matching and search ---------- */

const normText = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Digits only, with +234 written the local way, so "+234 803 111 2222" and "0803-111-2222" match. */
export function normPhone(s: string) {
  const d = s.replace(/\D/g, "");
  return d.startsWith("234") && d.length > 3 ? `0${d.slice(3)}` : d;
}

/** Existing patients with the same name, date of birth and phone (docs/ARCHITECTURE.md §5.3). */
export function possibleMatches(
  patients: Patient[],
  p: Pick<Patient, "firstName" | "lastName" | "dateOfBirth" | "phone">,
) {
  const name = (x: typeof p) => `${normText(x.firstName)} ${normText(x.lastName)}`;
  return patients.filter(
    (x) => name(x) === name(p) && x.dateOfBirth === p.dateOfBirth && normPhone(x.phone) === normPhone(p.phone),
  );
}

export const fullName = (p: Pick<Patient, "firstName" | "lastName">) => `${p.firstName} ${p.lastName}`;

/** Patients matching a number, name, phone or (when kept) old card number. Exact number matches come first. */
export function searchPatients(patients: Patient[], query: string, includeLegacy: boolean) {
  const q = normText(query);
  if (!q) return [];
  const words = q.split(" ");
  const digits = q.replace(/\D/g, "");
  const scored = patients.flatMap((p) => {
    const number = p.number.toLowerCase();
    const legacy = includeLegacy ? (p.legacyNumber ?? "").toLowerCase() : "";
    const middle = p.sections.flatMap((s) => s.answers).find((a) => a.key === "middleName")?.value ?? "";
    const name = normText(`${p.firstName} ${middle} ${p.lastName}`);
    let score = 0;
    if (number === q || (legacy && legacy === q)) score = 3;
    else if (number.includes(q) || (legacy && legacy.includes(q))) score = 2;
    else if (words.every((w) => name.includes(w))) score = 1;
    else if (digits.length >= 4 && /^[\d\s+\-()]+$/.test(q) && normPhone(p.phone).includes(normPhone(digits)))
      score = 1;
    return score ? [{ p, score }] : [];
  });
  return scored.sort((a, b) => b.score - a.score || b.p.registeredAt.localeCompare(a.p.registeredAt)).map((x) => x.p);
}

/* ---------- Dates ---------- */

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function ageOn(dateOfBirth: string, today: Date) {
  const [y, m, d] = dateOfBirth.split("-").map(Number) as [number, number, number];
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}

/** "34 years", "7 months" or "12 days". */
export function ageLabel(dateOfBirth: string, today: Date) {
  const years = ageOn(dateOfBirth, today);
  if (years >= 1) return `${years} ${years === 1 ? "year" : "years"}`;
  const [y, m, d] = dateOfBirth.split("-").map(Number) as [number, number, number];
  const months = (today.getFullYear() - y) * 12 + today.getMonth() + 1 - m - (today.getDate() < d ? 1 : 0);
  if (months >= 1) return `${months} ${months === 1 ? "month" : "months"}`;
  const days = Math.max(0, Math.round((today.getTime() - new Date(y, m - 1, d).getTime()) / 86_400_000));
  return `${days} ${days === 1 ? "day" : "days"}`;
}

export function formatDob(dateOfBirth: string) {
  const [y, m, d] = dateOfBirth.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/* ---------- Validation ---------- */

export interface RegistrationDraft {
  values: Record<string, string>;
  /** Used instead of the date of birth when the patient doesn't know it. */
  useEstimatedAge: boolean;
  estimatedAge: string;
  legacyNumber: string;
}

const PHONE_RE = /^\+?[\d\s\-()]+$/;

/** Problems with a draft, keyed by field key ("estimatedAge" and "legacyNumber" included). */
export function validateRegistration(
  sections: FormSection[],
  draft: RegistrationDraft,
  options: RecordsOptions,
  today: Date,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const fields: FormField[] = sections.flatMap((s) => s.fields);
  for (const f of fields) {
    const v = (draft.values[f.key] ?? "").trim();
    if (f.key === "dateOfBirth" && options.allowEstimatedAge && draft.useEstimatedAge) {
      const age = draft.estimatedAge.trim();
      if (!age) errors.estimatedAge = "Enter an estimated age in years.";
      else if (!/^\d+$/.test(age) || Number(age) > 120)
        errors.estimatedAge = "Enter a whole number of years, 0 to 120.";
      continue;
    }
    if (!v) {
      if (f.required)
        errors[f.key] = `${f.type === "select" || f.type === "yesno" ? "Choose" : "Enter"} ${f.label.toLowerCase()}.`;
      continue;
    }
    if (f.type === "phone" && (!PHONE_RE.test(v) || v.replace(/\D/g, "").length < 7))
      errors[f.key] = "Enter a phone number with at least 7 digits.";
    if (f.type === "email" && !EMAIL_RE.test(v)) errors[f.key] = "Enter an email address like name@example.com.";
    if (f.type === "number" && !/^-?\d+(\.\d+)?$/.test(v)) errors[f.key] = "Enter a number.";
    if (f.type === "date" && v > isoDate(today)) errors[f.key] = `${f.label} can't be in the future.`;
    if (f.key === "dateOfBirth" && !errors[f.key] && ageOn(v, today) > 120)
      errors[f.key] = "Check the date of birth: that's over 120 years ago.";
  }
  if (draft.legacyNumber.trim().length > 30) errors.legacyNumber = "Keep the old card number under 30 characters.";
  return errors;
}

/** The date of birth to store: the one entered, or 1 January of the estimated birth year. */
export function dateOfBirthFor(draft: RegistrationDraft, options: RecordsOptions, today: Date) {
  if (options.allowEstimatedAge && draft.useEstimatedAge)
    return { dateOfBirth: `${today.getFullYear() - Number(draft.estimatedAge)}-01-01`, dobEstimated: true };
  return { dateOfBirth: (draft.values.dateOfBirth ?? "").trim(), dobEstimated: false };
}
