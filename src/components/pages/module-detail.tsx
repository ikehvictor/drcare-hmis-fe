"use client";

import clsx from "clsx";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useModuleToggle } from "@/components/module-toggle";
import { Badge, Card, Input, SaveBar, Switch } from "@/components/ui";
import { moduleById, type ModuleManifest, type SettingValue } from "@/lib/modules";
import { useStore } from "@/lib/store";

export function ModuleDetail({ id }: { id: string }) {
  const { modules, ready } = useStore();
  const manifest = moduleById(id)!;
  const state = modules[id];

  if (!ready) return null;
  if (!state) {
    return (
      <Card className="mx-auto mt-10 max-w-md p-8 text-center">
        <h1 className="font-display text-xl font-semibold">{manifest.name} isn&apos;t on your plan</h1>
        <Link href="/admin/modules" className="mt-4 inline-block text-sm font-medium text-teal hover:underline">
          Back to modules
        </Link>
      </Card>
    );
  }
  // Keyed on the saved settings so a save or a demo reset reloads the form.
  return (
    <ModuleOptions key={JSON.stringify(state.settings)} manifest={manifest} saved={state.settings} on={state.enabled} />
  );
}

function ModuleOptions({
  manifest,
  saved,
  on,
}: {
  manifest: ModuleManifest;
  saved: Record<string, SettingValue>;
  on: boolean;
}) {
  const { updateModuleSettings, notify } = useStore();
  const { request, dialog } = useModuleToggle();
  const [values, setValues] = useState(saved);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  const set = (key: string, v: SettingValue) => {
    setValues((prev) => {
      const next = { ...prev, [key]: v };
      // Deposits as a payment method only make sense while deposits are allowed.
      if (key === "allowDeposits" && v === false && Array.isArray(next.paymentMethods))
        next.paymentMethods = next.paymentMethods.filter((m) => m !== "Deposit");
      return next;
    });
  };

  const save = () => {
    const next: Record<string, string> = {};
    for (const s of manifest.settings) {
      const v = values[s.key];
      if (s.type === "multi" && Array.isArray(v) && v.length === 0) next[s.key] = "Pick at least one.";
      if (s.type === "money" && (typeof v !== "number" || !Number.isFinite(v) || v < 0))
        next[s.key] = "Enter an amount of 0 or more.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    updateModuleSettings(manifest.id, values);
    notify(`${manifest.name} options saved`);
  };

  return (
    <div className={clsx(dirty && "pb-24")}>
      <Link
        href="/admin/modules"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All modules
      </Link>

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold">{manifest.name}</h1>
            {on ? <Badge tone="success">On</Badge> : <Badge>Off</Badge>}
          </div>
          <p className="mt-1 max-w-xl text-sm text-muted">{manifest.summary}</p>
        </div>
        <Switch checked={on} onChange={(v) => request(manifest.id, v)} label={`${manifest.name} on`} />
      </Card>

      {!on && (
        <p className="mt-4 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
          {manifest.name} is off. You can set its options now; they apply once you switch it on.
        </p>
      )}

      <Card className="mt-6 divide-y divide-line">
        <h2 className="px-5 py-4 font-display font-semibold">Options</h2>
        {manifest.settings.map((s) => {
          const v = values[s.key];
          return (
            <div key={s.key} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p id={`opt-${s.key}`} className="text-sm font-medium">
                  {s.label}
                </p>
                {s.help && <p className="text-sm text-muted">{s.help}</p>}
                {errors[s.key] && (
                  <p className="mt-1 text-xs text-danger" role="alert">
                    {errors[s.key]}
                  </p>
                )}
              </div>
              <div className="shrink-0">
                {s.type === "boolean" && (
                  <Switch checked={v === true} onChange={(x) => set(s.key, x)} label={s.label} />
                )}
                {s.type === "money" && (
                  <div className="relative w-40">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">
                      ₦
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={500}
                      aria-labelledby={`opt-${s.key}`}
                      value={typeof v === "number" && Number.isFinite(v) ? v : ""}
                      onChange={(e) => set(s.key, e.target.value === "" ? NaN : Number(e.target.value))}
                      className="pl-7 tabular-nums"
                    />
                  </div>
                )}
                {s.type === "multi" && (
                  <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`opt-${s.key}`}>
                    {s.options.map((o) => {
                      const list = Array.isArray(v) ? v : [];
                      const checked = list.includes(o);
                      const blocked = o === "Deposit" && values.allowDeposits !== true;
                      return (
                        <label
                          key={o}
                          title={blocked ? "Switch on Allow deposits first" : undefined}
                          className={clsx(
                            "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm",
                            checked ? "border-teal bg-teal-soft/60" : "border-line",
                            blocked ? "opacity-50" : "cursor-pointer",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={blocked}
                            onChange={(e) => set(s.key, e.target.checked ? [...list, o] : list.filter((x) => x !== o))}
                            className="size-4 accent-teal"
                          />
                          {o}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      {dirty && (
        <SaveBar
          onDiscard={() => {
            setValues(saved);
            setErrors({});
          }}
          onSave={save}
          saveLabel="Save options"
        />
      )}
      {dialog}
    </div>
  );
}
