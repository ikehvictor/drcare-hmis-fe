import type { AuditChange, AuditEntry } from "./types";

/** How a value reads in the audit log. */
export function show(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return Number.isFinite(v) ? v.toLocaleString("en-GB") : "—";
  if (Array.isArray(v)) return v.length ? v.map(show).join(", ") : "None";
  return String(v);
}

/** Changes between two objects, for the fields named in `labels`, in that order. */
export function diff<T extends object>(
  before: T | undefined,
  after: T,
  labels: Partial<Record<keyof T, string>>,
  format: Partial<Record<keyof T, (v: unknown) => string>> = {},
): AuditChange[] {
  const out: AuditChange[] = [];
  for (const key of Object.keys(labels) as (keyof T)[]) {
    const f = format[key] ?? show;
    const b = f(before?.[key]);
    const a = f(after[key]);
    if (b !== a) out.push({ field: labels[key]!, before: b, after: a });
  }
  return out;
}

/** What was added to and removed from a list, as two changes. */
export function listDiff(label: string, before: string[], after: string[]): AuditChange[] {
  const added = after.filter((x) => !before.includes(x));
  const removed = before.filter((x) => !after.includes(x));
  const out: AuditChange[] = [];
  if (added.length) out.push({ field: `${label} added`, before: "—", after: added.join(", ") });
  if (removed.length) out.push({ field: `${label} removed`, before: removed.join(", "), after: "—" });
  return out;
}

function csvCell(value: string) {
  // Text staff typed could start with = + - @ and run as a formula in a spreadsheet, so mark it as text.
  const v = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** The entries as CSV, one row per change (an entry with no changes still gets one row). */
export function toCsv(entries: AuditEntry[]): string {
  const header = [
    "Time (UTC)",
    "Who",
    "Role",
    "Category",
    "What happened",
    "Where",
    "Via",
    "Sensitive",
    "Field",
    "Before",
    "After",
  ];
  const rows = entries.flatMap((e) => {
    const base = [
      e.at,
      e.actor,
      e.actorRole,
      e.category,
      `${e.actor} ${e.action}`,
      e.where,
      e.via,
      e.sensitive ? "Yes" : "No",
    ];
    return e.changes?.length ? e.changes.map((c) => [...base, c.field, c.before, c.after]) : [[...base, "", "", ""]];
  });
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}

/** "Today", "Yesterday" or a date, for grouping entries by day in the browser's time zone. */
export function dayLabel(iso: string, now: Date) {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
