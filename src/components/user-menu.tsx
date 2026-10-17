"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOutAction } from "@/actions/auth";
import { initials } from "@/lib/format";

export type HeaderUser = {
  displayName: string;
  role: string;
  isStaff: boolean;
};

const NAV_LINKS = [
  { href: "/search", label: "Browse businesses" },
  { href: "/sectors", label: "Sectors" },
  { href: "/logistics", label: "Logistics" },
];

export function UserMenu({ user }: { user: HeaderUser | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2">
      <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-2 text-sm font-medium hover:bg-ink-100 ${
              pathname.startsWith(link.href) ? "text-brand-700" : "text-ink-700"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {user ? (
        <div className="relative hidden md:block">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-haspopup="menu"
            className="btn-secondary btn-sm"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
              {initials(user.displayName) || "U"}
            </span>
            <span className="max-w-[10rem] truncate">{user.displayName}</span>
          </button>
          {open ? (
            <div
              role="menu"
              className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-ink-200 bg-white py-1 shadow-lg"
            >
              <Link href="/dashboard" className="block px-4 py-2 text-sm hover:bg-ink-50" role="menuitem">
                Dashboard
              </Link>
              <Link
                href="/dashboard/businesses/new"
                className="block px-4 py-2 text-sm hover:bg-ink-50"
                role="menuitem"
              >
                Add a business
              </Link>
              <Link href="/dashboard/logistics" className="block px-4 py-2 text-sm hover:bg-ink-50" role="menuitem">
                Logistics profile
              </Link>
              <Link href="/dashboard/quotes" className="block px-4 py-2 text-sm hover:bg-ink-50" role="menuitem">
                My quote requests
              </Link>
              {user.isStaff ? (
                <Link href="/admin" className="block px-4 py-2 text-sm font-medium text-brand-700 hover:bg-ink-50" role="menuitem">
                  Admin
                </Link>
              ) : null}
              <Link href="/dashboard/profile" className="block px-4 py-2 text-sm hover:bg-ink-50" role="menuitem">
                Profile settings
              </Link>
              <form action={signOutAction} className="border-t border-ink-100">
                <button type="submit" className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-ink-50">
                  Sign out
                </button>
              </form>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className="btn-ghost btn-sm">
            Sign in
          </Link>
          <Link href="/register" className="btn-primary btn-sm">
            List your business
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Toggle navigation menu"
        className="btn-secondary btn-sm md:hidden"
      >
        {open ? "Close" : "Menu"}
      </button>

      {open ? (
        <div className="absolute top-16 right-4 left-4 z-50 rounded-lg border border-ink-200 bg-white p-2 shadow-lg md:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-ink-50"
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-ink-50">
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/businesses/new"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm hover:bg-ink-50"
                >
                  Add a business
                </Link>
                <Link
                  href="/dashboard/logistics"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm hover:bg-ink-50"
                >
                  Logistics profile
                </Link>
                <Link
                  href="/dashboard/quotes"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm hover:bg-ink-50"
                >
                  My quote requests
                </Link>
                {user.isStaff ? (
                  <Link href="/admin" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-brand-700 hover:bg-ink-50">
                    Admin
                  </Link>
                ) : null}
                <Link
                  href="/dashboard/profile"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm hover:bg-ink-50"
                >
                  Profile settings
                </Link>
                <form action={signOutAction}>
                  <button type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-ink-50">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-col gap-2 p-2">
                <Link href="/login" onClick={() => setOpen(false)} className="btn-secondary">
                  Sign in
                </Link>
                <Link href="/register" onClick={() => setOpen(false)} className="btn-primary">
                  Create an account
                </Link>
              </div>
            )}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
