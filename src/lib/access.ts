import { PERMISSION_CATALOGUE } from "./permissions";
import type { Branch, Role, User } from "./types";

const MODULE_OF = new Map(PERMISSION_CATALOGUE.flatMap((g) => g.permissions.map((p) => [p.key, g.moduleId] as const)));

/**
 * Everything a user can do: the union of their roles' permissions, each with the roles that grant it.
 * Permissions of modules that are switched off don't count.
 */
export function effectivePermissions(user: User, roles: Role[], isModuleOn: (id: string) => boolean = () => true) {
  const granted = new Map<string, string[]>();
  for (const role of roles.filter((r) => user.roleIds.includes(r.id))) {
    for (const key of role.permissions) {
      if (!isModuleOn(MODULE_OF.get(key) ?? "core")) continue;
      granted.set(key, [...(granted.get(key) ?? []), role.name]);
    }
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
