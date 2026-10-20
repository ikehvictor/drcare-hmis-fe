"use client";

import { Plus, Search, Users as UsersIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RelativeTime } from "@/components/relative-time";
import { Badge, Button, Card, Input, PageHeader, Select } from "@/components/ui";
import { UserFormDialog } from "@/components/user-form";
import { UserStatusBadge } from "@/components/user-status";
import { branchScopeLabel, initials } from "@/lib/access";
import { useStore } from "@/lib/store";

export default function UsersPage() {
  const { tenant, users, roles, branches, currentUserId } = useStore();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [inviting, setInviting] = useState(false);

  // Suspended accounts don't count towards the plan's user limit.
  const seats = users.filter((u) => u.status !== "suspended").length;
  const atLimit = seats >= tenant.userLimit;
  const q = query.trim().toLowerCase();
  const visible = users.filter(
    (u) =>
      (!q || [u.name, u.email, u.jobTitle, u.phone].some((v) => v.toLowerCase().includes(q))) &&
      (!roleFilter || u.roleIds.includes(roleFilter)) &&
      (!statusFilter || u.status === statusFilter),
  );
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? "Unknown role";

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone who signs in to Dr. Care at your hospital, what they can do, and where."
        actions={
          <Button onClick={() => setInviting(true)} disabled={atLimit}>
            <Plus className="size-4" /> Invite user
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            aria-label="Search users"
            placeholder="Search name, email or phone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 md:flex">
          <Select
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="md:w-48"
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="md:w-40"
          >
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>
        <p className="text-sm text-muted md:ml-auto" data-testid="user-usage">
          {seats} of {tenant.userLimit} users
          {atLimit && <span className="text-warning"> · plan limit reached</span>}
        </p>
      </div>

      {visible.length === 0 ? (
        <Card className="p-10 text-center">
          <UsersIcon className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-medium">No users match these filters</p>
          <p className="text-sm text-muted">Clear the search or pick a different role or status.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm" aria-label="Users">
            <thead className="bg-background text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Roles</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Branches</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((u) => (
                <tr key={u.id} className="hover:bg-background/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-soft text-xs font-semibold text-teal-dark">
                        {initials(u.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="truncate">{u.name}</span>
                          {u.id === currentUserId && <Badge tone="brand">You</Badge>}
                        </span>
                        <span className="block truncate text-xs text-muted">{u.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {u.roleIds.map((id) => (
                        <Badge key={id}>{roleName(id)}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-muted lg:table-cell">{branchScopeLabel(u, branches)}</td>
                  <td className="px-4 py-3">
                    <UserStatusBadge status={u.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    {u.lastActiveAt ? <RelativeTime iso={u.lastActiveAt} /> : "Never signed in"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {inviting && <UserFormDialog onClose={() => setInviting(false)} />}
    </>
  );
}
