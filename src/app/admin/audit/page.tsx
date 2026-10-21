"use client";

import clsx from "clsx";
import { ChevronDown, Download, Lock, Search, ShieldAlert, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Input, PageHeader, Select } from "@/components/ui";
import { initials } from "@/lib/access";
import { dayLabel, toCsv } from "@/lib/audit";
import { moduleById } from "@/lib/modules";
import { useStore } from "@/lib/store";
import { AUDIT_CATEGORIES, type AuditEntry } from "@/lib/types";

const PAGE = 25;

interface Filters {
  query: string;
  category: string;
  actor: string;
  from: string;
  to: string;
  sensitiveOnly: boolean;
}

const NO_FILTERS: Filters = { query: "", category: "", actor: "", from: "", to: "", sensitiveOnly: false };

/** YYYY-MM-DD for a date in the browser's time zone, to compare with date inputs. */
const localDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function matches(e: AuditEntry, f: Filters) {
  if (f.category && e.category !== f.category) return false;
  if (f.actor && e.actor !== f.actor) return false;
  if (f.sensitiveOnly && !e.sensitive) return false;
  const day = localDay(e.at);
  if (f.from && day < f.from) return false;
  if (f.to && day > f.to) return false;
  const q = f.query.trim().toLowerCase();
  if (!q) return true;
  return [
    e.actor,
    e.action,
    e.where,
    e.via,
    e.target?.name ?? "",
    ...(e.changes ?? []).flatMap((c) => [c.field, c.before, c.after]),
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export default function AuditLogPage() {
  const { audit, ready } = useStore();
  if (!ready) return null;
  return <AuditLog entries={audit} />;
}

function AuditLog({ entries }: { entries: AuditEntry[] }) {
  const { branches, users, roles, forms, patients, exportedAudit, notify } = useStore();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [now, setNow] = useState<Date | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- "Today" depends on the browser's clock
  useEffect(() => setNow(new Date()), []);

  const actors = useMemo(() => [...new Set(entries.map((e) => e.actor))].sort(), [entries]);
  const filtered = useMemo(() => entries.filter((e) => matches(e, filters)), [entries, filters]);
  const visible = filtered.slice(0, shown);
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setShown(PAGE);
  };

  const toggle = (id: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Links only to things that still exist; a deleted role or form keeps its name in the log.
  const hrefFor = (e: AuditEntry) => {
    const t = e.target;
    if (!t) return undefined;
    switch (t.type) {
      case "branch":
        return branches.some((b) => b.id === t.id) ? `/admin/branches/${t.id}` : undefined;
      case "user":
        return users.some((u) => u.id === t.id) ? `/admin/users/${t.id}` : undefined;
      case "role":
        return roles.some((r) => r.id === t.id) ? `/admin/roles/${t.id}` : undefined;
      case "form":
        return forms.some((f) => f.id === t.id) ? `/admin/forms/${t.id}` : undefined;
      case "module":
        return moduleById(t.id)?.settings.length ? `/admin/modules/${t.id}` : "/admin/modules";
      case "category":
        return "/admin/forms";
      case "numbering":
        return "/admin/numbering";
      case "settings":
        return "/admin/settings";
      case "staff-category":
        return "/admin/staff";
      case "patient":
        return patients.some((p) => p.id === t.id) ? `/desk/patients/${t.id}` : undefined;
    }
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${localDay(new Date().toISOString())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    exportedAudit(filtered.length, isFiltered);
    notify(`Exported ${filtered.length} ${filtered.length === 1 ? "entry" : "entries"}`);
  };

  // Group the visible entries by day, keeping newest first.
  const groups: { day: string; items: AuditEntry[] }[] = [];
  for (const e of visible) {
    const day = now ? dayLabel(e.at, now) : localDay(e.at);
    const last = groups.at(-1);
    if (last?.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  }

  return (
    <>
      <PageHeader
        title="Audit log"
        description={
          <>
            Every change to your hospital&apos;s setup and every sign-in: who, what, when and where, with the values
            before and after.{" "}
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Lock className="size-3.5" aria-hidden /> Entries can&apos;t be edited or deleted, by anyone.
            </span>
          </>
        }
        actions={
          <Button variant="secondary" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="size-4" /> Export CSV
          </Button>
        }
      />

      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative sm:col-span-2">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            aria-label="Search the audit log"
            placeholder="Search names, changes, places"
            value={filters.query}
            onChange={(e) => set("query", e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          aria-label="Filter by category"
          value={filters.category}
          onChange={(e) => set("category", e.target.value)}
        >
          <option value="">All categories</option>
          {AUDIT_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <Select aria-label="Filter by person" value={filters.actor} onChange={(e) => set("actor", e.target.value)}>
          <option value="">Everyone</option>
          {actors.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </Select>
        <Input
          type="date"
          aria-label="From date"
          value={filters.from}
          max={filters.to || undefined}
          onChange={(e) => set("from", e.target.value)}
        />
        <Input
          type="date"
          aria-label="To date"
          value={filters.to}
          min={filters.from || undefined}
          onChange={(e) => set("to", e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:col-span-2 lg:col-span-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.sensitiveOnly}
              onChange={(e) => set("sensitiveOnly", e.target.checked)}
              className="size-4 accent-teal"
            />
            Only sensitive actions
          </label>
          {isFiltered && (
            <button
              type="button"
              onClick={() => {
                setFilters(NO_FILTERS);
                setShown(PAGE);
              }}
              className="flex items-center gap-1 text-sm font-medium text-teal hover:underline"
            >
              <X className="size-3.5" aria-hidden /> Clear filters
            </button>
          )}
          <p className="text-sm text-muted sm:ml-auto" data-testid="audit-count" aria-live="polite">
            {isFiltered ? `${filtered.length} of ${entries.length} entries` : `${entries.length} entries`}
          </p>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Search className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-medium">Nothing matches these filters</p>
          <p className="text-sm text-muted">Try a wider date range or clear the filters.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.day} aria-label={g.day}>
              <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">{g.day}</h2>
              <Card>
                <ol aria-label={`Entries for ${g.day}`}>
                  {g.items.map((e) => {
                    const href = hrefFor(e);
                    const expanded = open.has(e.id);
                    const n = e.changes?.length ?? 0;
                    return (
                      <li
                        key={e.id}
                        className="border-b border-line px-4 py-3 last:border-b-0"
                        data-testid="audit-entry"
                      >
                        <div className="flex gap-3">
                          <span
                            className={clsx(
                              "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                              e.actorRole === "Dr. Care staff" ? "bg-navy text-cyan" : "bg-teal-soft text-teal-dark",
                            )}
                            aria-hidden
                          >
                            {e.actor === "Someone" ? "?" : initials(e.actor)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                              <p className="text-sm">
                                <span className="font-medium">{e.actor}</span> {e.action}
                              </p>
                              <time dateTime={e.at} className="shrink-0 text-xs text-muted tabular-nums">
                                {new Date(e.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                              </time>
                            </div>
                            <p className="mt-0.5 text-xs text-muted">
                              {e.actorRole} · {e.where} · {e.via}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <Badge>{e.category}</Badge>
                              {e.sensitive && (
                                <Badge tone="warning">
                                  <ShieldAlert className="size-3" aria-hidden /> Sensitive
                                </Badge>
                              )}
                              {href && (
                                <Link href={href} className="text-xs font-medium text-teal hover:underline">
                                  Open {e.target?.name}
                                </Link>
                              )}
                              {n > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggle(e.id)}
                                  aria-expanded={expanded}
                                  aria-controls={`changes-${e.id}`}
                                  className="ml-auto flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
                                >
                                  {expanded ? "Hide" : "Show"} {n} {n === 1 ? "change" : "changes"}
                                  <ChevronDown
                                    className={clsx("size-3.5 transition-transform", expanded && "rotate-180")}
                                    aria-hidden
                                  />
                                </button>
                              )}
                            </div>
                            {expanded && n > 0 && (
                              <div id={`changes-${e.id}`} className="mt-3 overflow-x-auto rounded-lg ring-1 ring-line">
                                <table className="w-full text-xs" aria-label="Changes">
                                  <thead className="bg-background text-left text-muted">
                                    <tr>
                                      <th className="px-3 py-2 font-medium">Field</th>
                                      <th className="px-3 py-2 font-medium">Before</th>
                                      <th className="px-3 py-2 font-medium">After</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-line">
                                    {e.changes!.map((c) => (
                                      <tr key={c.field}>
                                        <td className="px-3 py-2 font-medium">{c.field}</td>
                                        <td className="px-3 py-2 break-words text-muted">{c.before}</td>
                                        <td className="px-3 py-2 break-words">{c.after}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </Card>
            </section>
          ))}
          {filtered.length > shown && (
            <div className="text-center">
              <Button variant="secondary" onClick={() => setShown((n) => n + PAGE)}>
                Show {Math.min(PAGE, filtered.length - shown)} more
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
