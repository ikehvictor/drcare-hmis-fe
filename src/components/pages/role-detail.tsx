"use client";

import clsx from "clsx";
import { AlertTriangle, ArrowLeft, Lock, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Dialog, Field, Input, SaveBar } from "@/components/ui";
import { initials, usersWithRole } from "@/lib/access";
import { PERMISSION_CATALOGUE, type PermissionGroup } from "@/lib/permissions";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

export function RoleDetail() {
  const { id } = useParams<{ id: string }>();
  const { roles, ready } = useStore();
  const role = roles.find((r) => r.id === id);

  if (!ready) return null;
  if (!role) {
    return (
      <Card className="mx-auto mt-10 max-w-md p-8 text-center">
        <h1 className="font-display text-xl font-semibold">Role not found</h1>
        <p className="mt-2 text-sm text-muted">It may have been deleted.</p>
        <Link href="/admin/roles" className="mt-4 inline-block text-sm font-medium text-teal hover:underline">
          Back to roles
        </Link>
      </Card>
    );
  }
  return <RoleEditor key={role.id} role={role} />;
}

function GroupCheckbox({
  group,
  selected,
  disabled,
  onChange,
}: {
  group: PermissionGroup;
  selected: Set<string>;
  disabled: boolean;
  onChange: (all: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const count = group.permissions.filter((p) => selected.has(p.key)).length;
  const all = count === group.permissions.length;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = count > 0 && !all;
  }, [count, all]);

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <input
        ref={ref}
        type="checkbox"
        checked={all}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-teal"
        aria-label={`Allow all ${group.module} permissions`}
      />
      <span className="tabular-nums">
        {count} of {group.permissions.length}
      </span>
    </label>
  );
}

function RoleEditor({ role }: { role: Role }) {
  const { roles, users, updateRole, deleteRole, notify, isModuleOn } = useStore();
  const router = useRouter();
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description);
  const [selected, setSelected] = useState(() => new Set(role.permissions));
  const [error, setError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const readOnly = !!role.locked;
  const people = usersWithRole(role.id, users);
  const dirty =
    name !== role.name ||
    description !== role.description ||
    selected.size !== role.permissions.length ||
    role.permissions.some((p) => !selected.has(p));

  const toggle = (key: string, on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  const toggleGroup = (group: PermissionGroup, on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      for (const p of group.permissions) {
        if (on) next.add(p.key);
        else next.delete(p.key);
      }
      return next;
    });

  const discard = () => {
    setName(role.name);
    setDescription(role.description);
    setSelected(new Set(role.permissions));
    setError(undefined);
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return setError("Give the role a name.");
    if (roles.some((r) => r.id !== role.id && r.name.toLowerCase() === trimmed.toLowerCase()))
      return setError(`There's already a role called ${trimmed}.`);
    setError(undefined);
    // Keep the catalogue order so saved roles read the same way everywhere.
    const permissions = PERMISSION_CATALOGUE.flatMap((g) => g.permissions.map((p) => p.key)).filter((k) =>
      selected.has(k),
    );
    updateRole(role.id, { name: trimmed, description: description.trim(), permissions });
    notify(`${trimmed} saved`);
  };

  return (
    <div className={clsx(dirty && "pb-24")}>
      <Link
        href="/admin/roles"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All roles
      </Link>

      {readOnly && (
        <div className="mb-4 flex gap-3 rounded-xl bg-teal-soft p-4 text-sm text-teal-dark">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            This role always has every permission and can&apos;t be changed or deleted, so your hospital can never be
            locked out of its own admin. Create another role for limited admin access.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="space-y-4 p-5">
            <Field label="Role name" error={error}>
              {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} />}
            </Field>
            <Field label="Description">
              {(id) => (
                <Input
                  id={id}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={readOnly}
                />
              )}
            </Field>
          </Card>

          {PERMISSION_CATALOGUE.map((group) => (
            <Card key={group.module} className="overflow-hidden">
              <section aria-labelledby={`grp-${group.module.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="flex items-center justify-between gap-3 border-b border-line bg-background/60 px-5 py-3">
                  <div>
                    <h2
                      id={`grp-${group.module.toLowerCase().replace(/\s+/g, "-")}`}
                      className="font-display font-semibold"
                    >
                      {group.module}
                    </h2>
                    <p className="text-xs text-muted">
                      {isModuleOn(group.moduleId) ? (
                        group.description
                      ) : (
                        <>
                          <span className="font-medium text-warning">Module off.</span> These permissions only take
                          effect once{" "}
                          <Link href="/admin/modules" className="underline">
                            {group.module}
                          </Link>{" "}
                          is switched on.
                        </>
                      )}
                    </p>
                  </div>
                  <GroupCheckbox
                    group={group}
                    selected={selected}
                    disabled={readOnly}
                    onChange={(on) => toggleGroup(group, on)}
                  />
                </div>
                <ul className="divide-y divide-line">
                  {group.permissions.map((p) => (
                    <li key={p.key}>
                      <label
                        className={clsx("flex gap-3 px-5 py-3", !readOnly && "cursor-pointer hover:bg-background/60")}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(p.key)}
                          disabled={readOnly}
                          onChange={(e) => toggle(p.key, e.target.checked)}
                          className="mt-0.5 size-4 shrink-0 accent-teal"
                        />
                        <span className="min-w-0 text-sm">
                          <span className="flex flex-wrap items-center gap-2 font-medium">
                            {p.label}
                            {p.sensitive && (
                              <Badge tone="warning">
                                <AlertTriangle className="size-3" aria-hidden /> Sensitive
                              </Badge>
                            )}
                          </span>
                          <span className="block text-muted">{p.description}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-display font-semibold">People with this role</h2>
            {people.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Nobody yet. Assign it from a user&apos;s page.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {people.map((u) => (
                  <li key={u.id}>
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="flex items-center gap-3 rounded-lg hover:bg-background"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-soft text-xs font-semibold text-teal-dark">
                        {initials(u.name)}
                      </span>
                      <span className="min-w-0 text-sm">
                        <span className="block truncate font-medium">{u.name}</span>
                        <span className="block truncate text-xs text-muted">{u.jobTitle}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {!readOnly && (
            <Card className="p-5">
              <h2 className="font-display font-semibold">Delete role</h2>
              <p className="mt-1 text-sm text-muted">
                {people.length
                  ? `Move the ${people.length === 1 ? "person" : `${people.length} people`} above to another role first.`
                  : "Nobody has this role, so it can be deleted."}
              </p>
              <Button
                variant="secondary"
                className="mt-3 text-danger"
                disabled={people.length > 0}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" /> Delete role
              </Button>
            </Card>
          )}
        </div>
      </div>

      {dirty && !readOnly && (
        <SaveBar onDiscard={discard} onSave={save} saveLabel="Save role">
          Unsaved changes · <span className="tabular-nums">{selected.size}</span> permissions selected
        </SaveBar>
      )}

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${role.name}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                deleteRole(role.id);
                notify(`${role.name} deleted`);
                router.push("/admin/roles");
              }}
            >
              Delete role
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">The role is removed for good. Nobody loses access, because nobody has it.</p>
      </Dialog>
    </div>
  );
}
