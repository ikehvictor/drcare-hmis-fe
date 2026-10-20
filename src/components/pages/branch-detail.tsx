"use client";

import clsx from "clsx";
import { ArrowLeft, DoorOpen, MapPin, Pencil, Phone, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { BranchFormDialog } from "@/components/branch-form";
import { ServicePointDialog } from "@/components/service-point-form";
import { Badge, Button, Card, Dialog, Switch } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { ServicePoint } from "@/lib/types";

export function BranchDetail() {
  const { id } = useParams<{ id: string }>();
  const { tenant, branches, setBranchActive, setServicePointActive } = useStore();
  const branch = branches.find((b) => b.id === id);

  const [editing, setEditing] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [pointDialog, setPointDialog] = useState<{ point?: ServicePoint } | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("All");

  if (!branch) {
    return (
      <Card className="mx-auto mt-10 max-w-md p-8 text-center">
        <h1 className="font-display text-xl font-semibold">Branch not found</h1>
        <p className="mt-2 text-sm text-muted">It may have been removed from the demo data.</p>
        <Link href="/admin/branches" className="mt-4 inline-block text-sm font-medium text-teal hover:underline">
          Back to branches
        </Link>
      </Card>
    );
  }

  const types = ["All", ...new Set(branch.servicePoints.map((p) => p.type))];
  const points = branch.servicePoints.filter((p) => typeFilter === "All" || p.type === typeFilter);
  const activeCount = branches.filter((b) => b.active).length;
  const canReactivate = activeCount < tenant.branchLimit;

  return (
    <>
      <Link href="/admin/branches" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> All branches
      </Link>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-teal-soft font-display text-base font-semibold text-teal-dark">
              {branch.code}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-semibold">{branch.name}</h1>
                {branch.isMain && <Badge tone="brand">Main branch</Badge>}
                {branch.active ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Inactive</Badge>}
              </div>
              <div className="mt-2 space-y-1 text-sm text-muted">
                <p className="flex items-center gap-1.5">
                  <MapPin className="size-4" aria-hidden />
                  {[branch.address, branch.city, branch.state].filter(Boolean).join(", ")}
                </p>
                {branch.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="size-4" aria-hidden /> {branch.phone}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
            {branch.active ? (
              <Button
                variant="secondary"
                onClick={() => setConfirmDeactivate(true)}
                disabled={branch.isMain}
                title={branch.isMain ? "Make another branch main before deactivating this one" : undefined}
              >
                Deactivate
              </Button>
            ) : (
              <Button
                onClick={() => setBranchActive(branch.id, true)}
                disabled={!canReactivate}
                title={!canReactivate ? "Your plan's branch limit is reached" : undefined}
              >
                Reactivate
              </Button>
            )}
          </div>
        </div>
      </Card>

      <section className="mt-6" aria-labelledby="sp-heading">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="sp-heading" className="font-display text-lg font-semibold">
              Service points
            </h2>
            <p className="text-sm text-muted">Desks and rooms where patients wait. Closed points stop receiving patients.</p>
          </div>
          <Button onClick={() => setPointDialog({})} disabled={!branch.active}>
            <Plus className="size-4" /> Add service point
          </Button>
        </div>

        {types.length > 2 && (
          <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                aria-pressed={typeFilter === t}
                className={clsx(
                  "rounded-full px-3 py-1 text-sm transition-colors",
                  typeFilter === t ? "bg-navy text-white" : "bg-surface text-muted ring-1 ring-line hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {branch.servicePoints.length === 0 ? (
          <Card className="p-10 text-center">
            <DoorOpen className="mx-auto size-8 text-muted" aria-hidden />
            <p className="mt-3 font-medium">No service points yet</p>
            <p className="mx-auto max-w-sm text-sm text-muted">
              Add at least a Records desk and a Cashier so this branch can register and bill patients.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background text-left text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Type</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Location</th>
                  <th className="px-4 py-3 font-medium">Open</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {points.map((p) => (
                  <tr key={p.id} className={clsx(!p.active && "text-muted")}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted sm:hidden">{p.type}</div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Badge>{p.type}</Badge>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">{p.location || "—"}</td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={p.active}
                        onChange={(v) => setServicePointActive(branch.id, p.id, v)}
                        label={`${p.name} open`}
                      />
                    </td>
                    <td className="px-2 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setPointDialog({ point: p })} aria-label={`Edit ${p.name}`}>
                        <Pencil className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {editing && <BranchFormDialog open onClose={() => setEditing(false)} branch={branch} />}
      {pointDialog && (
        <ServicePointDialog branchId={branch.id} point={pointDialog.point} onClose={() => setPointDialog(null)} />
      )}
      <Dialog
        open={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        title={`Deactivate ${branch.name}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDeactivate(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setBranchActive(branch.id, false);
                setConfirmDeactivate(false);
              }}
            >
              Deactivate branch
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Staff at this branch won&apos;t be able to register or bill patients. Nothing is deleted: its patients, bills and
          history stay, and you can reactivate it any time.
        </p>
      </Dialog>
    </>
  );
}
