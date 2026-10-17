"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/businesses/new", label: "Add a business" },
  { href: "/dashboard/logistics", label: "Logistics profile" },
  { href: "/dashboard/quotes", label: "Quote requests" },
  { href: "/dashboard/claims", label: "My claims" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/profile", label: "Profile settings" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Dashboard">
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${
              active ? "bg-brand-600 text-white" : "text-ink-700 hover:bg-ink-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
