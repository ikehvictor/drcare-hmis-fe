"use client";

import clsx from "clsx";
import { AlertCircle, FileWarning, Hash, UserCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeskGate, DeskNotice, useDesk, useToday } from "@/components/desk-shell";
import { effectiveFields } from "@/components/form-preview";
import { Button, Card, Dialog, Input } from "@/components/ui";
import type { FormField } from "@/lib/forms";
import {
  dateOfBirthFor,
  formatDob,
  fullName,
  issueNumber,
  possibleMatches,
  validateRegistration,
  type Patient,
  type RegistrationDraft,
} from "@/lib/patients";
import { useStore, type PatientInput } from "@/lib/store";

export default function RegisterPage() {
  return (
    <DeskGate>
      <RegisterGate />
    </DeskGate>
  );
}

function RegisterGate() {
  const { numbering, categories, forms } = useStore();
  const usable = categories.filter((c) => c.active && forms.some((f) => f.id === c.formId));
  if (!numbering.configured)
    return (
      <DeskNotice
        icon={Hash}
        title="Patient numbers aren't set up yet"
        action={
          <Link href="/admin/numbering" className="text-sm font-medium text-teal hover:underline">
            Open Patient numbering in the hospital admin
          </Link>
        }
      >
        Every patient gets a number in your hospital&apos;s format, so the admin needs to choose that format before the
        desk can register anyone.
      </DeskNotice>
    );
  if (!usable.length)
    return (
      <DeskNotice
        icon={FileWarning}
        title="No patient categories in use"
        action={
          <Link href="/admin/forms" className="text-sm font-medium text-teal hover:underline">
            Open Registration forms
          </Link>
        }
      >
        The admin needs at least one patient category with a registration form.
      </DeskNotice>
    );
  return <RegisterForm />;
}

const EMPTY: RegistrationDraft = { values: {}, useEstimatedAge: false, estimatedAge: "", legacyNumber: "" };
const control =
  "w-full rounded-lg border bg-surface px-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20";
const fieldId = (key: string) => `reg-${key}`;
const without = (errors: Record<string, string>, ...keys: string[]) =>
  Object.fromEntries(Object.entries(errors).filter(([k]) => !keys.includes(k)));

function RegisterForm() {
  const router = useRouter();
  const store = useStore();
  const { categories, forms, numbering, patients, patientCounters, registerPatient } = store;
  const { clerk, branch, options } = useDesk();
  const today = useToday();
  const usable = categories.filter((c) => c.active && forms.some((f) => f.id === c.formId));

  const [categoryId, setCategoryId] = useState(usable.length === 1 ? usable[0]!.id : "");
  const [draft, setDraft] = useState<RegistrationDraft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [matches, setMatches] = useState<Patient[] | null>(null);

  const category = usable.find((c) => c.id === categoryId);
  const form = category && forms.find((f) => f.id === category.formId);
  const sections = form ? effectiveFields(form, options) : [];
  const errorCount = Object.keys(errors).length;

  const nextNumber =
    category && branch && today
      ? issueNumber(numbering, patientCounters, new Set(patients.map((p) => p.number.toUpperCase())), {
          branchId: branch.id,
          branchCode: branch.code,
          categoryId: category.id,
          categoryCode: category.code,
          date: today,
        }).number
      : null;

  const setValue = (key: string, value: string) => {
    setDraft((d) => ({ ...d, values: { ...d.values, [key]: value } }));
    if (errors[key]) setErrors((e) => without(e, key));
  };

  const buildInput = (): PatientInput | null => {
    if (!category || !form || !branch || !clerk || !today) return null;
    const v = (k: string) => (draft.values[k] ?? "").trim();
    const dob = dateOfBirthFor(draft, options, today);
    return {
      clerkId: clerk.id,
      branchId: branch.id,
      categoryId: category.id,
      formName: form.name,
      firstName: v("firstName"),
      lastName: v("lastName"),
      sex: v("sex"),
      phone: v("phone"),
      ...dob,
      legacyNumber: numbering.keepLegacyNumber ? draft.legacyNumber.trim() || undefined : undefined,
      sections: sections
        .map((s) => ({
          title: s.title,
          answers: s.fields.flatMap((f) => {
            if (f.key === "dateOfBirth")
              return [
                {
                  key: f.key,
                  label: f.label,
                  value: dob.dobEstimated
                    ? `Not known · estimated age ${Number(draft.estimatedAge)}`
                    : formatDob(dob.dateOfBirth),
                },
              ];
            const value = v(f.key);
            if (!value) return [];
            return [{ key: f.key, label: f.label, value: f.type === "date" ? formatDob(value) : value }];
          }),
        }))
        .filter((s) => s.answers.length > 0),
    };
  };

  const save = (input: PatientInput) => {
    const id = registerPatient(input);
    // Next keeps this page alive (hidden) after navigating away, so start "Register another" from a blank form.
    setDraft(EMPTY);
    setErrors({});
    setMatches(null);
    router.push(`/desk/patients/${id}?registered=1`);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!today) return;
    const found = validateRegistration(sections, draft, options, today);
    setErrors(found);
    const first = sections.flatMap((s) => s.fields.map((f) => f.key)).find((k) => found[k]);
    if (Object.keys(found).length) {
      const key =
        found.estimatedAge && (!first || first === "dateOfBirth") ? "estimatedAge" : (first ?? "legacyNumber");
      document.getElementById(fieldId(key))?.focus();
      return;
    }
    const input = buildInput();
    if (!input) return;
    const same = options.duplicateCheck ? possibleMatches(patients, input) : [];
    if (same.length) setMatches(same);
    else save(input);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Register a patient</h1>
        <p className="mt-1 text-sm text-muted">
          Registering at <span className="font-medium text-foreground">{branch?.name}</span>.{" "}
          <Link href="/desk" className="font-medium text-teal hover:underline">
            Search first
          </Link>{" "}
          if they may have been here before.
        </p>
      </div>

      <form onSubmit={submit} noValidate aria-label="Register a patient" className="space-y-5">
        <Card className="p-5">
          <fieldset>
            <legend className="mb-3 text-sm font-medium">Patient category</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {usable.map((c) => {
                const formName = forms.find((f) => f.id === c.formId)?.name;
                return (
                  <label
                    key={c.id}
                    className={clsx(
                      "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                      c.id === categoryId
                        ? "border-teal bg-teal-soft/50 ring-1 ring-teal"
                        : "border-line hover:bg-background",
                    )}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={c.id}
                      checked={c.id === categoryId}
                      onChange={() => setCategoryId(c.id)}
                      className="mt-0.5 size-4 accent-teal"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {c.name} <span className="font-mono text-xs text-muted">{c.code}</span>
                      </span>
                      <span className="block text-xs text-muted">{formName}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {category && (
            <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs text-muted">Patient number</div>
                <div className="font-mono text-lg font-semibold" data-testid="next-number">
                  {nextNumber}
                </div>
                <div className="text-xs text-muted">
                  Issued when you register, so it may move on if others save first.
                </div>
              </div>
              {numbering.keepLegacyNumber && (
                <div className="space-y-1 sm:w-56">
                  <label htmlFor={fieldId("legacyNumber")} className="block text-sm font-medium">
                    Old card number <span className="font-normal text-muted">(optional)</span>
                  </label>
                  <Input
                    id={fieldId("legacyNumber")}
                    value={draft.legacyNumber}
                    onChange={(e) => setDraft((d) => ({ ...d, legacyNumber: e.target.value }))}
                    aria-invalid={!!errors.legacyNumber || undefined}
                  />
                  {errors.legacyNumber && <p className="text-xs text-danger">{errors.legacyNumber}</p>}
                </div>
              )}
            </div>
          )}
        </Card>

        {!category ? (
          <p className="text-center text-sm text-muted">Choose a category to see its registration form.</p>
        ) : (
          <>
            {errorCount > 0 && (
              <div role="alert" className="flex gap-2 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {errorCount === 1 ? "1 field needs attention." : `${errorCount} fields need attention.`}
              </div>
            )}
            {sections.map((s) => (
              <Card key={s.id} className="p-5">
                <fieldset className="space-y-4">
                  <legend className="mb-3 font-display text-base font-semibold">{s.title}</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {s.fields.map((f) => (
                      <FieldRow
                        key={f.id}
                        field={f}
                        draft={draft}
                        errors={errors}
                        allowEstimatedAge={options.allowEstimatedAge}
                        onChange={setValue}
                        onEstimate={(patch) => {
                          setDraft((d) => ({ ...d, ...patch }));
                          setErrors((e) => without(e, "dateOfBirth", "estimatedAge"));
                        }}
                      />
                    ))}
                  </div>
                </fieldset>
              </Card>
            ))}
            <div className="flex flex-col-reverse gap-2 pb-8 sm:flex-row sm:justify-end">
              <Link
                href="/desk"
                className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted hover:bg-background hover:text-foreground"
              >
                Cancel
              </Link>
              <Button type="submit">
                <UserCheck className="size-4" aria-hidden /> Register patient
              </Button>
            </div>
          </>
        )}
      </form>

      <Dialog
        open={!!matches}
        onClose={() => setMatches(null)}
        title="Possible match"
        description="Someone with the same name, date of birth and phone is already registered. Is this the same patient?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMatches(null)}>
              Go back
            </Button>
            <Button
              onClick={() => {
                const input = buildInput();
                if (input && matches) save({ ...input, notMatching: matches.map((m) => m.number) });
              }}
            >
              No, register a new patient
            </Button>
          </>
        }
      >
        <ul className="space-y-2" aria-label="Possible matches">
          {matches?.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5"
            >
              <div className="min-w-0 text-sm">
                <div className="font-medium">
                  {fullName(m)} <span className="font-mono text-xs text-muted">{m.number}</span>
                </div>
                <div className="text-xs text-muted">
                  {m.dobEstimated ? `Born about ${m.dateOfBirth.slice(0, 4)}` : formatDob(m.dateOfBirth)} ·{" "}
                  {m.phone || "No phone"} · {m.branchName}
                </div>
              </div>
              <Link
                href={`/desk/patients/${m.id}`}
                className="shrink-0 text-sm font-medium whitespace-nowrap text-teal hover:underline"
              >
                Yes, open record
              </Link>
            </li>
          ))}
        </ul>
      </Dialog>
    </div>
  );
}

function FieldRow({
  field: f,
  draft,
  errors,
  allowEstimatedAge,
  onChange,
  onEstimate,
}: {
  field: FormField;
  draft: RegistrationDraft;
  errors: Record<string, string>;
  allowEstimatedAge: boolean;
  onChange: (key: string, value: string) => void;
  onEstimate: (patch: Partial<RegistrationDraft>) => void;
}) {
  const id = fieldId(f.key);
  const error = errors[f.key];
  const wide = f.type === "longtext";
  const estimating = f.key === "dateOfBirth" && allowEstimatedAge && draft.useEstimatedAge;

  return (
    <div className={clsx("space-y-1", wide && "sm:col-span-2")}>
      <label
        id={`${id}-label`}
        htmlFor={estimating ? fieldId("estimatedAge") : id}
        className="block text-sm font-medium"
      >
        {estimating ? "Estimated age (years)" : f.label}
        {f.required && (
          <span className="text-danger" aria-hidden>
            {" "}
            *
          </span>
        )}
      </label>
      {estimating ? (
        <Input
          id={fieldId("estimatedAge")}
          inputMode="numeric"
          value={draft.estimatedAge}
          onChange={(e) => onEstimate({ estimatedAge: e.target.value })}
          aria-required={f.required || undefined}
          aria-invalid={!!errors.estimatedAge || undefined}
          aria-describedby={errors.estimatedAge ? `${id}-error` : undefined}
          className={clsx(errors.estimatedAge && "border-danger")}
        />
      ) : (
        <Control field={f} id={id} value={draft.values[f.key] ?? ""} error={!!error} onChange={onChange} />
      )}
      {(estimating ? errors.estimatedAge : error) ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {estimating ? errors.estimatedAge : error}
        </p>
      ) : (
        f.help && f.key !== "dateOfBirth" && <p className="text-xs text-muted">{f.help}</p>
      )}
      {f.key === "dateOfBirth" && allowEstimatedAge && (
        <label className="flex items-center gap-2 pt-0.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={draft.useEstimatedAge}
            onChange={(e) => onEstimate({ useEstimatedAge: e.target.checked })}
            className="size-3.5 accent-teal"
          />
          Doesn&apos;t know their date of birth
        </label>
      )}
    </div>
  );
}

function Control({
  field: f,
  id,
  value,
  error,
  onChange,
}: {
  field: FormField;
  id: string;
  value: string;
  error: boolean;
  onChange: (key: string, value: string) => void;
}) {
  const common = {
    id,
    name: f.key,
    "aria-required": f.required || undefined,
    "aria-invalid": error || undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
  const border = error ? "border-danger" : "border-line";
  switch (f.type) {
    case "longtext":
      return (
        <textarea
          {...common}
          rows={2}
          value={value}
          onChange={(e) => onChange(f.key, e.target.value)}
          className={clsx(control, border, "py-2")}
        />
      );
    case "select":
      return (
        <select
          {...common}
          value={value}
          onChange={(e) => onChange(f.key, e.target.value)}
          className={clsx(control, border, "h-10")}
        >
          <option value="">Choose…</option>
          {(f.options ?? []).filter(Boolean).map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      );
    case "yesno":
      return (
        <div className="flex h-10 items-center gap-4 text-sm" role="radiogroup" aria-labelledby={`${id}-label`}>
          {["Yes", "No"].map((o) => (
            <label key={o} className="flex items-center gap-2">
              <input
                type="radio"
                id={o === "Yes" ? id : undefined}
                name={f.key}
                value={o}
                checked={value === o}
                onChange={() => onChange(f.key, o)}
                className="size-4 accent-teal"
              />{" "}
              {o}
            </label>
          ))}
        </div>
      );
    default: {
      const type = { number: "number", date: "date", phone: "tel", email: "email", text: "text" }[f.type];
      return (
        <input
          {...common}
          type={type}
          value={value}
          onChange={(e) => onChange(f.key, e.target.value)}
          className={clsx(control, border, "h-10")}
        />
      );
    }
  }
}
