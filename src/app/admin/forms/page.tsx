"use client";

import { ChevronRight, FileText, Info, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, Dialog, Field, Input, PageHeader, Select, Switch } from "@/components/ui";
import type { PatientCategory } from "@/lib/forms";
import { useStore, type CategoryInput } from "@/lib/store";

export default function FormsPage() {
  const { forms, categories, isModuleOn, setCategoryActive, numbering } = useStore();
  const [creating, setCreating] = useState(false);
  const [categoryDialog, setCategoryDialog] = useState<{ category?: PatientCategory } | null>(null);
  const activeCount = categories.filter((c) => c.active).length;
  const usesCat = numbering.template.includes("{CAT}");

  return (
    <>
      <PageHeader
        title="Registration forms"
        description="What records clerks fill in when they register a patient. Each patient category uses one form, so a child's registration can ask for a guardian and an antenatal one for the pregnancy."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Create form
          </Button>
        }
      />

      {!isModuleOn("medical-records") && (
        <p className="mb-4 flex gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Medical Records is off, so these forms aren&apos;t in use yet.{" "}
            <Link href="/admin/modules" className="font-medium underline">
              Switch it on
            </Link>{" "}
            when you&apos;re ready.
          </span>
        </p>
      )}

      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" aria-label="Forms">
        {forms.map((f) => {
          const used = categories.filter((c) => c.formId === f.id);
          const fieldCount = f.sections.reduce((n, s) => n + s.fields.length, 0);
          const required = f.sections.reduce((n, s) => n + s.fields.filter((x) => x.required).length, 0);
          return (
            <li key={f.id}>
              <Link href={`/admin/forms/${f.id}`} className="block h-full">
                <Card className="flex h-full flex-col p-5 transition-colors hover:border-teal/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <FileText className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden />
                      <div className="min-w-0">
                        <h2 className="font-medium">{f.name}</h2>
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted">{f.description || "No description"}</p>
                      </div>
                    </div>
                    <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
                  </div>
                  <p className="mt-3 text-sm text-muted tabular-nums">
                    {f.sections.length} sections · {fieldCount} fields · {required} required
                  </p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                    {used.length ? (
                      used.map((c) => (
                        <Badge key={c.id} tone={c.active ? "brand" : "neutral"}>
                          {c.name}
                        </Badge>
                      ))
                    ) : (
                      <Badge tone="warning">Not used by any category</Badge>
                    )}
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>

      <section className="mt-8" aria-labelledby="cat-heading">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="cat-heading" className="font-display text-lg font-semibold">
              Patient categories
            </h2>
            <p className="max-w-2xl text-sm text-muted">
              The clerk picks a category first, and that decides the form.
              {usesCat && " Your patient number format includes the category code, so codes appear in new numbers."}
            </p>
          </div>
          <Button variant="secondary" onClick={() => setCategoryDialog({})}>
            <Plus className="size-4" /> Add category
          </Button>
        </div>

        <Card className="overflow-hidden">
          <table className="w-full text-sm" aria-label="Patient categories">
            <thead className="bg-background text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Form</th>
                <th className="px-4 py-3 font-medium">In use</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {categories.map((c) => {
                const lastActive = c.active && activeCount === 1;
                return (
                  <tr key={c.id} className={c.active ? undefined : "text-muted"}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted sm:hidden">{forms.find((f) => f.id === c.formId)?.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="font-semibold">{c.code}</code>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">{forms.find((f) => f.id === c.formId)?.name}</td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={c.active}
                        onChange={(v) => setCategoryActive(c.id, v)}
                        label={`${c.name} in use`}
                        disabled={lastActive}
                        title={lastActive ? "Keep at least one category in use" : undefined}
                      />
                    </td>
                    <td className="px-2 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCategoryDialog({ category: c })}
                        aria-label={`Edit ${c.name}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </section>

      {creating && <CreateFormDialog onClose={() => setCreating(false)} />}
      {categoryDialog && <CategoryDialog category={categoryDialog.category} onClose={() => setCategoryDialog(null)} />}
    </>
  );
}

function CreateFormDialog({ onClose }: { onClose: () => void }) {
  const { forms, addForm } = useStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const [error, setError] = useState<string>();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Give the form a name, e.g. Corporate registration.");
    if (forms.some((f) => f.name.toLowerCase() === trimmed.toLowerCase()))
      return setError(`There's already a form called ${trimmed}.`);
    const form = addForm(
      trimmed,
      description.trim(),
      forms.find((f) => f.id === copyFrom),
    );
    onClose();
    router.push(`/admin/forms/${form.id}`);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Create a form"
      description="You'll arrange its fields on the next screen."
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="new-form">
            Create and edit
          </Button>
        </>
      }
    >
      <form id="new-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Form name" error={error}>
          {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Field label="Description" hint="Optional. Who is this form for?">
          {(id) => <Input id={id} value={description} onChange={(e) => setDescription(e.target.value)} />}
        </Field>
        <Field label="Start from" hint="Copy another form's sections and fields, then adjust them.">
          {(id) => (
            <Select id={id} value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
              <option value="">Core fields only</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  Copy of {f.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </form>
    </Dialog>
  );
}

function CategoryDialog({ category, onClose }: { category?: PatientCategory; onClose: () => void }) {
  const { forms, categories, addCategory, updateCategory, notify } = useStore();
  const [form, setForm] = useState<CategoryInput>(
    category
      ? { name: category.name, code: category.code, formId: category.formId }
      : { name: "", code: "", formId: forms[0]?.id ?? "" },
  );
  const [errors, setErrors] = useState<Partial<Record<keyof CategoryInput, string>>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    if (!name) next.name = "Enter the category name.";
    else if (categories.some((c) => c.id !== category?.id && c.name.toLowerCase() === name.toLowerCase()))
      next.name = `There's already a ${name} category.`;
    if (!/^[A-Z]{2,4}$/.test(code)) next.code = "Use 2 to 4 letters, e.g. HMO.";
    else if (categories.some((c) => c.id !== category?.id && c.code === code))
      next.code = `${code} is already used by another category.`;
    if (!form.formId) next.formId = "Pick a form.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const input = { name, code, formId: form.formId };
    if (category) updateCategory(category.id, input);
    else addCategory(input);
    notify(`${name} category saved`);
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={category ? `Edit ${category.name}` : "Add a patient category"}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="cat-form">
            {category ? "Save changes" : "Add category"}
          </Button>
        </>
      }
    >
      <form id="cat-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-3" noValidate>
        <div className="sm:col-span-2">
          <Field label="Category name" error={errors.name}>
            {(id) => (
              <Input
                id={id}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. HMO patient"
              />
            )}
          </Field>
        </div>
        <Field label="Code" error={errors.code}>
          {(id) => (
            <Input
              id={id}
              value={form.code}
              maxLength={4}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="uppercase"
            />
          )}
        </Field>
        <div className="sm:col-span-3">
          <Field label="Registration form" error={errors.formId}>
            {(id) => (
              <Select id={id} value={form.formId} onChange={(e) => setForm({ ...form, formId: e.target.value })}>
                {forms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        {category && category.code !== form.code.trim().toUpperCase() && (
          <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning sm:col-span-3">
            Patients already registered keep numbers with the old code. Only new registrations use the new one.
          </p>
        )}
      </form>
    </Dialog>
  );
}
