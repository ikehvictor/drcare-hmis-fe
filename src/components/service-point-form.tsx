"use client";

import { useState } from "react";
import { Button, Dialog, Field, Input, Select } from "@/components/ui";
import { useStore, type ServicePointInput } from "@/lib/store";
import { SERVICE_POINT_TYPES, type ServicePoint, type ServicePointType } from "@/lib/types";

export function ServicePointDialog({
  branchId,
  point,
  onClose,
}: {
  branchId: string;
  point?: ServicePoint;
  onClose: () => void;
}) {
  const { addServicePoint, updateServicePoint } = useStore();
  const [form, setForm] = useState<ServicePointInput>(
    point
      ? { name: point.name, type: point.type, location: point.location }
      : { name: "", type: "Records", location: "" },
  );
  const [error, setError] = useState<string>();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Enter a name staff will recognise, e.g. OPD Room 3.");
    const input = { ...form, name: form.name.trim(), location: form.location.trim() };
    if (point) updateServicePoint(branchId, point.id, input);
    else addServicePoint(branchId, input);
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={point ? "Edit service point" : "Add a service point"}
      description="The type decides which work happens here once modules are switched on."
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="sp-form">
            {point ? "Save changes" : "Add service point"}
          </Button>
        </>
      }
    >
      <form id="sp-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Name" error={error}>
          {(id) => (
            <Input
              id={id}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. OPD Room 3"
            />
          )}
        </Field>
        <Field label="Type">
          {(id) => (
            <Select
              id={id}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as ServicePointType })}
            >
              {SERVICE_POINT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Location" hint="Optional. Helps patients and new staff find it.">
          {(id) => (
            <Input
              id={id}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. First floor, room 13"
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
}
