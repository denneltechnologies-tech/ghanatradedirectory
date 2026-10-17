"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/businesses", label: "Businesses" },
  { href: "/admin/businesses/new", label: "➕ Add Business" },
  { href: "/admin/export", label: "📥 Data Export" },
  { href: "/admin/claims", label: "Claims" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/comments", label: "Comments" },
  { href: "/admin/categories", label: "Sectors" },
  { href: "/admin/locations", label: "Locations" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Admin">
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${
              active ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
