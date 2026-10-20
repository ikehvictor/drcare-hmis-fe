"use client";

import clsx from "clsx";
import { AlertCircle, ArrowDown, ArrowLeft, ArrowUp, Lock, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { FormPreview, type RecordsOptions } from "@/components/form-preview";
import { Badge, Button, Card, Dialog, Field, Input, SaveBar, Select, Switch } from "@/components/ui";
import {
  customKey,
  FIELD_TYPES,
  fieldKeysOf,
  fieldTypeLabel,
  STANDARD_FIELDS,
  validateForm,
  type FieldType,
  type FormField,
  type FormSection,
  type RegistrationForm,
} from "@/lib/forms";
import { useStore } from "@/lib/store";

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;
const move = <T,>(list: T[], from: number, to: number) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
};

export function FormBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const { forms, ready } = useStore();
  const form = forms.find((f) => f.id === id);

  if (!ready) return null;
  if (!form) {
    return (
      <Card className="mx-auto mt-10 max-w-md p-8 text-center">
        <h1 className="font-display text-xl font-semibold">Form not found</h1>
        <Link href="/admin/forms" className="mt-4 inline-block text-sm font-medium text-teal hover:underline">
          Back to forms
        </Link>
      </Card>
    );
  }
  return <FormBuilder key={`${form.id}-${form.updatedAt}`} saved={form} />;
}

type FieldDialogState = { sectionId: string; field?: FormField } | null;

function FormBuilder({ saved }: { saved: RegistrationForm }) {
  const { forms, categories, modules, saveForm, deleteForm, notify } = useStore();
  const router = useRouter();
  const [draft, setDraft] = useState<RegistrationForm>(() => structuredClone(saved));
  const [showErrors, setShowErrors] = useState(false);
  const [fieldDialog, setFieldDialog] = useState<FieldDialogState>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const recordSettings = modules["medical-records"]?.settings ?? {};
  const options: RecordsOptions = {
    requirePhone: recordSettings.requirePhone !== false,
    allowEstimatedAge: recordSettings.allowEstimatedAge !== false,
    captureNextOfKin: recordSettings.captureNextOfKin !== false,
  };

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const errors = validateForm(
    draft,
    forms.filter((f) => f.id !== saved.id).map((f) => f.name),
  );
  const usedBy = categories.filter((c) => c.formId === saved.id);
  const onForm = new Set(fieldKeysOf(draft));

  const updateSections = (fn: (s: FormSection[]) => FormSection[]) =>
    setDraft((d) => ({ ...d, sections: fn(d.sections) }));
  const updateSection = (id: string, fn: (s: FormSection) => FormSection) =>
    updateSections((ss) => ss.map((s) => (s.id === id ? fn(s) : s)));

  const upsertField = (sectionId: string, field: FormField) =>
    updateSections((ss) => {
      // Remove from wherever it was, then put it in the chosen section (end, unless it stayed put).
      const from = ss.find((s) => s.fields.some((f) => f.id === field.id));
      if (from?.id === sectionId) {
        return ss.map((s) =>
          s.id === sectionId ? { ...s, fields: s.fields.map((f) => (f.id === field.id ? field : f)) } : s,
        );
      }
      return ss.map((s) => {
        const without = s.fields.filter((f) => f.id !== field.id);
        return s.id === sectionId ? { ...s, fields: [...without, field] } : { ...s, fields: without };
      });
    });

  const save = () => {
    if (errors.length) {
      setShowErrors(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    saveForm({
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
      sections: draft.sections.map((s) => ({
        ...s,
        title: s.title.trim(),
        fields: s.fields.map((f) => ({
          ...f,
          label: f.label.trim(),
          options: f.options?.map((o) => o.trim()).filter(Boolean),
        })),
      })),
    });
    setShowErrors(false);
    notify(`${draft.name.trim()} saved`);
  };

  return (
    <div className={clsx(dirty && "pb-24")}>
      <Link
        href="/admin/forms"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All forms
      </Link>

      {showErrors && errors.length > 0 && (
        <div className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          <p className="font-medium">Fix these before saving:</p>
          <ul className="mt-1 list-disc pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Form name">
              {(id) => (
                <Input id={id} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              )}
            </Field>
            <Field label="Description">
              {(id) => (
                <Input
                  id={id}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              )}
            </Field>
            <p className="text-sm text-muted sm:col-span-2">
              Used by:{" "}
              {usedBy.length
                ? usedBy.map((c) => c.name).join(", ")
                : "no category yet — pick this form for one under Patient categories"}
            </p>
          </Card>

          {!options.captureNextOfKin && draft.sections.some((s) => s.fields.some((f) => f.key.startsWith("nok"))) && (
            <p className="flex gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Next of kin fields are hidden because{" "}
                <Link href="/admin/modules/medical-records" className="underline">
                  Medical Records
                </Link>{" "}
                is set not to capture next of kin.
              </span>
            </p>
          )}

          {draft.sections.map((section, si) => (
            <Card key={section.id} className="overflow-hidden">
              <section aria-label={`Section: ${section.title || "Untitled"}`}>
                <div className="flex items-center gap-2 border-b border-line bg-background/60 px-4 py-2.5">
                  <Input
                    aria-label="Section title"
                    value={section.title}
                    onChange={(e) => updateSection(section.id, (s) => ({ ...s, title: e.target.value }))}
                    className="h-9 flex-1 border-transparent bg-transparent font-display font-semibold hover:border-line"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={si === 0}
                    onClick={() => updateSections((ss) => move(ss, si, si - 1))}
                    aria-label={`Move section ${section.title} up`}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={si === draft.sections.length - 1}
                    onClick={() => updateSections((ss) => move(ss, si, si + 1))}
                    aria-label={`Move section ${section.title} down`}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={section.fields.length > 0}
                    title={section.fields.length ? "Move or remove its fields first" : undefined}
                    onClick={() => updateSections((ss) => ss.filter((s) => s.id !== section.id))}
                    aria-label={`Delete section ${section.title}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <ul className="divide-y divide-line">
                  {section.fields.map((f, fi) => (
                    <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-sm">
                          <span className="font-medium">{f.label || "Untitled field"}</span>
                          {f.kind === "core" && (
                            <Badge tone="brand">
                              <Lock className="size-3" aria-hidden /> Core
                            </Badge>
                          )}
                          {f.kind === "custom" && <Badge tone="warning">Custom</Badge>}
                        </div>
                        <p className="text-xs text-muted">
                          {fieldTypeLabel(f.type)}
                          {f.type === "select" && f.options?.length ? ` · ${f.options.length} choices` : ""}
                          {f.key === "phone" && " · required is set in Medical Records options"}
                        </p>
                      </div>
                      <label className="flex shrink-0 items-center gap-2 text-xs text-muted">
                        <span className="hidden sm:inline">Required</span>
                        <Switch
                          checked={f.key === "phone" ? options.requirePhone : f.required}
                          disabled={f.kind === "core"}
                          onChange={(v) =>
                            updateSection(section.id, (s) => ({
                              ...s,
                              fields: s.fields.map((x) => (x.id === f.id ? { ...x, required: v } : x)),
                            }))
                          }
                          label={`${f.label} required`}
                        />
                      </label>
                      <div className="flex shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={fi === 0}
                          onClick={() =>
                            updateSection(section.id, (s) => ({ ...s, fields: move(s.fields, fi, fi - 1) }))
                          }
                          aria-label={`Move ${f.label} up`}
                        >
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={fi === section.fields.length - 1}
                          onClick={() =>
                            updateSection(section.id, (s) => ({ ...s, fields: move(s.fields, fi, fi + 1) }))
                          }
                          aria-label={`Move ${f.label} down`}
                        >
                          <ArrowDown className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFieldDialog({ sectionId: section.id, field: f })}
                          aria-label={`Edit ${f.label}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        {f.kind !== "core" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updateSection(section.id, (s) => ({
                                ...s,
                                fields: s.fields.filter((x) => x.id !== f.id),
                              }))
                            }
                            aria-label={`Remove ${f.label}`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                  {section.fields.length === 0 && <li className="px-4 py-4 text-sm text-muted">No fields yet.</li>}
                </ul>
                <div className="border-t border-line px-4 py-2">
                  <Button variant="ghost" size="sm" onClick={() => setFieldDialog({ sectionId: section.id })}>
                    <Plus className="size-3.5" /> Add field to {section.title || "this section"}
                  </Button>
                </div>
              </section>
            </Card>
          ))}

          <Button
            variant="secondary"
            onClick={() => updateSections((ss) => [...ss, { id: uid("sec"), title: "New section", fields: [] }])}
          >
            <Plus className="size-4" /> Add section
          </Button>

          <Card className="p-5">
            <h2 className="font-display font-semibold">Delete form</h2>
            <p className="mt-1 text-sm text-muted">
              {usedBy.length
                ? `Used by ${usedBy.map((c) => c.name).join(", ")}. Give ${usedBy.length === 1 ? "it" : "them"} another form first.`
                : "No category uses this form, so it can be deleted."}
            </p>
            <Button
              variant="secondary"
              className="mt-3 text-danger"
              disabled={usedBy.length > 0}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" /> Delete form
            </Button>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <h2 className="font-display font-semibold">Preview</h2>
            <p className="mb-4 text-xs text-muted">What a records clerk sees. Try filling it in.</p>
            <FormPreview form={draft} options={options} />
          </Card>
        </div>
      </div>

      {dirty && (
        <SaveBar
          onDiscard={() => {
            setDraft(structuredClone(saved));
            setShowErrors(false);
          }}
          onSave={save}
          saveLabel="Save form"
        >
          {errors.length ? `Unsaved changes · ${errors.length} to fix` : "Unsaved changes"}
        </SaveBar>
      )}

      {fieldDialog && (
        <FieldDialog
          state={fieldDialog}
          sections={draft.sections}
          onForm={onForm}
          onClose={() => setFieldDialog(null)}
          onSave={(sectionId, field) => {
            upsertField(sectionId, field);
            setFieldDialog(null);
          }}
        />
      )}

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${saved.name}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                deleteForm(saved.id);
                notify(`${saved.name} deleted`);
                router.push("/admin/forms");
              }}
            >
              Delete form
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          The form is removed for good. No category uses it, so registration isn&apos;t affected.
        </p>
      </Dialog>
    </div>
  );
}

function FieldDialog({
  state,
  sections,
  onForm,
  onClose,
  onSave,
}: {
  state: NonNullable<FieldDialogState>;
  sections: FormSection[];
  onForm: Set<string>;
  onClose: () => void;
  onSave: (sectionId: string, field: FormField) => void;
}) {
  const editing = state.field;
  const [tab, setTab] = useState<"library" | "custom">(editing ? "custom" : "library");
  const [query, setQuery] = useState("");
  const [sectionId, setSectionId] = useState(state.sectionId);
  const [label, setLabel] = useState(editing?.label ?? "");
  const [type, setType] = useState<FieldType>(editing?.type ?? "text");
  const [help, setHelp] = useState(editing?.help ?? "");
  const [required, setRequired] = useState(editing?.required ?? false);
  const [choices, setChoices] = useState((editing?.options ?? []).join("\n"));
  const [error, setError] = useState<string>();

  const library = STANDARD_FIELDS.filter(
    (f) => !onForm.has(f.key) && f.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const canChangeShape = !editing || editing.kind === "custom";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return setError("Give the field a label.");
    const options = choices
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);
    if (type === "select" && options.length < 2)
      return setError("A dropdown needs at least two choices, one per line.");
    const key = editing?.key ?? customKey(trimmed);
    if (!editing && onForm.has(key)) return setError(`This form already has a field called ${trimmed}.`);
    onSave(sectionId, {
      id: editing?.id ?? uid("fld"),
      key,
      kind: editing?.kind ?? "custom",
      label: trimmed,
      type,
      required: editing?.kind === "core" ? true : required,
      help: help.trim() || undefined,
      options: type === "select" ? options : undefined,
    });
  };

  const sectionSelect = (
    <Field label="Section">
      {(id) => (
        <Select id={id} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title || "Untitled section"}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? `Edit ${editing.label}` : "Add a field"}
      footer={
        tab === "custom" ? (
          <>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="field-form">
              {editing ? "Done" : "Add field"}
            </Button>
          </>
        ) : undefined
      }
    >
      {!editing && (
        <div
          className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-background p-1"
          role="tablist"
          aria-label="Field source"
        >
          {(
            [
              ["library", "From the library"],
              ["custom", "Make your own"],
            ] as const
          ).map(([value, text]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={clsx(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                tab === value ? "bg-surface shadow-sm" : "text-muted hover:text-foreground",
              )}
            >
              {text}
            </button>
          ))}
        </div>
      )}

      {tab === "library" ? (
        <div className="space-y-3">
          {sectionSelect}
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <Input
              aria-label="Search the field library"
              placeholder="Search, e.g. blood group"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <ul
            className="max-h-72 divide-y divide-line overflow-y-auto rounded-lg border border-line"
            aria-label="Field library"
          >
            {library.map((f) => (
              <li key={f.key}>
                <button
                  type="button"
                  onClick={() =>
                    onSave(sectionId, { ...f, id: uid("fld"), kind: "standard", options: f.options && [...f.options] })
                  }
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-background"
                >
                  <span className="font-medium">{f.label}</span>
                  <span className="text-xs text-muted">{fieldTypeLabel(f.type)}</span>
                </button>
              </li>
            ))}
            {library.length === 0 && (
              <li className="px-3 py-4 text-sm text-muted">
                {query
                  ? "No library field matches. Make your own instead."
                  : "Every library field is already on this form."}
              </li>
            )}
          </ul>
        </div>
      ) : (
        <form id="field-form" onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Label" error={error}>
            {(id) => (
              <Input
                id={id}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Church or mosque"
              />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Answer type" hint={canChangeShape ? undefined : "Fixed for library and core fields."}>
              {(id) => (
                <Select
                  id={id}
                  value={type}
                  disabled={!canChangeShape}
                  onChange={(e) => setType(e.target.value as FieldType)}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {sectionSelect}
          </div>
          {type === "select" && (
            <Field label="Choices" hint="One per line.">
              {(id) => (
                <textarea
                  id={id}
                  rows={4}
                  value={choices}
                  disabled={!canChangeShape}
                  onChange={(e) => setChoices(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none disabled:opacity-60"
                />
              )}
            </Field>
          )}
          <Field label="Help text" hint="Optional. Shown under the field.">
            {(id) => <Input id={id} value={help} onChange={(e) => setHelp(e.target.value)} />}
          </Field>
          {editing?.kind !== "core" && (
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="size-4 accent-teal"
              />
              Required
            </label>
          )}
        </form>
      )}
    </Dialog>
  );
}
