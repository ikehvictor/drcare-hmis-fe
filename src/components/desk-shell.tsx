"use client";

import clsx from "clsx";
import { Check, ChevronDown, LayoutDashboard, LogOut, PowerOff, RotateCcw, UserX } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MenuButton, Shell, type SidebarProps } from "@/components/shell";
import { Card } from "@/components/ui";
import { initials } from "@/lib/access";
import { DESK_NAV } from "@/lib/nav";
import { recordsOptions } from "@/lib/patients";
import { useStore } from "@/lib/store";

/**
 * Who is at the desk, where, and what Medical Records allows. The saved desk user or branch can stop being valid
 * (suspended, role changed, branch closed), so this falls back to the first one that still is.
 */
export function useDesk() {
  const { deskUsers, desk, branches, roles, modules, isModuleOn } = useStore();
  const clerk = deskUsers.find((u) => u.id === desk.userId) ?? deskUsers[0];
  const clerkBranches = clerk
    ? branches.filter((b) => b.active && (clerk.branchScope === "all" || clerk.branchScope.includes(b.id)))
    : [];
  const branch = clerkBranches.find((b) => b.id === desk.branchId) ?? clerkBranches[0];
  const clerkRole = clerk
    ? roles
        .filter((r) => clerk.roleIds.includes(r.id))
        .map((r) => r.name)
        .join(", ")
    : "";
  return {
    recordsOn: isModuleOn("medical-records"),
    options: recordsOptions(modules["medical-records"]?.settings),
    clerk,
    clerkRole,
    clerkBranches,
    branch,
  };
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { deskUsers, setDesk, resetDemo, ready } = useStore();
  const { clerk, clerkRole, clerkBranches, branch } = useDesk();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
      <MenuButton onClick={onMenu} />

      {ready && branch && clerk && (
        <div className="flex min-w-0 items-center gap-2">
          <label className="hidden text-sm text-muted sm:block" htmlFor="desk-branch">
            Working at
          </label>
          <select
            id="desk-branch"
            aria-label="Working at"
            className="h-9 max-w-[45vw] rounded-lg border border-line bg-surface px-2 text-sm"
            value={branch.id}
            onChange={(e) => setDesk({ userId: clerk.id, branchId: e.target.value })}
          >
            {clerkBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning sm:inline">
          Demo data
        </span>
        {/* Who's signed in is only known once saved demo data has loaded. */}
        <div className={clsx("relative", !ready && "invisible")}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-background"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={clerk ? `Signed in as ${clerk.name}` : "Account"}
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-teal-soft text-sm font-semibold text-teal-dark">
              {clerk ? initials(clerk.name) : "?"}
            </span>
            {clerk && (
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-medium">{clerk.name}</span>
                <span className="block text-xs text-muted">{clerkRole}</span>
              </span>
            )}
            <ChevronDown className="size-4 text-muted" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              aria-label="Account"
              className="absolute right-0 mt-2 w-64 rounded-xl border border-line bg-surface p-1 shadow-lg"
            >
              {deskUsers.length > 0 && (
                <>
                  <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
                    Switch desk user (demo)
                  </div>
                  {deskUsers.map((u) => (
                    <button
                      key={u.id}
                      role="menuitemradio"
                      aria-checked={u.id === clerk?.id}
                      onClick={() => {
                        setDesk({ userId: u.id, branchId: branch?.id ?? "" });
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-background"
                    >
                      <Check className={clsx("size-4 text-teal", u.id !== clerk?.id && "invisible")} aria-hidden />
                      {u.name}
                    </button>
                  ))}
                  <div className="my-1 border-t border-line" />
                </>
              )}
              <button
                role="menuitem"
                onClick={() => {
                  resetDemo();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-background"
              >
                <RotateCcw className="size-4 text-muted" /> Reset demo data
              </button>
              <Link
                role="menuitem"
                href="/"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-background"
              >
                <LogOut className="size-4 text-muted" /> Sign out
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const SIDEBAR: SidebarProps = {
  area: "Front desk",
  navLabel: "Front desk",
  nav: DESK_NAV,
  home: "/desk",
  footer: (
    <Link
      href="/admin"
      className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"
    >
      <LayoutDashboard className="size-4" aria-hidden /> Hospital admin
    </Link>
  ),
};

export function DeskShell({ children }: { children: React.ReactNode }) {
  return (
    <Shell sidebar={SIDEBAR} topbar={(openMenu) => <Topbar onMenu={openMenu} />}>
      {children}
    </Shell>
  );
}

export function DeskNotice({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="mx-auto mt-6 max-w-lg p-8 text-center">
      <Icon className="mx-auto size-8 text-muted" aria-hidden />
      <h1 className="mt-3 font-display text-xl font-semibold">{title}</h1>
      <div className="mt-2 text-sm text-muted">{children}</div>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

const adminLink = (href: string, label: string) => (
  <Link href={href} className="text-sm font-medium text-teal hover:underline">
    {label}
  </Link>
);

/** Renders the desk only once saved data has loaded, Medical Records is on and someone may use it. */
export function DeskGate({ children }: { children: React.ReactNode }) {
  const { ready } = useStore();
  const { recordsOn, clerk, branch } = useDesk();
  if (!ready) return null;
  if (!recordsOn)
    return (
      <DeskNotice
        icon={PowerOff}
        title="Medical Records is switched off"
        action={adminLink("/admin/modules", "Open Modules in the hospital admin")}
      >
        Patients can&apos;t be registered or looked up until the hospital admin switches Medical Records on.
      </DeskNotice>
    );
  if (!clerk)
    return (
      <DeskNotice
        icon={UserX}
        title="No one can register patients yet"
        action={adminLink("/admin/roles", "Open Roles & permissions")}
      >
        Give an active user a role with “Register new patients”, then they can use the front desk.
      </DeskNotice>
    );
  if (!branch)
    return (
      <DeskNotice icon={UserX} title="No branch to work at" action={adminLink("/admin/users", "Open Users")}>
        {clerk.name} doesn&apos;t have access to any open branch.
      </DeskNotice>
    );
  return <>{children}</>;
}

/** Today's date, read only in the browser so nothing depends on the clock while prerendering. */
export function useToday() {
  const [today, setToday] = useState<Date | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the clock is only read in the browser
  useEffect(() => setToday(new Date()), []);
  return today;
}
