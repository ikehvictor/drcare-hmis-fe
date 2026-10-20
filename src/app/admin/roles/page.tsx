"use client";

import { ChevronRight, Lock, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, Dialog, Field, Input, PageHeader, Select } from "@/components/ui";
import { usersWithRole } from "@/lib/access";
import { ALL_PERMISSION_KEYS, PERMISSION_CATALOGUE } from "@/lib/permissions";
import { useStore } from "@/lib/store";

export default function RolesPage() {
  const { roles, users } = useStore();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="A role is a set of things staff are allowed to do. Give each person one or more roles; they can do everything their roles allow."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Create role
          </Button>
        }
      />

      <ul className="grid gap-3 md:grid-cols-2" aria-label="Roles">
        {roles.map((r) => {
          const people = usersWithRole(r.id, users).length;
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
                    {PERMISSION_CATALOGUE.map((g) => {
                      const n = g.permissions.filter((p) => r.permissions.includes(p.key)).length;
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
                      {r.permissions.length} of {ALL_PERMISSION_KEYS.length} permissions
                    </span>
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>

      {creating && <CreateRoleDialog onClose={() => setCreating(false)} />}
    </>
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
