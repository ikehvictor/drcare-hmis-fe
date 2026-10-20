"use client";

import { useState } from "react";
import { Button, Dialog, Field, Input } from "@/components/ui";
import { useStore, type BranchInput } from "@/lib/store";
import type { Branch } from "@/lib/types";

const empty: BranchInput = { name: "", code: "", address: "", city: "", state: "", phone: "", isMain: false };

export function BranchFormDialog({
  open,
  onClose,
  branch,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  branch?: Branch;
  onSaved?: (b: Branch) => void;
}) {
  const { branches, addBranch, updateBranch } = useStore();
  const [form, setForm] = useState<BranchInput>(branch ?? empty);
  const [errors, setErrors] = useState<Partial<Record<keyof BranchInput, string>>>({});

  const set = <K extends keyof BranchInput>(k: K, v: BranchInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const close = () => {
    setForm(branch ?? empty);
    setErrors({});
    onClose();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Enter the branch name.";
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z]{2,5}$/.test(code)) next.code = "Use 2 to 5 letters, e.g. LAG.";
    else if (branches.some((b) => b.code === code && b.id !== branch?.id))
      next.code = `${code} is already used by another branch.`;
    if (!form.city.trim()) next.city = "Enter the city or area.";
    if (!form.state.trim()) next.state = "Enter the state.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const input = { ...form, code, name: form.name.trim() };
    if (branch) {
      updateBranch(branch.id, input);
      onSaved?.({ ...branch, ...input });
    } else {
      onSaved?.(addBranch(input));
    }
    close();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={branch ? "Edit branch" : "Add a branch"}
      description="A branch is a physical site. Patients, staff and prices can differ per branch."
      footer={
        <>
          <Button variant="secondary" type="button" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="branch-form">
            {branch ? "Save changes" : "Add branch"}
          </Button>
        </>
      }
    >
      <form id="branch-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-3" noValidate>
        <div className="sm:col-span-2">
          <Field label="Branch name" error={errors.name}>
            {(id) => (
              <Input
                id={id}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Ikeja Clinic"
              />
            )}
          </Field>
        </div>
        <Field label="Code" error={errors.code} hint="Shows in patient numbers">
          {(id) => (
            <Input
              id={id}
              value={form.code}
              maxLength={5}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="IKJ"
              className="uppercase"
            />
          )}
        </Field>
        <div className="sm:col-span-3">
          <Field label="Street address">
            {(id) => <Input id={id} value={form.address} onChange={(e) => set("address", e.target.value)} />}
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="City / area" error={errors.city}>
            {(id) => <Input id={id} value={form.city} onChange={(e) => set("city", e.target.value)} />}
          </Field>
        </div>
        <Field label="State" error={errors.state}>
          {(id) => <Input id={id} value={form.state} onChange={(e) => set("state", e.target.value)} />}
        </Field>
        <div className="sm:col-span-3">
          <Field label="Phone">
            {(id) => (
              <Input
                id={id}
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+234"
              />
            )}
          </Field>
        </div>
        <label className="flex items-start gap-3 rounded-lg bg-background p-3 text-sm sm:col-span-3">
          <input
            type="checkbox"
            checked={form.isMain}
            onChange={(e) => set("isMain", e.target.checked)}
            className="mt-0.5 size-4 accent-teal"
          />
          <span>
            <span className="font-medium">Main branch</span>
            <span className="block text-muted">Hospital-wide reports and settings default to this branch.</span>
          </span>
        </label>
      </form>
    </Dialog>
  );
}
