"use client";

import clsx from "clsx";
import { ArrowRight, Building2, CheckCircle2, Circle, DoorOpen, Puzzle, Users } from "lucide-react";
import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui";
import { moduleById } from "@/lib/modules";
import { useStore } from "@/lib/store";
import { RelativeTime } from "@/components/relative-time";

export default function OverviewPage() {
  const { tenant, settings, branches, users, roles, audit, isModuleOn, numbering } = useStore();
  const switchable = tenant.entitledModules.filter((id) => !moduleById(id)?.core);
  const modulesOn = switchable.filter(isModuleOn);
  const seats = users.filter((u) => u.status !== "suspended").length;
  const staffRolesInUse = roles.some((r) => !r.locked && users.some((u) => u.roleIds.includes(r.id)));
  const activeBranches = branches.filter((b) => b.active);
  const points = activeBranches.flatMap((b) => b.servicePoints);
  const openPoints = points.filter((p) => p.active);

  const stats = [
    {
      label: "Active branches",
      value: activeBranches.length,
      sub: `of ${tenant.branchLimit} on your plan`,
      icon: Building2,
    },
    {
      label: "Service points open",
      value: openPoints.length,
      sub: `${points.length - openPoints.length} closed`,
      icon: DoorOpen,
    },
    { label: "Staff accounts", value: seats, sub: `of ${tenant.userLimit} on your plan`, icon: Users },
    {
      label: "Modules on",
      value: modulesOn.length,
      sub: `of ${switchable.length} on your plan`,
      icon: Puzzle,
    },
  ];

  const steps = [
    { label: "Hospital onboarded by Dr. Care", done: true },
    {
      label: "Set up branches and service points",
      done: activeBranches.length > 0 && activeBranches.every((b) => b.servicePoints.some((p) => p.active)),
      href: "/admin/branches",
    },
    { label: "Create staff accounts", done: users.length > 1, href: "/admin/users" },
    { label: "Create roles and assign permissions", done: staffRolesInUse, href: "/admin/roles" },
    {
      label: "Switch on Medical Records and Cash Point",
      done: isModuleOn("medical-records") && isModuleOn("cash-point"),
      href: "/admin/modules",
    },
    { label: "Choose your patient number format", done: numbering.configured, href: "/admin/numbering" },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <>
      <PageHeader
        title="Good morning, Ada"
        description={`Here's where ${settings.profile.displayName} stands. Finish the setup steps and your front desk can start registering patients.`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">{s.label}</span>
              <s.icon className="size-4 text-teal" aria-hidden />
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tabular-nums">{s.value}</div>
            <div className="mt-1 truncate text-xs text-muted">{s.sub}</div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Setup checklist</h2>
            <span className="text-sm text-muted tabular-nums">
              {doneCount} of {steps.length} done
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-background" aria-hidden>
            <div className="h-full rounded-full bg-teal" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
          </div>
          <ol className="mt-4 divide-y divide-line" aria-label="Setup steps">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-3 py-3">
                {s.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-success" aria-label="Done" />
                ) : (
                  <Circle className="size-5 shrink-0 text-slate-300" aria-label="Not done" />
                )}
                <span className={clsx("flex-1 text-sm", s.done && "text-muted line-through")}>{s.label}</span>
                {!s.done && s.href && (
                  <Link href={s.href} className="flex items-center gap-1 text-sm font-medium text-teal hover:underline">
                    Start <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent activity</h2>
            <Link href="/admin/audit" className="text-sm font-medium text-teal hover:underline">
              Audit log
            </Link>
          </div>
          <ul className="mt-3 space-y-4">
            {/* Changes only; sign-ins live in the full audit log. */}
            {audit
              .filter((a) => a.category !== "Sign-in")
              .slice(0, 6)
              .map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-cyan" aria-hidden />
                  <div className="min-w-0 text-sm">
                    <p>
                      <span className="font-medium">{a.actor}</span> {a.action}
                    </p>
                    <p className="text-xs text-muted">
                      <RelativeTime iso={a.at} />
                    </p>
                  </div>
                </li>
              ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Your branches</h2>
          <Link href="/admin/branches" className="text-sm font-medium text-teal hover:underline">
            Manage
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <Link
              key={b.id}
              href={`/admin/branches/${b.id}`}
              className="rounded-lg border border-line p-4 transition-colors hover:border-teal/40 hover:bg-teal-soft/40"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{b.name}</span>
                {b.isMain && <Badge tone="brand">Main</Badge>}
                {!b.active && <Badge tone="danger">Inactive</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted">
                {b.city}, {b.state}
              </p>
              <p className="mt-2 text-xs text-muted">
                {b.servicePoints.filter((p) => p.active).length} of {b.servicePoints.length} service points open
              </p>
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}
