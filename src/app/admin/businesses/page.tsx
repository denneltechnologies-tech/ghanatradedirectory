import type { Metadata } from "next";
import Link from "next/link";
import { listBusinessesForAdmin } from "@/lib/services/admin";
import { getBusinessLogo } from "@/lib/sector-media";
import { StatusBadge, VerificationBadge } from "@/components/badges";
import {
  deleteBusinessAction,
  featureBusinessAction,
  fetchAccurateLogoAction,
  quickApproveBusinessAction,
  setBusinessStatusAction,
  setVerificationAction,
  updateBusinessLogoAction,
} from "@/actions/admin";
import { formatDate, humanizeEnum, truncate } from "@/lib/format";
import { BusinessStatus, VerificationLevel } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Admin · Super Administrator Businesses" };

const STATUS_TABS: (BusinessStatus | "ALL")[] = [
  "ALL",
  "PENDING_REVIEW",
  "PUBLISHED",
  "DRAFT",
  "REJECTED",
  "SUSPENDED",
  "ARCHIVED",
];

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const statusParam = Array.isArray(query.status) ? query.status[0] : query.status;
  const status = statusParam && statusParam !== "ALL" ? (statusParam as BusinessStatus) : undefined;
  const q = Array.isArray(query.q) ? query.q[0] : query.q || "";
  const page = Number(Array.isArray(query.page) ? query.page[0] : query.page) || 1;

  const result = await listBusinessesForAdmin({
    status,
    q,
    page,
    perPage: 30,
  });

  const businesses = "items" in result ? result.items : result;
  const total = "total" in result ? result.total : businesses.length;
  const totalPages = "totalPages" in result ? result.totalPages : 1;

  return (
    <div className="space-y-5">
      {/* Header with Title and Add Business button */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700 border border-brand-200">
              ⚡ Super Administrator
            </span>
            <h2 className="text-xl font-bold text-ink-900">Directory Businesses</h2>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            Approve, manage, verify, enrich logos, or remove businesses across the Ghana trade directory.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/admin/export/businesses?format=csv"
            download
            className="btn-secondary btn-sm inline-flex items-center gap-1.5 shadow-sm"
            title="Export all directory businesses to Excel CSV"
          >
            <span>📥</span> Export CSV
          </a>
          <a
            href="/api/admin/export/businesses?format=json"
            download
            className="btn-secondary btn-sm inline-flex items-center gap-1.5 shadow-sm"
            title="Export complete directory to JSON"
          >
            <span>💾</span> Export JSON
          </a>
          <Link
            href="/admin/export"
            className="btn-secondary btn-sm inline-flex items-center gap-1.5"
            title="Open Export Center with custom filters"
          >
            <span>⚙️</span> Export Center
          </Link>
          <Link
            href="/admin/businesses/new"
            className="btn-primary btn-sm inline-flex items-center gap-1.5 shadow-sm"
          >
            <span>➕</span> Add New Business
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form method="GET" className="flex flex-1 items-center gap-2 max-w-md">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name, category, phone, website..."
            className="input text-sm flex-1"
          />
          <button type="submit" className="btn-secondary btn-sm">
            Search
          </button>
          {q ? (
            <Link
              href={status ? `/admin/businesses?status=${status}` : "/admin/businesses"}
              className="text-xs text-ink-500 hover:text-ink-800"
            >
              Clear
            </Link>
          ) : null}
        </form>
        <span className="text-xs font-medium text-ink-500">
          Showing {businesses.length} of {total} businesses
        </span>
      </div>

      {/* Status Filter Tabs */}
      <nav className="flex flex-wrap gap-1.5" aria-label="Status filter">
        {STATUS_TABS.map((tab) => {
          const active = (status ?? "ALL") === tab;
          const href =
            tab === "ALL"
              ? q
                ? `/admin/businesses?q=${encodeURIComponent(q)}`
                : "/admin/businesses"
              : q
                ? `/admin/businesses?status=${tab}&q=${encodeURIComponent(q)}`
                : `/admin/businesses?status=${tab}`;
          return (
            <Link
              key={tab}
              href={href}
              className={active ? "badge bg-ink-900 text-white" : "badge-neutral hover:bg-ink-200"}
            >
              {tab === "ALL" ? "All" : humanizeEnum(tab)}
            </Link>
          );
        })}
      </nav>

      {/* Business List */}
      {businesses.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm font-medium text-ink-700">No businesses found matching your criteria.</p>
          <p className="mt-1 text-xs text-ink-500">Try adjusting your search terms or status filter.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {businesses.map((business) => {
            const logo = getBusinessLogo(business);
            const location = business.locations?.[0];
            return (
              <li key={business.id} className="card p-4 hover:shadow-xs transition-shadow">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* Left: Logo + Details */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-ink-200 bg-slate-50 p-1.5 shadow-2xs">
                      {logo ? (
                        <img
                          src={logo}
                          alt={`${business.name} logo`}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs font-bold text-ink-400">LOGO</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/businesses/${business.slug}`}
                          className="font-semibold text-ink-900 hover:text-brand-700 transition-colors"
                        >
                          {business.name}
                        </Link>
                        <StatusBadge status={business.status} />
                        {business.featured ? <span className="badge-gold">Featured</span> : null}
                        <VerificationBadge level={business.verificationLevel} compact />
                        {business.source ? (
                          <span className="badge-neutral" title={`Imported from ${business.source}`}>
                            {business.source}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-xs text-ink-600">
                        📁 {business.category?.name}
                        {location?.region?.name ? ` · 📍 ${location.locality || location.district?.name || location.region.name}` : ""}
                        {business.phone ? ` · 📞 ${business.phone}` : ""}
                        {business.website ? (
                          <>
                            {" "}· 🌐{" "}
                            <a
                              href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-600 hover:underline"
                            >
                              {business.website.replace(/^https?:\/\/(www\.)?/, "")}
                            </a>
                          </>
                        ) : null}
                      </p>

                      <p className="mt-1.5 text-xs text-ink-600 line-clamp-2">
                        {truncate(business.description, 140)}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                        <span>🛒 {business._count.offerings} offerings</span>
                        <span>💬 {business._count.comments} comments</span>
                        <span>❤ {business._count.likes} likes</span>
                        <span>Updated {formatDate(business.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Super Admin Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-start">
                    {business.status !== "PUBLISHED" ? (
                      <form action={quickApproveBusinessAction}>
                        <input type="hidden" name="businessId" value={business.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs transition-colors"
                          title="Instantly publish this business"
                        >
                          ✓ Approve
                        </button>
                      </form>
                    ) : null}

                    {/* Logo Fetch Online */}
                    <form action={fetchAccurateLogoAction}>
                      <input type="hidden" name="businessId" value={business.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors"
                        title="Search website & Google for accurate logo"
                      >
                        🔍 Pull Logo
                      </button>
                    </form>

                    {/* Feature Toggle */}
                    <form action={featureBusinessAction}>
                      <input type="hidden" name="businessId" value={business.id} />
                      <input type="hidden" name="featured" value={business.featured ? "false" : "true"} />
                      <button
                        type="submit"
                        className={`rounded-md px-2 py-1 text-xs font-medium border transition-colors ${
                          business.featured
                            ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                            : "bg-white text-ink-700 border-ink-200 hover:bg-ink-50"
                        }`}
                      >
                        {business.featured ? "★ Featured" : "☆ Feature"}
                      </button>
                    </form>

                    {/* Delete / Remove Action */}
                    <form action={deleteBusinessAction}>
                      <input type="hidden" name="businessId" value={business.id} />
                      <button
                        type="submit"
                        onClick={(e) => {
                          if (!confirm(`Are you sure you want to remove "${business.name}" from the directory?`)) {
                            e.preventDefault();
                          }
                        }}
                        className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                        title="Remove business from directory"
                      >
                        🗑 Remove
                      </button>
                    </form>
                  </div>
                </div>

                {/* Sub-bar: Status, Verification & Custom Logo URL */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Status dropdown */}
                    <form action={setBusinessStatusAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="businessId" value={business.id} />
                      <span className="text-ink-500 font-medium">Status:</span>
                      <select
                        name="status"
                        defaultValue={business.status}
                        className="rounded border border-ink-200 bg-white px-2 py-0.5 text-xs text-ink-800"
                      >
                        {Object.values(BusinessStatus).map((value) => (
                          <option key={value} value={value}>
                            {humanizeEnum(value)}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="rounded bg-ink-100 px-1.5 py-0.5 text-xs hover:bg-ink-200">
                        Set
                      </button>
                    </form>

                    {/* Verification dropdown */}
                    <form action={setVerificationAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="businessId" value={business.id} />
                      <span className="text-ink-500 font-medium">Badge:</span>
                      <select
                        name="level"
                        defaultValue={business.verificationLevel}
                        className="rounded border border-ink-200 bg-white px-2 py-0.5 text-xs text-ink-800"
                      >
                        {Object.values(VerificationLevel).map((value) => (
                          <option key={value} value={value}>
                            {humanizeEnum(value)}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="rounded bg-ink-100 px-1.5 py-0.5 text-xs hover:bg-ink-200">
                        Set
                      </button>
                    </form>
                  </div>

                  {/* Manual Logo URL edit */}
                  <form action={updateBusinessLogoAction} className="flex items-center gap-1.5">
                    <input type="hidden" name="businessId" value={business.id} />
                    <input
                      name="logoUrl"
                      defaultValue={business.logoKey ?? ""}
                      placeholder="Custom Logo URL (https://...)"
                      className="rounded border border-ink-200 px-2 py-0.5 text-xs w-44"
                    />
                    <button type="submit" className="rounded bg-ink-100 px-1.5 py-0.5 text-xs hover:bg-ink-200">
                      Save Logo
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-ink-200 pt-4 text-xs text-ink-600">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={`/admin/businesses?page=${page - 1}${status ? `&status=${status}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className="btn-secondary btn-sm"
              >
                ← Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={`/admin/businesses?page=${page + 1}${status ? `&status=${status}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className="btn-secondary btn-sm"
              >
                Next →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
