// Patient number templates (docs/ARCHITECTURE.md §5.2). The backend will issue the real numbers inside a
// transaction; this file only checks a template and previews what it produces.

export type SequenceScope = "hospital" | "branch" | "category";
export type ResetRule = "never" | "yearly" | "monthly";

export interface NumberingConfig {
  template: string;
  prefix: string;
  scope: SequenceScope;
  reset: ResetRule;
  startAt: number;
  keepLegacyNumber: boolean;
  /** False until the admin first saves a format. */
  configured: boolean;
  updatedAt?: string;
}

/** Only the parts of a patient category numbering needs; categories are edited with registration forms. */
export interface CategoryCode {
  code: string;
  name: string;
}

export const TOKENS = [
  { token: "{PREFIX}", label: "Prefix", help: "Your fixed text" },
  { token: "{BR}", label: "Branch code", help: "e.g. LKS" },
  { token: "{YYYY}", label: "Year", help: "e.g. 2026" },
  { token: "{YY}", label: "Short year", help: "e.g. 26" },
  { token: "{MM}", label: "Month", help: "e.g. 10" },
  { token: "{CAT}", label: "Category", help: "e.g. ANC" },
  { token: "{SEQ:6}", label: "Running number", help: "6 digits, e.g. 000123" },
] as const;

export const PRESETS = [
  { label: "Prefix / number", template: "{PREFIX}/{SEQ:6}" },
  { label: "Branch, year, number", template: "{BR}-{YY}-{SEQ:5}" },
  { label: "Number / year (paper style)", template: "{SEQ:4}/{YY}" },
] as const;

const TOKEN_RE = /\{([A-Z]+)(?::(\d+))?\}/g;
const KNOWN = new Set(["PREFIX", "BR", "YYYY", "YY", "MM", "CAT", "SEQ"]);

interface Parsed {
  names: string[];
  seqDigits?: number;
  literal: string;
}

function parse(template: string): Parsed {
  const names: string[] = [];
  let seqDigits: number | undefined;
  for (const m of template.matchAll(TOKEN_RE)) {
    names.push(m[1]!);
    if (m[1] === "SEQ" && m[2]) seqDigits = Number(m[2]);
  }
  return { names, seqDigits, literal: template.replace(TOKEN_RE, "") };
}

/** Problems that would make numbers ambiguous or impossible. Empty means the format is safe to use. */
export function validate(
  config: Pick<NumberingConfig, "template" | "prefix" | "scope" | "reset" | "startAt">,
): string[] {
  const { template, prefix, scope, reset, startAt } = config;
  const errors: string[] = [];
  const p = parse(template);
  const has = (n: string) => p.names.includes(n);

  if (!template.trim()) return ["Enter a format."];
  if (template.length > 30) errors.push("Keep the format under 30 characters so it fits on cards and labels.");

  const unknown = [...new Set(p.names.filter((n) => !KNOWN.has(n)))];
  if (unknown.length)
    errors.push(`Unknown ${unknown.length === 1 ? "token" : "tokens"}: ${unknown.map((u) => `{${u}}`).join(", ")}.`);
  if (/[{}]/.test(p.literal)) errors.push("A token is missing a brace. Tokens look like {YY}.");
  else if (/[^A-Za-z0-9/\-._]/.test(p.literal))
    errors.push("Between tokens, use only letters, numbers and / - . _ (no spaces).");

  const seqCount = p.names.filter((n) => n === "SEQ").length;
  if (seqCount === 0) errors.push("Add a running number, e.g. {SEQ:6}. Without it every patient gets the same number.");
  if (seqCount > 1) errors.push("Use the running number only once.");
  if (seqCount === 1 && (p.seqDigits === undefined || p.seqDigits < 3 || p.seqDigits > 9))
    errors.push("The running number needs 3 to 9 digits, e.g. {SEQ:6}.");

  if (has("PREFIX") && !prefix.trim()) errors.push("Enter the prefix text, or remove {PREFIX}.");
  if (scope === "branch" && !has("BR"))
    errors.push("Each branch counts on its own, so add {BR}. Otherwise two branches would issue the same number.");
  if (scope === "category" && !has("CAT"))
    errors.push("Each category counts on its own, so add {CAT}. Otherwise two categories would issue the same number.");
  if (reset === "yearly" && !has("YY") && !has("YYYY"))
    errors.push("Numbers restart every year, so add {YY} or {YYYY}. Otherwise next year repeats this year's numbers.");
  if (reset === "monthly" && (!has("MM") || (!has("YY") && !has("YYYY"))))
    errors.push("Numbers restart every month, so add {MM} and a year. Otherwise months would repeat numbers.");

  if (!Number.isInteger(startAt) || startAt < 1)
    errors.push("The starting number must be a whole number of 1 or more.");
  else if (p.seqDigits && String(startAt).length > p.seqDigits)
    errors.push(`The starting number has more digits than {SEQ:${p.seqDigits}} allows.`);

  return errors;
}

export function render(
  template: string,
  ctx: { prefix: string; branchCode: string; categoryCode: string; date: Date; seq: number },
) {
  return template.replace(TOKEN_RE, (_, name: string, digits?: string) => {
    switch (name) {
      case "PREFIX":
        return ctx.prefix.toUpperCase();
      case "BR":
        return ctx.branchCode;
      case "YYYY":
        return String(ctx.date.getFullYear());
      case "YY":
        return String(ctx.date.getFullYear()).slice(-2);
      case "MM":
        return String(ctx.date.getMonth() + 1).padStart(2, "0");
      case "CAT":
        return ctx.categoryCode;
      case "SEQ":
        return String(ctx.seq).padStart(Number(digits ?? 1), "0");
      default:
        return `{${name}}`;
    }
  });
}

export const seqDigits = (template: string) => parse(template).seqDigits;

export interface SampleRegistration {
  label: string;
  branchCode: string;
  branchName: string;
  category: CategoryCode;
  date: Date;
  number: string;
}

/**
 * Walks a few registrations through the counter rules so admins can see how scope and reset behave:
 * three patients today across branches and categories, then the first patient after the next reset.
 */
export function sampleRegistrations(
  config: NumberingConfig,
  branches: { code: string; name: string }[],
  categories: CategoryCode[],
  today: Date,
): SampleRegistration[] {
  const main = branches[0] ?? { code: "MAIN", name: "Main branch" };
  const other = branches[1] ?? main;
  const fallback = { code: "GEN", name: "General" };
  const [gen, chd, anc] = [
    categories[0] ?? fallback,
    categories[1] ?? categories[0] ?? fallback,
    categories[2] ?? categories[0] ?? fallback,
  ];
  const counters = new Map<string, number>();

  const next = (branchCode: string, cat: string, date: Date, afterReset: boolean) => {
    const scopeKey = config.scope === "branch" ? branchCode : config.scope === "category" ? cat : "all";
    const period =
      config.reset === "yearly"
        ? `${date.getFullYear()}`
        : config.reset === "monthly"
          ? `${date.getFullYear()}-${date.getMonth()}`
          : "";
    const key = `${scopeKey}|${period}`;
    // The starting number only applies to the first period; later periods restart at 1.
    const first = afterReset ? 1 : config.startAt;
    const value = counters.get(key) ?? first;
    counters.set(key, value + 1);
    return value;
  };

  const rows: SampleRegistration[] = [];
  const add = (label: string, b: typeof main, cat: CategoryCode, date: Date, afterReset = false) =>
    rows.push({
      label,
      branchCode: b.code,
      branchName: b.name,
      category: cat,
      date,
      number: render(config.template, {
        prefix: config.prefix,
        branchCode: b.code,
        categoryCode: cat.code,
        date,
        seq: next(b.code, cat.code, date, afterReset),
      }),
    });

  add("1st patient today", main, gen, today);
  add("2nd patient today", other, anc, today);
  add("3rd patient today", main, chd, today);

  if (config.reset !== "never") {
    const later =
      config.reset === "yearly"
        ? new Date(today.getFullYear() + 1, 0, 2)
        : new Date(today.getFullYear(), today.getMonth() + 1, 1);
    add(config.reset === "yearly" ? "First patient next year" : "First patient next month", main, gen, later, true);
  }
  return rows;
}
