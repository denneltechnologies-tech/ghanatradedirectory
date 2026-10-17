import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Admin · Data Export" };

export default async function AdminExportPage() {
  const user = await requireUser();
  if (!isStaff(user)) {
    redirect("/login");
  }

  // Fetch counts and taxonomy for filters
  const [
    totalBusinesses,
    publishedCount,
    verifiedCount,
    categoriesCount,
    categories,
    regions,
  ] = await Promise.all([
    prisma.business.count({ where: { deletedAt: null } }),
    prisma.business.count({ where: { status: "PUBLISHED", deletedAt: null } }),
    prisma.business.count({
      where: {
        verificationLevel: { not: "UNVERIFIED" },
        deletedAt: null,
      },
    }),
    prisma.category.count(),
    prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.region.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs font-semibold text-brand-700 hover:underline">
              Admin
            </Link>
            <span className="text-xs text-ink-400">/</span>
            <span className="text-xs text-ink-500 font-medium">Export</span>
          </div>
          <h2 className="text-2xl font-bold text-ink-900 mt-1">Data Export Center</h2>
          <p className="text-sm text-ink-600">
            Export verified businesses, product &amp; service listings, contact info, coordinates, and full directory data.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/admin/businesses" className="btn-secondary btn-sm">
            ← Manage Businesses
          </Link>
        </div>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-500">Total Directory Records</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{totalBusinesses.toLocaleString()}</p>
          <p className="text-xs text-ink-400">Available for export</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-500">Published Listings</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{publishedCount.toLocaleString()}</p>
          <p className="text-xs text-ink-400">Live on directory</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-500">Verified Listings</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">{verifiedCount.toLocaleString()}</p>
          <p className="text-xs text-ink-400">Regulator / doc verified</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-500">Sectors &amp; Categories</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{categoriesCount}</p>
          <p className="text-xs text-ink-400">Industry classifications</p>
        </div>
      </div>

      {/* 1-Click Quick Downloads Grid */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-ink-900">⚡ 1-Click Instant Exports</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Complete Directory CSV */}
          <div className="card p-5 flex flex-col justify-between border-brand-200 bg-brand-50/30">
            <div>
              <div className="flex items-center justify-between">
                <span className="badge-gold">Recommended</span>
                <span className="text-xs font-mono font-medium text-ink-500">.CSV (Excel / Sheets)</span>
              </div>
              <h4 className="mt-2 text-base font-bold text-ink-900">
                📊 Complete Business Directory (CSV)
              </h4>
              <p className="mt-1 text-xs text-ink-600 leading-relaxed">
                Complete database export of all {totalBusinesses.toLocaleString()} businesses with names, sectors, phone numbers, WhatsApp, emails, websites, physical addresses, GPS coordinates, verification badges, and product/service catalogs. Pre-formatted with UTF-8 BOM for Microsoft Excel.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-ink-100 flex items-center justify-between">
              <span className="text-xs text-ink-500">{totalBusinesses.toLocaleString()} records</span>
              <a
                href="/api/admin/export/businesses?format=csv"
                download
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <span>📥</span> Download Full CSV
              </a>
            </div>
          </div>

          {/* Complete Directory JSON */}
          <div className="card p-5 flex flex-col justify-between border-ink-200">
            <div>
              <div className="flex items-center justify-between">
                <span className="badge-neutral">Developer &amp; Backup</span>
                <span className="text-xs font-mono font-medium text-ink-500">.JSON (Raw Trees)</span>
              </div>
              <h4 className="mt-2 text-base font-bold text-ink-900">
                💾 Complete Business Directory (JSON)
              </h4>
              <p className="mt-1 text-xs text-ink-600 leading-relaxed">
                Full relational JSON tree export with nested location objects, offerings arrays, owners, tags, and timestamps. Perfect for database backups, developer integrations, mobile apps, or migrating into Elasticsearch.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-ink-100 flex items-center justify-between">
              <span className="text-xs text-ink-500">Structured Objects</span>
              <a
                href="/api/admin/export/businesses?format=json"
                download
                className="btn-secondary btn-sm flex items-center gap-1.5"
              >
                <span>💾</span> Download Full JSON
              </a>
            </div>
          </div>

          {/* Taxonomy / Sectors CSV */}
          <div className="card p-5 flex flex-col justify-between border-ink-200">
            <div>
              <div className="flex items-center justify-between">
                <span className="badge-neutral">Classification</span>
                <span className="text-xs font-mono font-medium text-ink-500">.CSV</span>
              </div>
              <h4 className="mt-2 text-base font-bold text-ink-900">
                🏢 Sectors &amp; Categories Taxonomy (CSV)
              </h4>
              <p className="mt-1 text-xs text-ink-600 leading-relaxed">
                List of all {categoriesCount} business sectors and sub-categories with icons, slugs, parent relationships, active flags, and listing counts.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-ink-100 flex items-center justify-between">
              <span className="text-xs text-ink-500">{categoriesCount} categories</span>
              <a
                href="/api/admin/export/categories?format=csv"
                download
                className="btn-secondary btn-sm flex items-center gap-1.5"
              >
                <span>📥</span> Export Sectors (CSV)
              </a>
            </div>
          </div>

          {/* Users Summary CSV */}
          <div className="card p-5 flex flex-col justify-between border-ink-200">
            <div>
              <div className="flex items-center justify-between">
                <span className="badge-neutral">Accounts &amp; Roles</span>
                <span className="text-xs font-mono font-medium text-ink-500">.CSV</span>
              </div>
              <h4 className="mt-2 text-base font-bold text-ink-900">
                👥 Registered Users &amp; Roles (CSV)
              </h4>
              <p className="mt-1 text-xs text-ink-600 leading-relaxed">
                Export of registered users, roles (ADMIN, MODERATOR, BUSINESS_OWNER, CUSTOMER), statuses, business counts, and registration timestamps.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-ink-100 flex items-center justify-between">
              <span className="text-xs text-ink-500">Staff &amp; Members</span>
              <a
                href="/api/admin/export/users?format=csv"
                download
                className="btn-secondary btn-sm flex items-center gap-1.5"
              >
                <span>📥</span> Export Users (CSV)
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Filtered Custom Export Form */}
      <div className="card p-6 border-ink-200">
        <h3 className="text-lg font-bold text-ink-900">🎯 Custom Filtered Export</h3>
        <p className="text-xs text-ink-600 mt-1">
          Generate an export targeting a specific sector, region, or publication status.
        </p>

        <form action="/api/admin/export/businesses" method="GET" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label text-xs" htmlFor="filter-status">
              Listing Status
            </label>
            <select id="filter-status" name="status" className="select text-sm" defaultValue="ALL">
              <option value="ALL">All Statuses (Draft, Published, etc.)</option>
              <option value="PUBLISHED">Published Only (Active)</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="DRAFT">Draft</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          <div>
            <label className="label text-xs" htmlFor="filter-sector">
              Sector / Category
            </label>
            <select id="filter-sector" name="categoryId" className="select text-sm" defaultValue="">
              <option value="">All Sectors &amp; Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label text-xs" htmlFor="filter-region">
              Region
            </label>
            <select id="filter-region" name="regionId" className="select text-sm" defaultValue="">
              <option value="">All Regions</option>
              {regions.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  {reg.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label text-xs" htmlFor="filter-format">
              File Format
            </label>
            <select id="filter-format" name="format" className="select text-sm" defaultValue="csv">
              <option value="csv">CSV (Excel, Google Sheets, CRM)</option>
              <option value="json">JSON (Structured Developer Data)</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between pt-3 border-t border-ink-100">
            <span className="text-xs text-ink-500">
              Downloads initiate directly in your browser.
            </span>
            <button type="submit" className="btn-primary btn-sm flex items-center gap-1.5">
              <span>📥</span> Generate &amp; Download Custom Export
            </button>
          </div>
        </form>
      </div>

      {/* Data Dictionary Summary */}
      <div className="card p-5 bg-ink-50/50">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-500">Fields Included in Business Export</h4>
        <div className="mt-3 grid gap-2 text-xs text-ink-700 sm:grid-cols-2 md:grid-cols-3">
          <div className="space-y-1">
            <p className="font-semibold text-ink-900">Identification &amp; Taxonomy</p>
            <p>ID, Business Name, Slug, Sector/Category Name, Category Slug</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-ink-900">Verification &amp; Status</p>
            <p>Status, Verification Level, Verified Date, Claimed Flag, Source</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-ink-900">Direct Contact Channels</p>
            <p>Phone Number, WhatsApp, Email, Official Website, Preferred Channel</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-ink-900">Geographic &amp; GPS</p>
            <p>Region, District, Locality, Physical Address, Landmark, Latitude, Longitude</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-ink-900">Commercial Offerings</p>
            <p>Delivery Offered, Payment Methods, Tags, Products/Services List &amp; Prices</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-ink-900">Branding &amp; Audit</p>
            <p>Logo URL, Cover Image URL, Created Date, Updated Date, Published Date</p>
          </div>
        </div>
      </div>
    </div>
  );
}
