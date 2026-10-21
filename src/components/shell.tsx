"use client";

import clsx from "clsx";
import { CheckCircle2, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import type { NavGroup, NavItem } from "@/lib/nav";
import { useStore } from "@/lib/store";

// The navy sidebar, sticky top bar and toast shared by the hospital admin and the front desk.

function isActive(pathname: string, item: NavItem, home: string) {
  if (item.also?.some((p) => pathname.startsWith(p))) return true;
  return item.href === home ? pathname === home : pathname.startsWith(item.href);
}

// Reads the URL, so it streams in under Suspense; the fallback is the same menu with nothing highlighted.
function CurrentNavLinks(props: { nav: NavGroup[]; home: string; onNavigate?: () => void }) {
  return <NavLinks pathname={usePathname()} {...props} />;
}

function NavLinks({
  nav,
  home,
  pathname,
  onNavigate,
}: {
  nav: NavGroup[];
  home: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {nav.map((group) => (
        <div key={group.label}>
          <div className="px-2 pb-1.5 text-[11px] font-semibold tracking-wider text-white/40 uppercase">
            {group.label}
          </div>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item, home);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      active ? "bg-teal text-white" : "text-white/75 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="flex-1 truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

export interface SidebarProps {
  /** Shown under the Dr. Care name, e.g. "Hospital admin". */
  area: string;
  /** Accessible name of the navigation landmark. */
  navLabel: string;
  nav: NavGroup[];
  /** The area's home page, highlighted only on an exact match. */
  home: string;
  /** Extra content pinned to the bottom of the sidebar. */
  footer?: React.ReactNode;
}

function Sidebar({ area, navLabel, nav, home, footer, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const { tenant, settings } = useStore();
  const { displayName, logo } = settings.profile;

  return (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <Image src="/brand/logo.png" alt="" width={40} height={32} priority />
        <div className="leading-tight">
          <div className="font-display text-lg font-semibold">Dr. Care</div>
          <div className="text-[11px] tracking-wide text-cyan/90 uppercase">{area}</div>
        </div>
      </div>

      <div className="mx-4 mb-4 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element -- a local data URL, nothing to optimise
          <img src={logo} alt="" className="size-8 shrink-0 rounded-md bg-white object-contain p-0.5" />
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-medium" data-testid="sidebar-hospital">
            {displayName}
          </div>
          <div className="text-xs text-white/60">{tenant.plan} plan</div>
        </div>
      </div>

      <nav aria-label={navLabel} className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        <Suspense fallback={<NavLinks nav={nav} home={home} pathname="" onNavigate={onNavigate} />}>
          <CurrentNavLinks nav={nav} home={home} onNavigate={onNavigate} />
        </Suspense>
      </nav>
      {footer && <div className="border-t border-white/10 px-3 py-3">{footer}</div>}
    </div>
  );
}

function Toast() {
  const { toast } = useStore();
  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed top-20 right-4 left-4 z-[60] flex justify-end"
    >
      {toast && (
        <div className="flex items-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm text-white shadow-lg">
          <CheckCircle2 className="size-4 text-cyan" aria-hidden /> {toast}
        </div>
      )}
    </div>
  );
}

/** A menu button for the top bar that opens the sidebar on small screens. */
export function MenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="rounded-md p-2 text-muted hover:bg-background lg:hidden"
      onClick={onClick}
      aria-label="Open navigation"
    >
      <Menu className="size-5" />
    </button>
  );
}

export function Shell({
  sidebar,
  topbar,
  children,
}: {
  sidebar: SidebarProps;
  /** Renders the top bar; `openMenu` shows the sidebar on small screens. */
  topbar: (openMenu: () => void) => React.ReactNode;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <Sidebar {...sidebar} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy/50" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="relative h-full w-72 max-w-[85vw]">
            <button
              className="absolute top-4 right-3 z-10 rounded-md p-1.5 text-white/70 hover:bg-white/10"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
            <Sidebar {...sidebar} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {topbar(() => setMobileOpen(true))}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <Toast />
    </div>
  );
}
