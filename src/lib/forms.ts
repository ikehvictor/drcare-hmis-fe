// Registration forms (docs/ARCHITECTURE.md §5.1): a fixed core every record needs, standard fields a hospital can
// switch on, and custom fields it invents. The layout (sections, order, required, help text) is data the admin edits.

export type FieldType = "text" | "longtext" | "number" | "date" | "select" | "yesno" | "phone" | "email";

export const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "longtext", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "yesno", label: "Yes / No" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
];

export const fieldTypeLabel = (t: FieldType) => FIELD_TYPES.find((f) => f.value === t)?.label ?? t;

export interface FormField {
  id: string;
  /** Stable name the record stores the answer under. */
  key: string;
  label: string;
  type: FieldType;
  /** core: always on the form; standard: from our library; custom: made by the hospital. */
  kind: "core" | "standard" | "custom";
  required: boolean;
  help?: string;
  options?: string[];
}

export interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
}

export interface RegistrationForm {
  id: string;
  name: string;
  description: string;
  sections: FormSection[];
  updatedAt: string;
}

export interface PatientCategory {
  id: string;
  /** Used by {CAT} in patient numbers. */
  code: string;
  name: string;
  formId: string;
  active: boolean;
}

type FieldSeed = Omit<FormField, "id" | "kind">;

/** Fields every patient record has. They can be reordered and given help text, but not removed. */
export const CORE_FIELDS: FieldSeed[] = [
  { key: "firstName", label: "First name", type: "text", required: true },
  { key: "lastName", label: "Surname", type: "text", required: true },
  { key: "sex", label: "Sex", type: "select", required: true, options: ["Female", "Male"] },
  {
    key: "dateOfBirth",
    label: "Date of birth",
    type: "date",
    required: true,
    help: "Or an estimated age, if Medical Records allows it.",
  },
  { key: "phone", label: "Phone number", type: "phone", required: true },
];

/** Fields we provide that a hospital can add to any form. */
export const STANDARD_FIELDS: FieldSeed[] = [
  { key: "middleName", label: "Middle name", type: "text", required: false },
  { key: "email", label: "Email", type: "email", required: false },
  { key: "address", label: "Home address", type: "longtext", required: false },
  { key: "stateOfOrigin", label: "State of origin", type: "text", required: false },
  {
    key: "maritalStatus",
    label: "Marital status",
    type: "select",
    required: false,
    options: ["Single", "Married", "Divorced", "Widowed"],
  },
  { key: "occupation", label: "Occupation", type: "text", required: false },
  { key: "religion", label: "Religion", type: "select", required: false, options: ["Christianity", "Islam", "Other"] },
  {
    key: "bloodGroup",
    label: "Blood group",
    type: "select",
    required: false,
    options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  },
  { key: "genotype", label: "Genotype", type: "select", required: false, options: ["AA", "AS", "AC", "SS", "SC"] },
  { key: "allergies", label: "Known allergies", type: "longtext", required: false },
  { key: "nationalId", label: "National ID (NIN)", type: "text", required: false },
  { key: "nokName", label: "Next of kin name", type: "text", required: false },
  {
    key: "nokRelationship",
    label: "Next of kin relationship",
    type: "select",
    required: false,
    options: ["Spouse", "Parent", "Child", "Sibling", "Other"],
  },
  { key: "nokPhone", label: "Next of kin phone", type: "phone", required: false },
  { key: "guardianName", label: "Parent or guardian name", type: "text", required: false },
  { key: "guardianPhone", label: "Parent or guardian phone", type: "phone", required: false },
  { key: "lmp", label: "Last menstrual period (LMP)", type: "date", required: false },
  { key: "gravida", label: "Number of pregnancies", type: "number", required: false },
  { key: "employer", label: "Employer", type: "text", required: false },
  { key: "staffId", label: "Staff ID", type: "text", required: false },
];

export const isCoreKey = (key: string) => CORE_FIELDS.some((f) => f.key === key);

export const fieldKeysOf = (form: RegistrationForm) => form.sections.flatMap((s) => s.fields.map((f) => f.key));

/** Turns a label into a field key, e.g. "Church name" → "custom_church_name". */
export const customKey = (label: string) =>
  `custom_${label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")}`;

/** Problems that stop a form being saved. */
export function validateForm(form: RegistrationForm, otherNames: string[]): string[] {
  const errors: string[] = [];
  if (!form.name.trim()) errors.push("Give the form a name.");
  else if (otherNames.some((n) => n.toLowerCase() === form.name.trim().toLowerCase()))
    errors.push(`There's already a form called ${form.name.trim()}.`);
  for (const s of form.sections) {
    if (!s.title.trim()) errors.push("Every section needs a title.");
    for (const f of s.fields) {
      if (!f.label.trim()) errors.push("Every field needs a label.");
      if (f.type === "select" && (f.options ?? []).filter((o) => o.trim()).length < 2)
        errors.push(`“${f.label || "Untitled"}” needs at least two choices.`);
    }
  }
  const keys = fieldKeysOf(form);
  for (const core of CORE_FIELDS) if (!keys.includes(core.key)) errors.push(`${core.label} must stay on the form.`);
  return [...new Set(errors)];
}
