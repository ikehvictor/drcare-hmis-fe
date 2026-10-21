"use client";

import clsx from "clsx";
import { ArrowLeft, Building2, Check, KeyRound, Mail, Pencil, Phone, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { RelativeTime } from "@/components/relative-time";
import { Badge, Button, Card, Dialog, Field, SaveBar, Switch } from "@/components/ui";
import { PasswordInput, UserFormDialog } from "@/components/user-form";
import { UserStatusBadge } from "@/components/user-status";
import {
  branchScopeLabel,
  effectivePermissions,
  fromRoles,
  initials,
  passwordProblems,
  staffLabel,
} from "@/lib/access";
import { permissionCatalogue } from "@/lib/permissions";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";

export function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const { users, ready } = useStore();
  const user = users.find((u) => u.id === id);

  if (!ready) return null;
  if (!user) {
    return (
      <Card className="mx-auto mt-10 max-w-md p-8 text-center">
        <h1 className="font-display text-xl font-semibold">User not found</h1>
        <Link href="/admin/users" className="mt-4 inline-block text-sm font-medium text-teal hover:underline">
          Back to users
        </Link>
      </Card>
    );
  }
  // Keyed so saving, or another tab changing this person, reloads the access draft.
  return <UserView key={`${user.id}:${user.extraPermissions.join()}:${user.removedPermissions.join()}`} user={user} />;
}

const toggleIn = (list: string[], key: string, on: boolean) =>
  on ? (list.includes(key) ? list : [...list, key]) : list.filter((k) => k !== key);

function UserView({ user }: { user: User }) {
  const {
    roles,
    branches,
    staffCategories,
    customFunctions,
    currentUserId,
    setUserStatus,
    setUserAccess,
    notify,
    isModuleOn,
  } = useStore();
  const [editing, setEditing] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [extra, setExtra] = useState(user.extraPermissions);
  const [removed, setRemoved] = useState(user.removedPermissions);

  const isSelf = user.id === currentUserId;
  const first = user.name.split(" ")[0];
  const customKeys = customFunctions.map((c) => c.key);
  const catalogue = permissionCatalogue(customFunctions);
  const userRoles = roles.filter((r) => user.roleIds.includes(r.id));
  const superAdmin = userRoles.some((r) => r.locked);
  const byRoles = fromRoles(user, roles, customKeys);
  const draft = { ...user, extraPermissions: extra, removedPermissions: removed };
  const granted = effectivePermissions(draft, roles, isModuleOn, customKeys);
  const dirty = extra.join() !== user.extraPermissions.join() || removed.join() !== user.removedPermissions.join();
  const locked = isSelf || superAdmin;
  const staff = staffLabel(user, staffCategories);

  // On means "this person may do it". Turning it away from what their roles say records a personal change;
  // turning it back clears that change.
  const setAllowed = (key: string, on: boolean) => {
    if (byRoles.has(key)) {
      setRemoved((r) => toggleIn(r, key, !on));
      setExtra((x) => toggleIn(x, key, false));
    } else {
      setExtra((x) => toggleIn(x, key, on));
      setRemoved((r) => toggleIn(r, key, false));
    }
  };

  const save = () => {
    const order = catalogue.flatMap((g) => g.permissions.map((p) => p.key));
    const sorted = (list: string[]) => order.filter((k) => list.includes(k));
    setUserAccess(user.id, sorted(extra), sorted(removed));
    notify(`${user.name}'s access saved`);
  };

  return (
    <div className={clsx(dirty && "pb-24")}>
      <Link
        href="/admin/users"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All users
      </Link>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-teal-soft font-display text-lg font-semibold text-teal-dark">
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-semibold">{user.name}</h1>
                <UserStatusBadge status={user.status} />
                {user.mustChangePassword && <Badge tone="warning">Must change password</Badge>}
                {isSelf && <Badge tone="brand">You</Badge>}
              </div>
              {(user.jobTitle || staff) && (
                <p className="text-sm text-muted" data-testid="staff-line">
                  {[user.jobTitle, staff].filter(Boolean).join(" · ")}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                <span className="flex items-center gap-1.5">
                  <Mail className="size-4" aria-hidden /> {user.email}
                </span>
                {user.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-4" aria-hidden /> {user.phone}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted">
                {user.lastActiveAt ? (
                  <>
                    Last active <RelativeTime iso={user.lastActiveAt} />
                  </>
                ) : (
                  "Hasn't signed in yet"
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isSelf && (
              <Button variant="secondary" onClick={() => setSettingPassword(true)}>
                <KeyRound className="size-4" /> Set password
              </Button>
            )}
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
            {user.status === "suspended" ? (
              <Button onClick={() => setUserStatus(user.id, "active")}>Reactivate</Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setConfirmSuspend(true)}
                disabled={isSelf}
                title={isSelf ? "You can't suspend your own account" : undefined}
              >
                Suspend
              </Button>
            )}
          </div>
        </div>
      </Card>

      {user.status === "suspended" && (
        <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          This account is suspended. {first} can&apos;t sign in until you reactivate it.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-display font-semibold">
              <ShieldCheck className="size-4 text-teal" aria-hidden /> Roles
            </h2>
            <ul className="mt-3 space-y-2">
              {userRoles.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/admin/roles/${r.id}`}
                    className="block rounded-lg border border-line px-3 py-2 text-sm hover:border-teal/40"
                  >
                    <span className="font-medium">{r.name}</span>
                    <span className="block text-xs text-muted">{r.permissions.length} permissions</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-display font-semibold">
              <Building2 className="size-4 text-teal" aria-hidden /> Branch access
            </h2>
            <p className="mt-2 text-sm" data-testid="branch-access">
              {branchScopeLabel(user, branches)}
            </p>
          </Card>
        </div>

        <Card className="p-5 lg:col-span-2">
          <h2 className="font-display font-semibold">What {isSelf ? "you" : first} can do</h2>
          <p className="text-sm text-muted" data-testid="access-summary">
            {granted.size} permissions, combined from {userRoles.length} {userRoles.length === 1 ? "role" : "roles"}
            {extra.length > 0 && `, ${extra.length} given directly`}
            {removed.length > 0 && `, ${removed.length} taken away`}.
          </p>
          <p className="mt-1 text-xs text-muted">
            {isSelf
              ? "You can't change your own access, so you can never lock yourself out."
              : superAdmin
                ? "Hospital Super Admins can always do everything."
                : `Switch a function on or off for ${first} alone. Their roles stay the same for everyone else.`}
          </p>
          <div className="mt-4 space-y-5">
            {catalogue.map((g) => (
              <section key={g.module} aria-label={g.module}>
                <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted uppercase">
                  {g.module}
                  {!isModuleOn(g.moduleId) && <Badge>Module off</Badge>}
                  {g.permissions[0]?.key.startsWith("custom.") && <Badge>Not enforced yet</Badge>}
                </h3>
                <ul className="mt-2 divide-y divide-line">
                  {g.permissions.map((p) => {
                    const from = granted.get(p.key);
                    const intended = (byRoles.has(p.key) && !removed.includes(p.key)) || extra.includes(p.key);
                    const note = extra.includes(p.key)
                      ? `Given to ${first} directly`
                      : removed.includes(p.key)
                        ? `Taken away from ${first}`
                        : from
                          ? `From ${from.join(", ")}`
                          : undefined;
                    return (
                      <li key={p.key} className="flex items-center gap-3 py-2 text-sm">
                        {from ? (
                          <Check className="size-4 shrink-0 text-success" aria-hidden />
                        ) : (
                          <X className="size-4 shrink-0 text-muted/40" aria-hidden />
                        )}
                        <span className={clsx("min-w-0 flex-1", !from && "text-muted")}>
                          {p.label}
                          <span className="sr-only">{from ? " — allowed" : " — not allowed"}</span>
                          {note && (
                            <span
                              className={clsx(
                                "block text-xs",
                                extra.includes(p.key) || removed.includes(p.key) ? "text-warning" : "text-muted",
                              )}
                            >
                              {note}
                            </span>
                          )}
                        </span>
                        <Switch
                          checked={intended}
                          onChange={(on) => setAllowed(p.key, on)}
                          label={`Allow ${p.label}`}
                          disabled={locked}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </Card>
      </div>

      {dirty && !locked && (
        <SaveBar
          onDiscard={() => {
            setExtra(user.extraPermissions);
            setRemoved(user.removedPermissions);
          }}
          onSave={save}
          saveLabel="Save access"
        >
          Unsaved changes to {first}&apos;s access
        </SaveBar>
      )}

      {editing && <UserFormDialog user={user} onClose={() => setEditing(false)} />}
      {settingPassword && <SetPasswordDialog user={user} onClose={() => setSettingPassword(false)} />}
      <Dialog
        open={confirmSuspend}
        onClose={() => setConfirmSuspend(false)}
        title={`Suspend ${user.name}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmSuspend(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setUserStatus(user.id, "suspended");
                setConfirmSuspend(false);
              }}
            >
              Suspend account
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          They&apos;re signed out and can&apos;t sign back in. Everything they recorded stays, and you can reactivate
          them any time.
        </p>
      </Dialog>
    </div>
  );
}

function SetPasswordDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const { settings, setUserPassword, notify } = useStore();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mustChange, setMustChange] = useState(true);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const minLength = settings.security.passwordMinLength;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problems = passwordProblems(password, minLength, user.email);
    const next = problems.length
      ? { password: problems.join(" ") }
      : password !== confirm
        ? { confirm: "The two passwords don't match." }
        : {};
    setErrors(next);
    if (Object.keys(next).length) return;
    setUserPassword(user.id, mustChange);
    notify(`New password set for ${user.name}`);
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Set a password for ${user.name}`}
      description="Their old password stops working. Give them the new one privately."
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="password-form">
            Set password
          </Button>
        </>
      }
    >
      <form id="password-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field
          label="New password"
          error={errors.password}
          hint={`At least ${minLength} characters, letters and numbers.`}
        >
          {(id) => <PasswordInput id={id} value={password} onChange={setPassword} />}
        </Field>
        <Field label="Type it again" error={errors.confirm}>
          {(id) => <PasswordInput id={id} value={confirm} onChange={setConfirm} />}
        </Field>
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={mustChange}
            onChange={(e) => setMustChange(e.target.checked)}
            className="size-4 accent-teal"
          />
          Ask them to choose their own password at next sign-in
        </label>
      </form>
    </Dialog>
  );
}
