"use client";

import { useState } from "react";
import { Button, Dialog } from "@/components/ui";
import { enabledDependents, missingDependencies, moduleById, type ModuleManifest } from "@/lib/modules";
import { PERMISSION_CATALOGUE } from "@/lib/permissions";
import { useStore } from "@/lib/store";

interface Pending {
  on: boolean;
  target: ModuleManifest;
  /** Dependencies to switch on, or dependents to switch off, with the target. */
  also: ModuleManifest[];
}

const names = (ms: ModuleManifest[]) => ms.map((m) => m.name).join(" and ");

/**
 * Switching modules on pulls in what they depend on; switching off takes their dependents with them.
 * Both ask first when more than the one module changes, and switching off always explains the effect.
 */
export function useModuleToggle() {
  const { roles, isModuleOn, setModulesEnabled, notify } = useStore();
  const [pending, setPending] = useState<Pending | null>(null);

  const request = (id: string, on: boolean) => {
    const target = moduleById(id);
    if (!target) return;
    if (on) {
      const missing = missingDependencies(id, isModuleOn);
      if (!missing.length) {
        setModulesEnabled([id], true);
        notify(`${target.name} is on`);
      } else setPending({ on: true, target, also: missing });
    } else {
      setPending({ on: false, target, also: enabledDependents(id, isModuleOn) });
    }
  };

  // Dependency order: what's needed first when switching on, the module itself first when switching off.
  const ordered = (p: Pending) => (p.on ? [...p.also, p.target] : [p.target, ...p.also]);

  const confirm = () => {
    if (!pending) return;
    const all = ordered(pending);
    setModulesEnabled(
      all.map((m) => m.id),
      pending.on,
    );
    notify(`${names(all)} ${all.length > 1 ? "are" : "is"} ${pending.on ? "on" : "off"}`);
    setPending(null);
  };

  let dialog: React.ReactNode = null;
  if (pending) {
    const all = ordered(pending);
    const groups = PERMISSION_CATALOGUE.filter((g) => all.some((m) => m.id === g.moduleId));
    const keys = new Set(groups.flatMap((g) => g.permissions.map((p) => p.key)));
    const affectedRoles = roles.filter((r) => !r.locked && r.permissions.some((k) => keys.has(k)));

    dialog = (
      <Dialog
        open
        onClose={() => setPending(null)}
        title={pending.on ? `${pending.target.name} needs ${names(pending.also)}` : `Switch off ${names(all)}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button variant={pending.on ? "primary" : "danger"} onClick={confirm}>
              {pending.on ? `Switch on ${all.length > 1 ? "both" : pending.target.name}` : "Switch off"}
            </Button>
          </>
        }
      >
        {pending.on ? (
          <p className="text-sm text-muted">
            {pending.target.name} works on top of {names(pending.also)}, so {pending.also.length > 1 ? "they" : "it"}{" "}
            will be switched on too.
          </p>
        ) : (
          <div className="space-y-3 text-sm text-muted">
            {pending.also.length > 0 && (
              <p className="rounded-lg bg-warning-soft px-3 py-2 text-warning">
                {names(pending.also)} {pending.also.length > 1 ? "depend" : "depends"} on {pending.target.name}, so{" "}
                {pending.also.length > 1 ? "they switch" : "it switches"} off too.
              </p>
            )}
            <ul className="list-disc space-y-1 pl-5">
              <li>Its menus disappear and staff can&apos;t use it.</li>
              {keys.size > 0 && (
                <li>
                  {keys.size} permissions stop working
                  {affectedRoles.length > 0 && <> for {affectedRoles.map((r) => r.name).join(", ")}</>}.
                </li>
              )}
              <li>Nothing is deleted. Switch it back on and everything returns as it was.</li>
            </ul>
          </div>
        )}
      </Dialog>
    );
  }

  return { request, dialog };
}
