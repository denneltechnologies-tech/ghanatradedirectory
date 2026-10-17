import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { superAdminCreateBusinessAction } from "@/actions/admin";
import { BusinessStatus, VerificationLevel } from "@/generated/prisma/enums";
import { humanizeEnum } from "@/lib/format";

export const metadata: Metadata = { title: "Super Admin · Add New Business" };

export default async function SuperAdminNewBusinessPage() {
  const [categories, regions] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      include: { parent: { select: { name: true } } },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    }),
    prisma.region.findMany({
      include: { districts: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between border-b border-ink-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700 border border-brand-200">
              ⚡ Super Admin Action
            </span>
            <h1 className="text-xl font-bold text-ink-900">Add New Directory Business</h1>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            Directly register and immediately publish a verified business to the GhanaMarketTrade directory.
          </p>
        </div>
        <Link href="/admin/businesses" className="btn-secondary btn-sm">
          ← Back to Businesses
        </Link>
      </div>

      <form action={superAdminCreateBusinessAction} className="card p-6 space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-500">
            1. Basic Information
          </h2>

          <div>
            <label className="label" htmlFor="name">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder="e.g. Stanbic Bank Ghana, Papaye Fast Foods, Melcom Kumasi"
              className="input w-full"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="categoryId">
                Sector / Category <span className="text-red-500">*</span>
              </label>
              <select id="categoryId" name="categoryId" required className="select w-full">
                <option value="">Select a Sector</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent ? `${c.parent.name} → ` : ""}
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="website">
                Official Website
              </label>
              <input
                id="website"
                name="website"
                type="url"
                placeholder="https://example.com.gh"
                className="input w-full"
              />
              <p className="mt-1 text-2xs text-ink-500">
                If provided, accurate logo will be discovered automatically.
              </p>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="logoKey">
              Official Logo Image URL
            </label>
            <input
              id="logoKey"
              name="logoKey"
              placeholder="https://example.com/logo.png or leave empty to auto-fetch from Google/Website"
              className="input w-full"
            />
          </div>

          <div>
            <label className="label" htmlFor="description">
              Short Description / Summary <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={2}
              placeholder="Brief summary of what this business does and what products/services it provides..."
              className="textarea w-full"
            />
          </div>

          <div>
            <label className="label" htmlFor="longDescription">
              Detailed Description / About (Optional)
            </label>
            <textarea
              id="longDescription"
              name="longDescription"
              rows={3}
              placeholder="Full profile overview, history, services, operational details..."
              className="textarea w-full"
            />
          </div>
        </div>

        {/* Contact Details */}
        <div className="space-y-4 border-t border-ink-100 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-500">
            2. Contact & Communications
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="phone">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                placeholder="+233 30 200 0000"
                className="input w-full"
              />
            </div>

            <div>
              <label className="label" htmlFor="whatsapp">
                WhatsApp Number
              </label>
              <input
                id="whatsapp"
                name="whatsapp"
                placeholder="+233 24 000 0000"
                className="input w-full"
              />
            </div>

            <div>
              <label className="label" htmlFor="email">
                Contact Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="info@business.com.gh"
                className="input w-full"
              />
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="space-y-4 border-t border-ink-100 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-500">
            3. Location in Ghana
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="regionId">
                Region
              </label>
              <select id="regionId" name="regionId" className="select w-full">
                <option value="">Select Region</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="locality">
                City / Locality / Suburb
              </label>
              <input
                id="locality"
                name="locality"
                placeholder="e.g. Osu, Airport Residential, Adum, Takoradi"
                className="input w-full"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="address">
              Physical Street Address / Landmarks
            </label>
            <input
              id="address"
              name="address"
              placeholder="e.g. 12 Independence Avenue, Opposite National Theatre"
              className="input w-full"
            />
          </div>
        </div>

        {/* Status, Badges & Publishing */}
        <div className="space-y-4 border-t border-ink-100 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-500">
            4. Status & Directory Verification
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="status">
                Publication Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue="PUBLISHED"
                className="select w-full"
              >
                {Object.values(BusinessStatus).map((value) => (
                  <option key={value} value={value}>
                    {humanizeEnum(value)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="verificationLevel">
                Verification Badge
              </label>
              <select
                id="verificationLevel"
                name="verificationLevel"
                defaultValue="CAC_REGULATOR_ACCREDITED"
                className="select w-full"
              >
                {Object.values(VerificationLevel).map((value) => (
                  <option key={value} value={value}>
                    {humanizeEnum(value)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="featured"
              name="featured"
              value="true"
              className="checkbox"
            />
            <label htmlFor="featured" className="text-sm font-medium text-ink-800">
              Feature on Homepage &amp; Top Search (Gold Badge)
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 border-t border-ink-100 pt-5">
          <Link href="/admin/businesses" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary">
            ✓ Add &amp; Publish Business
          </button>
        </div>
      </form>
    </div>
  );
}
