"use client";

import clsx from "clsx";
import { AlertCircle, ImageUp, Info, X } from "lucide-react";
import { useRef, useState } from "react";
import { Badge, Card, Field, Input, PageHeader, SaveBar, Select, Switch } from "@/components/ui";
import { EMAIL_RE } from "@/lib/access";
import { PERMISSION_CATALOGUE } from "@/lib/permissions";
import {
  DATE_FORMATS,
  MAX_LOGO_BYTES,
  SESSION_TIMEOUTS,
  timeoutLabel,
  type DateFormat,
  type HospitalSettings,
  type TwoFactor,
} from "@/lib/settings";
import { useStore } from "@/lib/store";

const TABS = [
  { id: "profile", label: "Hospital profile" },
  { id: "security", label: "Sign-in & security" },
  { id: "approvals", label: "Approvals" },
  { id: "branches", label: "Branch overrides" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const SENSITIVE = PERMISSION_CATALOGUE.flatMap((g) =>
  g.permissions.filter((p) => p.sensitive).map((p) => ({ ...p, module: g.module, moduleId: g.moduleId })),
);

export default function SettingsPage() {
  const { settings, ready } = useStore();
  if (!ready) return null;
  return <SettingsEditor key={JSON.stringify(settings)} saved={settings} />;
}

function SettingsEditor({ saved }: { saved: HospitalSettings }) {
  const { roles, users, branches, isModuleOn, saveSettings, notify } = useStore();
  const [draft, setDraft] = useState<HospitalSettings>(saved);
  const [tab, setTab] = useState<TabId>("profile");
  const [showErrors, setShowErrors] = useState(false);
  const [logoError, setLogoError] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);

  const changed = TABS.filter((t) => {
    const key = { profile: "profile", security: "security", approvals: "approvals", branches: "branchOverrides" }[t.id];
    return (
      JSON.stringify(draft[key as keyof HospitalSettings]) !== JSON.stringify(saved[key as keyof HospitalSettings])
    );
  });
  const dirty = changed.length > 0;

  const activeHolders = (roleId: string) =>
    users.filter((u) => u.status === "active" && u.roleIds.includes(roleId)).length;

  // Errors per tab, so the tab strip can point at what needs fixing.
  const errors: Record<TabId, string[]> = { profile: [], security: [], approvals: [], branches: [] };
  const p = draft.profile;
  if (!p.displayName.trim()) errors.profile.push("Enter the hospital name.");
  if (p.email.trim() && !EMAIL_RE.test(p.email.trim())) errors.profile.push("Enter a valid contact email.");
  const len = draft.security.passwordMinLength;
  if (!Number.isInteger(len) || len < 8 || len > 32) errors.security.push("Minimum password length must be 8 to 32.");
  for (const s of SENSITIVE) {
    const rule = draft.approvals[s.key];
    if (!rule?.required) continue;
    const role = roles.find((r) => r.id === rule.approverRoleId);
    if (!role?.permissions.includes(s.key))
      errors.approvals.push(`${role?.name ?? "The approver role"} can't “${s.label}” themselves, so can't approve it.`);
    else if (activeHolders(rule.approverRoleId) === 0)
      errors.approvals.push(`Nobody active can approve “${s.label}”. Pick a role that has active staff.`);
  }
  const errorCount = Object.values(errors).flat().length;

  const setProfile = (patch: Partial<HospitalSettings["profile"]>) =>
    setDraft((d) => ({ ...d, profile: { ...d.profile, ...patch } }));
  const setSecurity = (patch: Partial<HospitalSettings["security"]>) =>
    setDraft((d) => ({ ...d, security: { ...d.security, ...patch } }));

  const pickLogo = (file?: File) => {
    setLogoError(undefined);
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) return setLogoError("Use a PNG, JPG, WebP or SVG image.");
    if (file.size > MAX_LOGO_BYTES) return setLogoError("Keep the logo under 300 KB.");
    const reader = new FileReader();
    reader.onload = () => setProfile({ logo: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (errorCount) {
      setShowErrors(true);
      const first = TABS.find((t) => errors[t.id].length);
      if (first) setTab(first.id);
      return;
    }
    saveSettings(
      {
        ...draft,
        profile: { ...draft.profile, displayName: draft.profile.displayName.trim(), email: draft.profile.email.trim() },
      },
      `settings: ${changed.map((t) => t.label.toLowerCase()).join(", ")}`,
    );
    notify("Settings saved");
  };

  return (
    <div className={clsx(dirty && "pb-24")}>
      <PageHeader
        title="Settings"
        description="How your hospital runs Dr. Care. Branches use these unless you set something different for them under Branch overrides."
      />

      <div
        className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-surface p-1 ring-1 ring-line"
        role="tablist"
        aria-label="Settings sections"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={clsx(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              tab === t.id ? "bg-teal text-white" : "text-muted hover:bg-background hover:text-foreground",
            )}
          >
            {t.label}
            {showErrors && errors[t.id].length > 0 && <AlertCircle className="size-3.5" aria-label="has problems" />}
            {changed.includes(t) && !(showErrors && errors[t.id].length) && (
              <span className="size-1.5 rounded-full bg-cyan" aria-label="changed" />
            )}
          </button>
        ))}
      </div>

      {showErrors && errors[tab].length > 0 && (
        <ul className="mb-4 space-y-1 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {errors[tab].map((e) => (
            <li key={e} className="flex gap-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {e}
            </li>
          ))}
        </ul>
      )}

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "profile" && (
          <Card className="grid gap-5 p-5 sm:grid-cols-2">
            <div className="flex items-center gap-4 sm:col-span-2">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background ring-1 ring-line">
                {p.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a local data URL, nothing to optimise
                  <img src={p.logo} alt="Hospital logo" className="size-full object-contain" />
                ) : (
                  <ImageUp className="size-6 text-muted" aria-hidden />
                )}
              </div>
              <div className="text-sm">
                <p className="font-medium">Hospital logo</p>
                <p className="text-muted">
                  Shown in the menu, and later on receipts and patient cards. PNG, JPG or SVG, up to 300 KB.
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="sr-only"
                    aria-label="Upload logo"
                    onChange={(e) => {
                      pickLogo(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-background"
                  >
                    {p.logo ? "Replace logo" : "Upload logo"}
                  </button>
                  {p.logo && (
                    <button
                      type="button"
                      onClick={() => setProfile({ logo: undefined })}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-background"
                    >
                      <X className="size-3.5" /> Remove
                    </button>
                  )}
                </div>
                {logoError && (
                  <p className="mt-1 text-xs text-danger" role="alert">
                    {logoError}
                  </p>
                )}
              </div>
            </div>
            <Field label="Hospital name">
              {(id) => (
                <Input id={id} value={p.displayName} onChange={(e) => setProfile({ displayName: e.target.value })} />
              )}
            </Field>
            <Field label="Short name" hint="For narrow spaces like receipts and labels.">
              {(id) => (
                <Input
                  id={id}
                  value={p.shortName}
                  maxLength={20}
                  onChange={(e) => setProfile({ shortName: e.target.value })}
                />
              )}
            </Field>
            <Field label="Contact email">
              {(id) => (
                <Input id={id} type="email" value={p.email} onChange={(e) => setProfile({ email: e.target.value })} />
              )}
            </Field>
            <Field label="Contact phone">
              {(id) => (
                <Input id={id} type="tel" value={p.phone} onChange={(e) => setProfile({ phone: e.target.value })} />
              )}
            </Field>
            <div className="sm:col-span-2">
              <Field label="Address">
                {(id) => <Input id={id} value={p.address} onChange={(e) => setProfile({ address: e.target.value })} />}
              </Field>
            </div>
            <Field label="Date format">
              {(id) => (
                <Select
                  id={id}
                  value={p.dateFormat}
                  onChange={(e) => setProfile({ dateFormat: e.target.value as DateFormat })}
                >
                  {DATE_FORMATS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </Select>
              )}
            </Field>
            <div className="rounded-lg bg-background p-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium">
                <Info className="size-4 text-teal" aria-hidden /> Set by Dr. Care
              </p>
              <p className="mt-1 text-muted">
                {p.country} · {p.currency} · {p.timezone}. Contact Dr. Care to change these.
              </p>
            </div>
          </Card>
        )}

        {tab === "security" && (
          <Card className="divide-y divide-line">
            <Row label="Sign out after inactivity" help="Shared front-desk computers lock after this long without use.">
              <Select
                aria-label="Sign out after inactivity"
                value={draft.security.sessionTimeoutMinutes}
                onChange={(e) => setSecurity({ sessionTimeoutMinutes: Number(e.target.value) })}
                className="w-40"
              >
                {SESSION_TIMEOUTS.map((m) => (
                  <option key={m} value={m}>
                    {timeoutLabel(m)}
                  </option>
                ))}
              </Select>
            </Row>
            <Row
              label="Quick PIN switch"
              help="Staff sharing a computer switch user with a 4-digit PIN instead of a full sign-in."
            >
              <Switch
                checked={draft.security.pinSwitch}
                onChange={(v) => setSecurity({ pinSwitch: v })}
                label="Quick PIN switch"
              />
            </Row>
            <Row label="Two-step sign-in" help="A code from an authenticator app or SMS as well as the password.">
              <Select
                aria-label="Two-step sign-in"
                value={draft.security.twoFactor}
                onChange={(e) => setSecurity({ twoFactor: e.target.value as TwoFactor })}
                className="w-48"
              >
                <option value="off">Off</option>
                <option value="admins">Required for admins</option>
                <option value="everyone">Required for everyone</option>
              </Select>
            </Row>
            <Row label="Minimum password length" help="8 to 32 characters.">
              <Input
                type="number"
                aria-label="Minimum password length"
                min={8}
                max={32}
                value={Number.isFinite(draft.security.passwordMinLength) ? draft.security.passwordMinLength : ""}
                onChange={(e) =>
                  setSecurity({ passwordMinLength: e.target.value === "" ? NaN : Number(e.target.value) })
                }
                className="w-24 tabular-nums"
              />
            </Row>
          </Card>
        )}

        {tab === "approvals" && (
          <>
            <p className="mb-3 max-w-2xl text-sm text-muted">
              For risky actions, a second person can be required to approve before it goes through. The approver needs
              to be signed in at the time, so pick a role that always has someone on duty.
            </p>
            <Card className="overflow-hidden">
              <table className="w-full text-sm" aria-label="Approval rules">
                <thead className="bg-background text-left text-xs tracking-wide text-muted uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Needs approval</th>
                    <th className="px-4 py-3 font-medium">Approved by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {SENSITIVE.map((s) => {
                    const rule = draft.approvals[s.key] ?? { required: false, approverRoleId: "role_super" };
                    const setRule = (patch: Partial<typeof rule>) =>
                      setDraft((d) => ({ ...d, approvals: { ...d.approvals, [s.key]: { ...rule, ...patch } } }));
                    // Approvers must be able to do the action themselves.
                    // A role edited since the rule was set stays listed so the problem is visible.
                    const eligible = roles.filter((r) => r.permissions.includes(s.key) || r.id === rule.approverRoleId);
                    const holders = activeHolders(rule.approverRoleId);
                    return (
                      <tr key={s.key}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{s.label}</div>
                          <div className="flex items-center gap-1.5 text-xs text-muted">
                            {s.module}
                            {!isModuleOn(s.moduleId) && <Badge>Module off</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Switch
                            checked={rule.required}
                            onChange={(v) => setRule({ required: v })}
                            label={`${s.label} needs approval`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            aria-label={`Approver for ${s.label}`}
                            value={rule.approverRoleId}
                            disabled={!rule.required}
                            onChange={(e) => setRule({ approverRoleId: e.target.value })}
                            className="min-w-40"
                          >
                            {eligible.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </Select>
                          {rule.required && (
                            <p className={clsx("mt-1 text-xs", holders ? "text-muted" : "text-danger")}>
                              {holders
                                ? `${holders} active ${holders === 1 ? "person" : "people"}`
                                : "Nobody active has this role"}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </>
        )}

        {tab === "branches" && (
          <>
            <p className="mb-3 max-w-2xl text-sm text-muted">
              Each branch follows the hospital setting unless you choose something else here. For example, a busy annex
              can stay signed in longer.
            </p>
            <Card className="overflow-hidden">
              <table className="w-full text-sm" aria-label="Branch overrides">
                <thead className="bg-background text-left text-xs tracking-wide text-muted uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Branch</th>
                    <th className="px-4 py-3 font-medium">Sign out after</th>
                    <th className="px-4 py-3 font-medium">Quick PIN switch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {branches
                    .filter((b) => b.active)
                    .map((b) => {
                      const o = draft.branchOverrides[b.id] ?? {};
                      const setO = (patch: typeof o) =>
                        setDraft((d) => {
                          const merged = { ...o, ...patch };
                          // Drop keys set back to "use hospital setting" so overrides stay minimal.
                          for (const k of Object.keys(merged) as (keyof typeof merged)[])
                            if (merged[k] === undefined) delete merged[k];
                          const rest = { ...d.branchOverrides };
                          if (Object.keys(merged).length) rest[b.id] = merged;
                          else delete rest[b.id];
                          return { ...d, branchOverrides: rest };
                        });
                      const hospital = draft.security;
                      return (
                        <tr key={b.id}>
                          <td className="px-4 py-3">
                            <div className="font-medium">{b.name}</div>
                            {Object.keys(o).length > 0 && <div className="text-xs text-teal">Overridden</div>}
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              aria-label={`Sign out after, ${b.name}`}
                              value={o.sessionTimeoutMinutes ?? ""}
                              onChange={(e) =>
                                setO({ sessionTimeoutMinutes: e.target.value ? Number(e.target.value) : undefined })
                              }
                              className="min-w-44"
                            >
                              <option value="">
                                Hospital setting ({timeoutLabel(hospital.sessionTimeoutMinutes)})
                              </option>
                              {SESSION_TIMEOUTS.map((m) => (
                                <option key={m} value={m}>
                                  {timeoutLabel(m)}
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              aria-label={`Quick PIN switch, ${b.name}`}
                              value={o.pinSwitch === undefined ? "" : o.pinSwitch ? "on" : "off"}
                              onChange={(e) =>
                                setO({ pinSwitch: e.target.value === "" ? undefined : e.target.value === "on" })
                              }
                              className="min-w-40"
                            >
                              <option value="">Hospital setting ({hospital.pinSwitch ? "On" : "Off"})</option>
                              <option value="on">On</option>
                              <option value="off">Off</option>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </div>

      {dirty && (
        <SaveBar
          onDiscard={() => {
            setDraft(saved);
            setShowErrors(false);
            setLogoError(undefined);
          }}
          onSave={save}
          saveLabel="Save settings"
        >
          Unsaved changes in {changed.map((t) => t.label).join(", ")}
          {errorCount > 0 && ` · ${errorCount} to fix`}
        </SaveBar>
      )}
    </div>
  );
}

function Row({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted">{help}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
