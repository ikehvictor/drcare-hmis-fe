"use client";

import { Pencil, Plus, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, Dialog, Field, Input, PageHeader } from "@/components/ui";
import { useStore, type StaffCategoryInput } from "@/lib/store";
import type { StaffCategory } from "@/lib/types";

export default function StaffCategoriesPage() {
  const { staffCategories, users, roles, deleteStaffCategory, notify, ready } = useStore();
  const [editing, setEditing] = useState<{ category?: StaffCategory } | null>(null);
  const [deleting, setDeleting] = useState<StaffCategory | null>(null);
  if (!ready) return null;

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id;

  return (
    <>
      <PageHeader
        title="Staff categories"
        description="The kinds of staff you have, like Doctor or Nurse, and their specialties. A category can suggest roles, so new accounts start with the right access."
        actions={
          <Button onClick={() => setEditing({})}>
            <Plus className="size-4" /> Add category
          </Button>
        }
      />

      <ul className="grid gap-3 md:grid-cols-2" aria-label="Staff categories">
        {staffCategories.map((c) => {
          const people = users.filter((u) => u.staffCategoryId === c.id);
          return (
            <li key={c.id}>
              <Card className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-medium">{c.name}</h2>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing({ category: c })}
                      aria-label={`Edit ${c.name}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleting(c)}
                      disabled={people.length > 0}
                      title={people.length ? "Move everyone to another category first" : undefined}
                      aria-label={`Delete ${c.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted">Specialties</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {c.specialties.length ? (
                    c.specialties.map((sp) => <Badge key={sp}>{sp}</Badge>)
                  ) : (
                    <span className="text-sm text-muted">None</span>
                  )}
                </div>
                <div className="mt-3 text-xs text-muted">Suggested roles</div>
                <p className="mt-0.5 text-sm">
                  {c.defaultRoleIds.length ? c.defaultRoleIds.map(roleName).join(", ") : "None"}
                </p>
                <div className="mt-auto pt-4 text-sm text-muted">
                  <Link
                    href="/admin/users"
                    className="inline-flex items-center gap-1.5 hover:text-foreground"
                    data-testid="category-people"
                  >
                    <Users className="size-4" aria-hidden /> {people.length} {people.length === 1 ? "person" : "people"}
                  </Link>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      {editing && <CategoryDialog category={editing.category} onClose={() => setEditing(null)} />}
      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleting) {
                  deleteStaffCategory(deleting.id);
                  notify(`${deleting.name} deleted`);
                }
                setDeleting(null);
              }}
            >
              Delete category
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">Nobody is in this category, so nothing else changes.</p>
      </Dialog>
    </>
  );
}

function CategoryDialog({ category, onClose }: { category?: StaffCategory; onClose: () => void }) {
  const { staffCategories, roles, addStaffCategory, updateStaffCategory, notify } = useStore();
  const [name, setName] = useState(category?.name ?? "");
  const [specialties, setSpecialties] = useState<string[]>(category?.specialties ?? []);
  const [newSpecialty, setNewSpecialty] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>(category?.defaultRoleIds ?? []);
  const [error, setError] = useState<string>();

  const addSpecialty = () => {
    const sp = newSpecialty.trim();
    if (sp && !specialties.some((x) => x.toLowerCase() === sp.toLowerCase())) setSpecialties((s) => [...s, sp]);
    setNewSpecialty("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Give the category a name, e.g. Doctor.");
    if (staffCategories.some((c) => c.id !== category?.id && c.name.toLowerCase() === trimmed.toLowerCase()))
      return setError(`There's already a category called ${trimmed}.`);
    // A specialty typed but not yet added still counts.
    const pending = newSpecialty.trim();
    const all = pending && !specialties.includes(pending) ? [...specialties, pending] : specialties;
    const input: StaffCategoryInput = { name: trimmed, specialties: all, defaultRoleIds: roleIds };
    if (category) updateStaffCategory(category.id, input);
    else addStaffCategory(input);
    notify(`${trimmed} saved`);
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={category ? `Edit ${category.name}` : "Add a staff category"}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="category-form">
            Save category
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Category name" error={error}>
          {(id) => (
            <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pharmacist" />
          )}
        </Field>

        <fieldset>
          <legend className="text-sm font-medium">Specialties</legend>
          <p className="text-xs text-muted">Optional, e.g. Cardiology or Paediatrics.</p>
          {specialties.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Specialties">
              {specialties.map((sp) => (
                <li key={sp}>
                  <span className="inline-flex items-center gap-1 rounded-full bg-background py-0.5 pr-1 pl-2.5 text-xs ring-1 ring-line">
                    {sp}
                    <button
                      type="button"
                      onClick={() => setSpecialties((s) => s.filter((x) => x !== sp))}
                      className="rounded-full px-1 text-muted hover:text-danger"
                      aria-label={`Remove ${sp}`}
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex gap-2">
            <Input
              aria-label="New specialty"
              value={newSpecialty}
              onChange={(e) => setNewSpecialty(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSpecialty();
                }
              }}
              placeholder="Add a specialty"
            />
            <Button type="button" variant="secondary" onClick={addSpecialty}>
              Add
            </Button>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium">Suggested roles</legend>
          <p className="text-xs text-muted">
            Ticked for new accounts in this category. You can still change them for each person.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {roles.map((r) => (
              <label key={r.id} className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={roleIds.includes(r.id)}
                  onChange={(e) =>
                    setRoleIds((ids) => (e.target.checked ? [...ids, r.id] : ids.filter((x) => x !== r.id)))
                  }
                  className="size-4 accent-teal"
                />
                {r.name}
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </Dialog>
  );
}
