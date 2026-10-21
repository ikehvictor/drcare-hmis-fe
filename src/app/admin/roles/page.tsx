"use client";

import { ChevronRight, Lock, Plus, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, Dialog, Field, Input, PageHeader, Select } from "@/components/ui";
import { rolePermissions, usersWithRole } from "@/lib/access";
import { ALL_PERMISSION_KEYS, ALL_PERMISSIONS, permissionCatalogue } from "@/lib/permissions";
import { useStore } from "@/lib/store";

export default function RolesPage() {
  const { roles, users, customFunctions } = useStore();
  const [creating, setCreating] = useState(false);
  const customKeys = customFunctions.map((c) => c.key);
  const catalogue = permissionCatalogue(customFunctions);
  const total = ALL_PERMISSION_KEYS.length + customKeys.length;

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="A role is a group of functions staff are allowed to carry out, e.g. Head Nurse or Cardiology Doctor. Give each person one or more roles; they can do everything their roles allow, plus anything you give them directly."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Create role
          </Button>
        }
      />

      <ul className="grid gap-3 md:grid-cols-2" aria-label="Roles">
        {roles.map((r) => {
          const people = usersWithRole(r.id, users).length;
          const perms = rolePermissions(r, customKeys);
          return (
            <li key={r.id}>
              <Link href={`/admin/roles/${r.id}`} className="block h-full">
                <Card className="flex h-full flex-col p-5 transition-colors hover:border-teal/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-medium">{r.name}</h2>
                        {r.locked && (
                          <Badge tone="brand">
                            <Lock className="size-3" aria-hidden /> Locked
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{r.description || "No description"}</p>
                    </div>
                    <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {catalogue.map((g) => {
                      const n = g.permissions.filter((p) => perms.includes(p.key)).length;
                      return n ? (
                        <Badge key={g.module}>
                          {g.module} · {n}/{g.permissions.length}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-4 text-sm text-muted">
                    <span className="flex items-center gap-1.5">
                      <Users className="size-4" aria-hidden /> {people} {people === 1 ? "person" : "people"}
                    </span>
                    <span className="tabular-nums">
                      {perms.length} of {total} permissions
                    </span>
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>

      <CustomFunctions />

      {creating && <CreateRoleDialog onClose={() => setCreating(false)} />}
    </>
  );
}

/** Functions the hospital names itself. Roles and people can have them; no module checks them yet. */
function CustomFunctions() {
  const { customFunctions, roles, users, addCustomFunction, deleteCustomFunction, notify } = useStore();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string>();

  const inUse = (key: string) =>
    roles.some((r) => r.permissions.includes(key)) ||
    users.some((u) => u.extraPermissions.includes(key) || u.removedPermissions.includes(key));

  const close = () => {
    setAdding(false);
    setLabel("");
    setDescription("");
    setError(undefined);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return setError("Name the function, e.g. Approve the nurses' duty roster.");
    const taken = [...ALL_PERMISSIONS.map((p) => p.label), ...customFunctions.map((c) => c.label)];
    if (taken.some((t) => t.toLowerCase() === trimmed.toLowerCase()))
      return setError(`There's already a function called ${trimmed}.`);
    addCustomFunction(trimmed, description.trim());
    notify(`${trimmed} added. Put it in a role or give it to someone.`);
    close();
  };

  return (
    <section aria-labelledby="custom-fns" className="mt-10">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="custom-fns" className="font-display text-lg font-semibold">
            Your hospital&apos;s own functions
          </h2>
          <p className="max-w-2xl text-sm text-muted">
            Name responsibilities Dr. Care doesn&apos;t have yet, like “Approve the nurses&apos; duty roster”. They go
            in roles and on people like any other function, but no module checks them yet, so they record who is
            responsible rather than block anyone.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Add function
        </Button>
      </div>
      {customFunctions.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">No functions of your own yet.</Card>
      ) : (
        <Card>
          <ul className="divide-y divide-line" aria-label="Your hospital's own functions">
            {customFunctions.map((c) => {
              const used = inUse(c.key);
              return (
                <li key={c.key} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      {c.label} <Badge>Not enforced yet</Badge>
                    </span>
                    {c.description && <span className="block text-muted">{c.description}</span>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={used}
                    title={used ? "Take it out of every role and person first" : undefined}
                    onClick={() => {
                      deleteCustomFunction(c.key);
                      notify(`${c.label} deleted`);
                    }}
                    aria-label={`Delete ${c.label}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Dialog
        open={adding}
        onClose={close}
        title="Add a function"
        description="You'll then tick it in roles, or give it to a person on their page."
        footer={
          <>
            <Button variant="secondary" type="button" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" form="function-form">
              Add function
            </Button>
          </>
        }
      >
        <form id="function-form" onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Function" error={error}>
            {(id) => (
              <Input
                id={id}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Approve the nurses' duty roster"
              />
            )}
          </Field>
          <Field label="Description" hint="Optional. What does doing this involve?">
            {(id) => <Input id={id} value={description} onChange={(e) => setDescription(e.target.value)} />}
          </Field>
        </form>
      </Dialog>
    </section>
  );
}

function CreateRoleDialog({ onClose }: { onClose: () => void }) {
  const { roles, addRole } = useStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const [error, setError] = useState<string>();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Give the role a name, e.g. Triage Nurse.");
    if (roles.some((r) => r.name.toLowerCase() === trimmed.toLowerCase()))
      return setError(`There's already a role called ${trimmed}.`);
    const source = roles.find((r) => r.id === copyFrom);
    const role = addRole({
      name: trimmed,
      description: description.trim(),
      permissions: source ? [...source.permissions] : [],
    });
    onClose();
    router.push(`/admin/roles/${role.id}`);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Create a role"
      description="You'll choose its permissions on the next screen."
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="role-form">
            Create and set permissions
          </Button>
        </>
      }
    >
      <form id="role-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Role name" error={error}>
          {(id) => (
            <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Triage Nurse" />
          )}
        </Field>
        <Field label="Description" hint="Optional. What do people in this role do?">
          {(id) => <Input id={id} value={description} onChange={(e) => setDescription(e.target.value)} />}
        </Field>
        <Field label="Start from" hint="Copy an existing role's permissions, then adjust them.">
          {(id) => (
            <Select id={id} value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
              <option value="">No permissions (blank role)</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  Copy of {r.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </form>
    </Dialog>
  );
}
