import type { Metadata } from "next";
import Link from "next/link";
import { listBusinessesForAdmin } from "@/lib/services/admin";
import { StatusBadge, VerificationBadge } from "@/components/badges";
import {
  featureBusinessAction,
  setBusinessStatusAction,
  setVerificationAction,
} from "@/actions/admin";
import { formatDate, humanizeEnum, truncate } from "@/lib/format";
import { BusinessStatus, VerificationLevel } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Admin · Businesses" };

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
  const businesses = await listBusinessesForAdmin(status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-ink-900">Businesses</h2>
        <p className="text-sm text-ink-500">{businesses.length} shown</p>
      </div>

      <nav className="flex flex-wrap gap-1.5" aria-label="Status filter">
        {STATUS_TABS.map((tab) => {
          const active = (status ?? "ALL") === tab;
          return (
            <Link
              key={tab}
              href={tab === "ALL" ? "/admin/businesses" : `/admin/businesses?status=${tab}`}
              className={active ? "badge bg-ink-900 text-white" : "badge-neutral hover:bg-ink-200"}
            >
              {tab === "ALL" ? "All" : humanizeEnum(tab)}
            </Link>
          );
        })}
      </nav>

      <ul className="space-y-3">
        {businesses.map((business) => (
          <li key={business.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/businesses/${business.slug}`} className="font-semibold text-ink-900 hover:text-brand-700">
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
                  {business.claimed === false ? (
                    <span className="badge-neutral">Unclaimed</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  {business.category?.name} · {business.owner.displayName} ({business.owner.email}) ·
                  updated {formatDate(business.updatedAt)}
                </p>
                {business.sourceUrl ? (
                  <p className="mt-1 text-xs text-ink-500">
                    Source:{" "}
                    <a
                      href={business.sourceUrl}
                      className="link-muted"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {business.sourceRef ?? business.sourceUrl}
                    </a>
                  </p>
                ) : null}
                <p className="mt-1 text-sm text-ink-600">{truncate(business.description, 140)}</p>
                <p className="mt-1 text-xs text-ink-500">
                  {business._count.offerings} offerings · {business._count.comments} comments ·{" "}
                  {business._count.likes} likes
                </p>
              </div>
              <Link href={`/dashboard/businesses/${business.id}`} className="btn-ghost btn-sm">
                Owner view
              </Link>
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-ink-100 pt-3">
              <form action={setBusinessStatusAction} className="flex items-end gap-2">
                <input type="hidden" name="businessId" value={business.id} />
                <div>
                  <label className="label" htmlFor={`status-${business.id}`}>
                    Set status
                  </label>
                  <select
                    id={`status-${business.id}`}
                    name="status"
                    defaultValue={business.status}
                    className="select text-sm"
                  >
                    {Object.values(BusinessStatus).map((value) => (
                      <option key={value} value={value}>
                        {humanizeEnum(value)}
                      </option>
                    ))}
                  </select>
                </div>
                <input name="note" className="input text-sm" placeholder="Note (optional)" />
                <button type="submit" className="btn-primary btn-sm">
                  Apply
                </button>
              </form>

              <form action={setVerificationAction} className="flex items-end gap-2">
                <input type="hidden" name="businessId" value={business.id} />
                <div>
                  <label className="label" htmlFor={`verify-${business.id}`}>
                    Verification
                  </label>
                  <select
                    id={`verify-${business.id}`}
                    name="level"
                    defaultValue={business.verificationLevel}
                    className="select text-sm"
                  >
                    {Object.values(VerificationLevel).map((value) => (
                      <option key={value} value={value}>
                        {humanizeEnum(value)}
                      </option>
                    ))}
                  </select>
                </div>
                <input name="evidence" className="input text-sm" placeholder="Evidence note" />
                <button type="submit" className="btn-secondary btn-sm">
                  Set
                </button>
              </form>

              <form action={featureBusinessAction}>
                <input type="hidden" name="businessId" value={business.id} />
                <input type="hidden" name="featured" value={business.featured ? "false" : "true"} />
                <button type="submit" className="btn-secondary btn-sm">
                  {business.featured ? "Unfeature" : "Feature"}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
