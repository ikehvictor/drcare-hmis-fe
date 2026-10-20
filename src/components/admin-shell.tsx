"use client";

import clsx from "clsx";
import { CheckCircle2, ChevronDown, LogOut, Menu, RotateCcw, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { CURRENT_STAGE, NAV } from "@/lib/nav";
import { useStore } from "@/lib/store";

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

// Reads the URL, so it streams in under Suspense; the fallback is the same menu with nothing highlighted.
function CurrentNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return <NavLinks pathname={usePathname()} onNavigate={onNavigate} />;
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {NAV.map((group) => (
        <div key={group.label}>
          <div className="px-2 pb-1.5 text-[11px] font-semibold tracking-wider text-white/40 uppercase">
            {group.label}
          </div>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
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
                    {item.stage > CURRENT_STAGE && (
                      <span className="rounded px-1.5 py-px text-[10px] text-white/45 ring-1 ring-white/15">Soon</span>
                    )}
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

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { tenant } = useStore();

  return (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <Image src="/brand/logo.png" alt="" width={40} height={32} className="h-8 w-auto" priority />
        <div className="leading-tight">
          <div className="font-display text-lg font-semibold">Dr. Care</div>
          <div className="text-[11px] tracking-wide text-cyan/90 uppercase">Hospital admin</div>
        </div>
      </div>

      <div className="mx-4 mb-4 rounded-lg bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
        <div className="truncate text-sm font-medium">{tenant.name}</div>
        <div className="text-xs text-white/60">{tenant.plan} plan</div>
      </div>

      <nav aria-label="Admin" className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        <Suspense fallback={<NavLinks pathname="" onNavigate={onNavigate} />}>
          <CurrentNavLinks onNavigate={onNavigate} />
        </Suspense>
      </nav>
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { branches, resetDemo } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
      <button
        className="rounded-md p-2 text-muted hover:bg-background lg:hidden"
        onClick={onMenu}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      <label className="sr-only" htmlFor="branch-scope">
        Branch scope
      </label>
      <select
        id="branch-scope"
        className="h-9 max-w-[55vw] rounded-lg border border-line bg-surface px-2 text-sm"
        defaultValue="all"
      >
        <option value="all">All branches</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning sm:inline">
          Demo data
        </span>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-background"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-teal-soft text-sm font-semibold text-teal-dark">
              AO
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-medium">Ada Okafor</span>
              <span className="block text-xs text-muted">Hospital Super Admin</span>
            </span>
            <ChevronDown className="size-4 text-muted" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 rounded-xl border border-line bg-surface p-1 shadow-lg"
            >
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

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <Sidebar />
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
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <Topbar onMenu={() => setMobileOpen(true)} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <Toast />
    </div>
  );
}
