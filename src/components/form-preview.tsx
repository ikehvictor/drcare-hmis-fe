"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import type { FormField, RegistrationForm } from "@/lib/forms";

export interface RecordsOptions {
  requirePhone: boolean;
  allowEstimatedAge: boolean;
  captureNextOfKin: boolean;
}

const NOK_KEYS = ["nokName", "nokRelationship", "nokPhone"];

/** Applies Medical Records options to a form: what's required and which fields show. */
export function effectiveFields(form: RegistrationForm, options: RecordsOptions) {
  return form.sections
    .map((s) => ({
      ...s,
      fields: s.fields
        .filter((f) => options.captureNextOfKin || !NOK_KEYS.includes(f.key))
        .map((f) => (f.key === "phone" ? { ...f, required: options.requirePhone } : f)),
    }))
    .filter((s) => s.fields.length > 0);
}

const control =
  "w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20";

function PreviewInput({ field, id }: { field: FormField; id: string }) {
  const common = { id, name: field.key, "aria-required": field.required || undefined };
  switch (field.type) {
    case "longtext":
      return <textarea {...common} rows={2} className={`${control} py-2`} />;
    case "select":
      return (
        <select {...common} className={`${control} h-10`} defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          {(field.options ?? []).filter(Boolean).map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      );
    case "yesno":
      return (
        <div className="flex gap-4 text-sm" role="radiogroup" aria-labelledby={`${id}-label`}>
          {["Yes", "No"].map((o) => (
            <label key={o} className="flex items-center gap-2">
              <input type="radio" name={field.key} value={o} className="size-4 accent-teal" /> {o}
            </label>
          ))}
        </div>
      );
    default: {
      const type = { number: "number", date: "date", phone: "tel", email: "email", text: "text" }[field.type];
      return <input {...common} type={type} className={`${control} h-10`} />;
    }
  }
}

/** The form as a records clerk will see it. Fill it in and press Check to try the required fields. */
export function FormPreview({ form, options }: { form: RegistrationForm; options: RecordsOptions }) {
  const [result, setResult] = useState<{ missing: string[] } | null>(null);
  const sections = effectiveFields(form, options);

  const check = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const missing = sections.flatMap((s) =>
      s.fields
        .filter((f) => f.required)
        .filter((f) => {
          if (f.key === "dateOfBirth" && options.allowEstimatedAge && String(data.get("estimatedAge") ?? "").trim())
            return false;
          return !String(data.get(f.key) ?? "").trim();
        })
        .map((f) => f.label),
    );
    setResult({ missing });
  };

  return (
    <form onSubmit={check} onReset={() => setResult(null)} noValidate aria-label="Form preview" className="space-y-5">
      {sections.map((s) => (
        <fieldset key={s.id} className="space-y-3">
          <legend className="mb-1 text-xs font-semibold tracking-wider text-muted uppercase">
            {s.title || "Untitled section"}
          </legend>
          {s.fields.map((f) => {
            const id = `pv-${f.id}`;
            return (
              <div key={f.id} className="space-y-1">
                <label id={`${id}-label`} htmlFor={id} className="block text-sm font-medium">
                  {f.label || "Untitled field"}
                  {f.required && (
                    <span className="text-danger" aria-label="required">
                      {" "}
                      *
                    </span>
                  )}
                </label>
                <PreviewInput field={f} id={id} />
                {f.key === "dateOfBirth" && options.allowEstimatedAge ? (
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <label htmlFor="pv-estimated-age">Don&apos;t know it? Estimated age</label>
                    <input
                      id="pv-estimated-age"
                      name="estimatedAge"
                      type="number"
                      min={0}
                      className={`${control} h-8 w-20`}
                    />
                    <span>years</span>
                  </div>
                ) : (
                  f.help && f.key !== "dateOfBirth" && <p className="text-xs text-muted">{f.help}</p>
                )}
              </div>
            );
          })}
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <Button type="submit" size="sm">
          Check required fields
        </Button>
        <Button type="reset" size="sm" variant="ghost">
          Clear
        </Button>
      </div>
      {/* Announced politely; role="status" is kept for the app's toast. */}
      <div aria-live="polite">
        {result &&
          (result.missing.length ? (
            <p className="flex gap-2 text-sm text-danger">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              Still needed: {result.missing.join(", ")}
            </p>
          ) : (
            <p className="flex gap-2 text-sm text-success">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> All required fields are filled in.
            </p>
          ))}
      </div>
    </form>
  );
}
