"use client";

import { ChevronDown, ClipboardList, LogOut, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MenuButton, Shell, type SidebarProps } from "@/components/shell";
import { NAV } from "@/lib/nav";
import { useStore } from "@/lib/store";

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { branches, resetDemo } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
      <MenuButton onClick={onMenu} />

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
                href="/desk"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-background"
              >
                <ClipboardList className="size-4 text-muted" /> Open the front desk
              </Link>
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

const SIDEBAR: SidebarProps = { area: "Hospital admin", navLabel: "Admin", nav: NAV, home: "/admin" };

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <Shell sidebar={SIDEBAR} topbar={(openMenu) => <Topbar onMenu={openMenu} />}>
      {children}
    </Shell>
  );
}
