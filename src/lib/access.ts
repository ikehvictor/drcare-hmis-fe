import type { Branch, Role, User } from "./types";

/** Everything a user can do: the union of their roles' permissions, each with the roles that grant it. */
export function effectivePermissions(user: User, roles: Role[]) {
  const granted = new Map<string, string[]>();
  for (const role of roles.filter((r) => user.roleIds.includes(r.id))) {
    for (const key of role.permissions) granted.set(key, [...(granted.get(key) ?? []), role.name]);
  }
  return granted;
}

export const usersWithRole = (roleId: string, users: User[]) => users.filter((u) => u.roleIds.includes(roleId));

export function branchScopeLabel(user: User, branches: Branch[]) {
  if (user.branchScope === "all") return "All branches";
  const names = branches.filter((b) => user.branchScope.includes(b.id)).map((b) => b.name);
  return names.length ? names.join(", ") : "No branches";
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
