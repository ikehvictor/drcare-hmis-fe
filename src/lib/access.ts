import { ALL_PERMISSION_KEYS, PERMISSION_CATALOGUE } from "./permissions";
import type { Branch, Role, User } from "./types";

const MODULE_OF = new Map(PERMISSION_CATALOGUE.flatMap((g) => g.permissions.map((p) => [p.key, g.moduleId] as const)));

export const GIVEN_DIRECTLY = "Given directly";

/** What a role allows. The locked Super Admin role allows everything, including the hospital's own functions. */
export const rolePermissions = (role: Role, customKeys: string[] = []) =>
  role.locked ? [...ALL_PERMISSION_KEYS, ...customKeys] : role.permissions;

/**
 * Everything a user can do, each with where it comes from: the union of their roles' permissions, plus functions
 * given to them directly, minus functions taken away from them. Permissions of modules that are switched off
 * don't count. The hospital's own functions belong to no module, so they always count.
 */
export function effectivePermissions(
  user: User,
  roles: Role[],
  isModuleOn: (id: string) => boolean = () => true,
  customKeys: string[] = [],
) {
  const granted = new Map<string, string[]>();
  const add = (key: string, from: string) => {
    if (!isModuleOn(MODULE_OF.get(key) ?? "core") || user.removedPermissions.includes(key)) return;
    granted.set(key, [...(granted.get(key) ?? []), from]);
  };
  for (const role of roles.filter((r) => user.roleIds.includes(r.id)))
    for (const key of rolePermissions(role, customKeys)) add(key, role.name);
  for (const key of user.extraPermissions) add(key, GIVEN_DIRECTLY);
  return granted;
}

/** Functions this user's roles allow, before anything is taken away from them. */
export function fromRoles(user: Pick<User, "roleIds">, roles: Role[], customKeys: string[] = []) {
  return new Set(roles.filter((r) => user.roleIds.includes(r.id)).flatMap((r) => rolePermissions(r, customKeys)));
}

/** "Doctor · Cardiology", or "" when the user has no category. */
export function staffLabel(
  user: Pick<User, "staffCategoryId" | "specialty">,
  categories: { id: string; name: string }[],
) {
  const cat = categories.find((c) => c.id === user.staffCategoryId);
  if (!cat) return "";
  return user.specialty ? `${cat.name} · ${user.specialty}` : cat.name;
}

/** Problems with a password the admin types for someone, or an empty list. */
export function passwordProblems(password: string, minLength: number, email: string) {
  const problems: string[] = [];
  if (password.length < minLength) problems.push(`Use at least ${minLength} characters.`);
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) problems.push("Mix letters and numbers.");
  const local = email.split("@")[0]!.toLowerCase();
  if (local.length >= 3 && password.toLowerCase().includes(local))
    problems.push("Don't use their email name in the password.");
  return problems;
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
