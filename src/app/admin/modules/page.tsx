"use client";

import clsx from "clsx";
import { Check, ChevronRight, Lock, Settings2 } from "lucide-react";
import Link from "next/link";
import { useModuleToggle } from "@/components/module-toggle";
import { Badge, Button, Card, PageHeader, Switch } from "@/components/ui";
import { moduleById, MODULES, type ModuleManifest } from "@/lib/modules";
import { PERMISSION_CATALOGUE } from "@/lib/permissions";
import { useStore } from "@/lib/store";

export default function ModulesPage() {
  const { tenant, modules, moduleRequests, isModuleOn, requestModule, notify } = useStore();
  const { request, dialog } = useModuleToggle();

  const entitled = MODULES.filter((m) => tenant.entitledModules.includes(m.id));
  const core = entitled.filter((m) => m.core);
  const switchable = entitled.filter((m) => !m.core);
  const locked = MODULES.filter((m) => !tenant.entitledModules.includes(m.id));

  return (
    <>
      <PageHeader
        title="Modules"
        description={`Each part of Dr. Care is a module. Switch on the ones your hospital uses; your ${tenant.plan} plan decides which are available.`}
      />

      <section aria-labelledby="mods-plan">
        <h2 id="mods-plan" className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">
          On your plan
        </h2>
        <ul className="grid gap-3 lg:grid-cols-2" aria-label="Modules on your plan">
          {[...core, ...switchable].map((m) => (
            <li key={m.id}>
              <ModuleCard
                module={m}
                on={isModuleOn(m.id)}
                onToggle={(v) => request(m.id, v)}
                hasOptions={!!modules[m.id]}
              />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="mods-locked" className="mt-8">
        <h2 id="mods-locked" className="text-xs font-semibold tracking-wider text-muted uppercase">
          Not on your plan
        </h2>
        <p className="mt-1 mb-3 text-sm text-muted">
          Ask Dr. Care to add any of these. Nothing changes until your plan is updated.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Modules not on your plan">
          {locked.map((m) => {
            const requested = moduleRequests.includes(m.id);
            return (
              <li key={m.id}>
                <Card className="flex h-full flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium">{m.name}</h3>
                    <Lock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                  </div>
                  <p className="mt-1 text-sm text-muted">{m.summary}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                    {m.phase && <Badge>{m.phase}</Badge>}
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={requested}
                      onClick={() => {
                        requestModule(m.id);
                        notify(`We've told Dr. Care you'd like ${m.name}`);
                      }}
                      aria-label={requested ? `${m.name} requested` : `Request ${m.name}`}
                    >
                      {requested ? (
                        <>
                          <Check className="size-3.5" /> Requested
                        </>
                      ) : (
                        "Request"
                      )}
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      {dialog}
    </>
  );
}

function ModuleCard({
  module: m,
  on,
  onToggle,
  hasOptions,
}: {
  module: ModuleManifest;
  on: boolean;
  onToggle: (on: boolean) => void;
  hasOptions: boolean;
}) {
  const permissions = PERMISSION_CATALOGUE.find((g) => g.moduleId === m.id)?.permissions.length ?? 0;
  const deps = m.dependsOn.map((d) => moduleById(d)?.name ?? d);

  return (
    <Card className={clsx("flex h-full flex-col p-5 transition-colors", on && "border-teal/40")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-semibold">{m.name}</h3>
            {m.core ? (
              <Badge tone="brand">Always on</Badge>
            ) : on ? (
              <Badge tone="success">On</Badge>
            ) : (
              <Badge>Off</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">{m.summary}</p>
        </div>
        {!m.core && <Switch checked={on} onChange={onToggle} label={`${m.name} on`} />}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted">Permissions</dt>
          <dd className="font-medium tabular-nums">{permissions}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Service points</dt>
          <dd className="font-medium">{m.servicePointTypes.join(", ") || "—"}</dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-xs text-muted">Needs</dt>
          <dd className="font-medium">{deps.join(", ") || "Nothing else"}</dd>
        </div>
      </dl>

      {!m.core && hasOptions && m.settings.length > 0 && (
        <Link
          href={`/admin/modules/${m.id}`}
          className="mt-4 -mb-1 flex items-center gap-2 border-t border-line pt-3 text-sm font-medium text-teal hover:underline"
        >
          <Settings2 className="size-4" aria-hidden /> {m.settings.length} options
          <ChevronRight className="ml-auto size-4" aria-hidden />
        </Link>
      )}
    </Card>
  );
}
