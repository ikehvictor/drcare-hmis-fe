"use client";

import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button, Dialog, Field, Input, Select } from "@/components/ui";
import { EMAIL_RE, passwordProblems } from "@/lib/access";
import { useStore, type UserInput } from "@/lib/store";
import type { User } from "@/lib/types";

const empty: UserInput = {
  name: "",
  email: "",
  phone: "",
  jobTitle: "",
  staffCategoryId: "",
  specialty: "",
  roleIds: [],
  branchScope: "all",
};

type Errors = Partial<Record<keyof UserInput | "password" | "confirm", string>>;

/** A password box with a show/hide button, for the admin typing a password for someone else. */
export function PasswordInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={shown ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"
        aria-label={shown ? "Hide password" : "Show password"}
      >
        {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function UserFormDialog({
  user,
  onClose,
  onSaved,
}: {
  user?: User;
  onClose: () => void;
  onSaved?: (u: User) => void;
}) {
  const { users, roles, branches, staffCategories, settings, createUser, updateUser, currentUserId, notify } =
    useStore();
  const [form, setForm] = useState<UserInput>(
    user
      ? {
          name: user.name,
          email: user.email,
          phone: user.phone,
          jobTitle: user.jobTitle,
          staffCategoryId: user.staffCategoryId ?? "",
          specialty: user.specialty ?? "",
          roleIds: user.roleIds,
          branchScope: user.branchScope,
        }
      : empty,
  );
  const [errors, setErrors] = useState<Errors>({});
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mustChange, setMustChange] = useState(true);
  // New accounts start with the category's suggested roles until the admin picks roles themselves.
  const [rolesTouched, setRolesTouched] = useState(!!user);
  const category = staffCategories.find((c) => c.id === form.staffCategoryId);
  const minLength = settings.security.passwordMinLength;
  const isSelf = user?.id === currentUserId;
  const activeBranches = branches.filter((b) => b.active);
  const pickedBranches = form.branchScope === "all" ? [] : form.branchScope;

  const set = <K extends keyof UserInput>(k: K, v: UserInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleIn = (list: string[], id: string, on: boolean) => (on ? [...list, id] : list.filter((x) => x !== id));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    const email = form.email.trim().toLowerCase();
    if (!form.name.trim()) next.name = "Enter their full name.";
    if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
    else if (users.some((u) => u.email.toLowerCase() === email && u.id !== user?.id))
      next.email = "Someone already uses this email.";
    if (!form.roleIds.length) next.roleIds = "Pick at least one role.";
    if (!user) {
      const problems = passwordProblems(password, minLength, email);
      if (problems.length) next.password = problems.join(" ");
      else if (password !== confirm) next.confirm = "The two passwords don't match.";
    }
    if (form.branchScope !== "all" && !form.branchScope.length) next.branchScope = "Pick at least one branch.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const input: UserInput = {
      ...form,
      name: form.name.trim(),
      email,
      phone: form.phone.trim(),
      jobTitle: form.jobTitle.trim(),
      staffCategoryId: form.staffCategoryId || undefined,
      specialty: (category?.specialties.length && form.specialty) || undefined,
    };
    if (user) {
      updateUser(user.id, input);
      notify(`${input.name}'s account updated`);
      onSaved?.({ ...user, ...input });
    } else {
      const created = createUser(input, mustChange);
      notify(`Account created for ${input.name}`);
      onSaved?.(created);
    }
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={user ? `Edit ${user.name}` : "Create a staff account"}
      description={user ? undefined : "The account works straight away. Give them their email and password privately."}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="user-form">
            {user ? "Save changes" : "Create account"}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" error={errors.name}>
            {(id) => (
              <Input id={id} value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="off" />
            )}
          </Field>
          <Field label="Job title" hint="Optional, e.g. Staff Nurse">
            {(id) => <Input id={id} value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} />}
          </Field>
          <Field label="Work email" error={errors.email}>
            {(id) => (
              <Input
                id={id}
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                autoComplete="off"
              />
            )}
          </Field>
          <Field label="Phone" hint="Optional">
            {(id) => <Input id={id} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />}
          </Field>
          <Field label="Staff category" hint="Optional. Doctor, Nurse, Cashier…">
            {(id) => (
              <Select
                id={id}
                value={form.staffCategoryId ?? ""}
                onChange={(e) => {
                  const next = staffCategories.find((c) => c.id === e.target.value);
                  setForm((f) => ({
                    ...f,
                    staffCategoryId: e.target.value,
                    specialty: "",
                    roleIds: rolesTouched ? f.roleIds : (next?.defaultRoleIds ?? []),
                  }));
                }}
              >
                <option value="">No category</option>
                {staffCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {category && category.specialties.length > 0 && (
            <Field label="Specialty" hint="Optional">
              {(id) => (
                <Select id={id} value={form.specialty ?? ""} onChange={(e) => set("specialty", e.target.value)}>
                  <option value="">None</option>
                  {/* Keep a specialty the category no longer lists, so editing doesn't drop it silently. */}
                  {[
                    ...category.specialties,
                    ...(form.specialty && !category.specialties.includes(form.specialty) ? [form.specialty] : []),
                  ].map((sp) => (
                    <option key={sp}>{sp}</option>
                  ))}
                </Select>
              )}
            </Field>
          )}
        </div>

        {!user && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Password</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Password"
                error={errors.password}
                hint={`At least ${minLength} characters, letters and numbers.`}
              >
                {(id) => <PasswordInput id={id} value={password} onChange={setPassword} />}
              </Field>
              <Field label="Type it again" error={errors.confirm}>
                {(id) => <PasswordInput id={id} value={confirm} onChange={setConfirm} />}
              </Field>
            </div>
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={mustChange}
                onChange={(e) => setMustChange(e.target.checked)}
                className="size-4 accent-teal"
              />
              Ask them to choose their own password when they first sign in
            </label>
          </fieldset>
        )}

        <fieldset>
          <legend className="text-sm font-medium">Roles</legend>
          <p className="text-xs text-muted">
            They can do everything any of their roles allows. You can give or take away single functions on their page
            afterwards.
          </p>
          {isSelf && <p className="mt-1 text-xs text-warning">You can&apos;t change your own roles.</p>}
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {roles.map((r) => {
              const on = form.roleIds.includes(r.id);
              return (
                <label
                  key={r.id}
                  className={clsx(
                    "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                    on ? "border-teal bg-teal-soft/60" : "border-line",
                    isSelf ? "opacity-60" : "cursor-pointer hover:border-teal/40",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={isSelf}
                    onChange={(e) => {
                      setRolesTouched(true);
                      set("roleIds", toggleIn(form.roleIds, r.id, e.target.checked));
                    }}
                    className="size-4 accent-teal"
                  />
                  {r.name}
                </label>
              );
            })}
          </div>
          {errors.roleIds && (
            <p className="mt-1.5 text-xs text-danger" role="alert">
              {errors.roleIds}
            </p>
          )}
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium">Branch access</legend>
          <p className="text-xs text-muted">
            Where they can work. A cashier limited to the annex can&apos;t take money at main.
          </p>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="radio"
                name="scope"
                checked={form.branchScope === "all"}
                onChange={() => set("branchScope", "all")}
                className="size-4 accent-teal"
              />
              All branches, including any added later
            </label>
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="radio"
                name="scope"
                checked={form.branchScope !== "all"}
                onChange={() => set("branchScope", pickedBranches)}
                className="size-4 accent-teal"
              />
              Only specific branches
            </label>
            {form.branchScope !== "all" && (
              <div className="ml-6 space-y-2 rounded-lg bg-background p-3">
                {activeBranches.map((b) => (
                  <label key={b.id} className="flex items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={pickedBranches.includes(b.id)}
                      onChange={(e) => set("branchScope", toggleIn(pickedBranches, b.id, e.target.checked))}
                      className="size-4 accent-teal"
                    />
                    {b.name} <span className="text-muted">({b.code})</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {errors.branchScope && (
            <p className="mt-1.5 text-xs text-danger" role="alert">
              {errors.branchScope}
            </p>
          )}
        </fieldset>
      </form>
    </Dialog>
  );
}
