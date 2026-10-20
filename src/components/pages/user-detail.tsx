"use client";

import clsx from "clsx";
import { ArrowLeft, Building2, Check, Mail, Pencil, Phone, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { RelativeTime } from "@/components/relative-time";
import { Badge, Button, Card, Dialog } from "@/components/ui";
import { UserFormDialog } from "@/components/user-form";
import { UserStatusBadge } from "@/components/user-status";
import { branchScopeLabel, effectivePermissions, initials } from "@/lib/access";
import { PERMISSION_CATALOGUE } from "@/lib/permissions";
import { useStore } from "@/lib/store";

export function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const { users, roles, branches, ready, currentUserId, setUserStatus, resendInvite, notify, isModuleOn } = useStore();
  const [editing, setEditing] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
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

  const isSelf = user.id === currentUserId;
  const granted = effectivePermissions(user, roles, isModuleOn);
  const userRoles = roles.filter((r) => user.roleIds.includes(r.id));

  return (
    <>
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
                {isSelf && <Badge tone="brand">You</Badge>}
              </div>
              {user.jobTitle && <p className="text-sm text-muted">{user.jobTitle}</p>}
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
            {user.status === "invited" && (
              <Button
                variant="secondary"
                onClick={() => {
                  resendInvite(user.id);
                  notify(`Invitation resent to ${user.email}`);
                }}
              >
                Resend invitation
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
          This account is suspended. {user.name.split(" ")[0]} can&apos;t sign in until you reactivate it.
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
          <h2 className="font-display font-semibold">What {isSelf ? "you" : user.name.split(" ")[0]} can do</h2>
          <p className="text-sm text-muted">
            {granted.size} permissions, combined from {userRoles.length} {userRoles.length === 1 ? "role" : "roles"}.
          </p>
          <div className="mt-4 space-y-5">
            {PERMISSION_CATALOGUE.map((g) => (
              <section key={g.module} aria-label={g.module}>
                <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted uppercase">
                  {g.module}
                  {!isModuleOn(g.moduleId) && <Badge>Module off</Badge>}
                </h3>
                <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {g.permissions.map((p) => {
                    const from = granted.get(p.key);
                    return (
                      <li
                        key={p.key}
                        className={clsx("flex items-start gap-2 text-sm", !from && "text-muted/60")}
                        title={from ? `From ${from.join(", ")}` : undefined}
                      >
                        <Check
                          className={clsx("mt-0.5 size-4 shrink-0", from ? "text-success" : "invisible")}
                          aria-hidden
                        />
                        <span>
                          {p.label}
                          <span className="sr-only">{from ? " — allowed" : " — not allowed"}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </Card>
      </div>

      {editing && <UserFormDialog user={user} onClose={() => setEditing(false)} />}
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
    </>
  );
}
