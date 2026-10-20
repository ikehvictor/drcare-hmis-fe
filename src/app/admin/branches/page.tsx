"use client";

import { Building2, ChevronRight, MapPin, Phone, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BranchFormDialog } from "@/components/branch-form";
import { Badge, Button, Card, Input, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function BranchesPage() {
  const { tenant, branches } = useStore();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [adding, setAdding] = useState(false);

  const activeCount = branches.filter((b) => b.active).length;
  const atLimit = activeCount >= tenant.branchLimit;
  const q = query.trim().toLowerCase();
  const visible = branches.filter(
    (b) =>
      (showInactive || b.active) && (!q || [b.name, b.code, b.city, b.state].some((v) => v.toLowerCase().includes(q))),
  );

  return (
    <>
      <PageHeader
        title="Branches & service points"
        description="Every site your hospital runs, and the desks and rooms where patients queue at each one."
        actions={
          <Button onClick={() => setAdding(true)} disabled={atLimit}>
            <Plus className="size-4" /> Add branch
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            aria-label="Search branches"
            placeholder="Search name, code or city"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="size-4 accent-teal"
          />
          Show inactive branches
        </label>
        <p className="text-sm text-muted sm:ml-auto" data-testid="branch-usage">
          {activeCount} of {tenant.branchLimit} branches used
          {atLimit && <span className="text-warning"> · plan limit reached</span>}
        </p>
      </div>

      {visible.length === 0 ? (
        <Card className="p-10 text-center">
          <Building2 className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-medium">No branches match &ldquo;{query}&rdquo;</p>
          <p className="text-sm text-muted">Try a different name, code or city.</p>
        </Card>
      ) : (
        <ul className="grid gap-3" aria-label="Branches">
          {visible.map((b) => {
            const open = b.servicePoints.filter((p) => p.active).length;
            const types = [...new Set(b.servicePoints.filter((p) => p.active).map((p) => p.type))];
            return (
              <li key={b.id}>
                <Link href={`/admin/branches/${b.id}`} className="block">
                  <Card className="flex items-center gap-4 p-4 transition-colors hover:border-teal/40 sm:p-5">
                    <div className="hidden size-11 shrink-0 items-center justify-center rounded-lg bg-teal-soft font-display text-sm font-semibold text-teal-dark sm:flex">
                      {b.code}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{b.name}</span>
                        <span className="text-xs text-muted sm:hidden">{b.code}</span>
                        {b.isMain && <Badge tone="brand">Main</Badge>}
                        {!b.active && <Badge tone="danger">Inactive</Badge>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5" aria-hidden /> {b.city}, {b.state}
                        </span>
                        {b.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="size-3.5" aria-hidden /> {b.phone}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {types.length ? (
                          types.map((t) => <Badge key={t}>{t}</Badge>)
                        ) : (
                          <Badge tone="warning">No service points yet</Badge>
                        )}
                      </div>
                    </div>
                    <div className="hidden text-right sm:block">
                      <div className="font-display text-2xl font-semibold tabular-nums">{open}</div>
                      <div className="text-xs text-muted">service points open</div>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <BranchFormDialog
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={(b) => router.push(`/admin/branches/${b.id}`)}
      />
    </>
  );
}
