import type { Metadata } from "next";
import Link from "next/link";
import { analyticsSummary, getReportQueue, getReviewQueue } from "@/lib/services/admin";
import { getClaimQueue } from "@/lib/services/claims";
import { humanizeEnum, timeAgo } from "@/lib/format";
import { StatusBadge } from "@/components/badges";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminOverviewPage() {
  const [summary, claims, reports, pending] = await Promise.all([
    analyticsSummary(30),
    getClaimQueue(),
    getReportQueue(),
    getReviewQueue(),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[
          { label: "Published businesses", value: summary.publishedBusinesses },
          { label: "Awaiting review", value: summary.pendingBusinesses },
          { label: "Active users", value: summary.totalUsers },
          { label: "Pending claims", value: summary.pendingClaims },
          { label: "Open reports", value: summary.openReports },
          { label: "Quote requests (30d)", value: summary.quoteRequests },
          { label: "Provider responses (30d)", value: summary.providerResponses },
          { label: "No-result searches (30d)", value: summary.noResultSearches },
        ].map((item) => (
          <div key={item.label} className="card px-4 py-3">
            <p className="text-xs text-ink-500">{item.label}</p>
            <p className="text-xl font-bold text-ink-900">{item.value}</p>
          </div>
        ))}
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Listings awaiting review</h2>
          <Link href="/admin/businesses?status=PENDING_REVIEW" className="link-muted text-sm">
            View all →
          </Link>
        </div>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">Nothing waiting. The review queue is clear.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pending.slice(0, 8).map((business) => (
              <li key={business.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-ink-800">
                  {business.name}
                  <span className="ml-2 text-xs text-ink-500">{business.owner.displayName}</span>
                </span>
                <StatusBadge status={business.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Pending claims</h2>
            <Link href="/admin/claims" className="link-muted text-sm">
              Open queue →
            </Link>
          </div>
          {claims.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">No pending claims.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {claims.slice(0, 6).map((claim) => (
                <li key={claim.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-ink-700">{claim.business.name}</span>
                  <span className="text-xs text-ink-500">{claim.claimant.displayName}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Open reports</h2>
            <Link href="/admin/reports" className="link-muted text-sm">
              Open queue →
            </Link>
          </div>
          {reports.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">No open reports.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {reports.slice(0, 6).map((report) => (
                <li key={report.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-ink-700">
                    {humanizeEnum(report.reason)} · {report.business?.name ?? humanizeEnum(report.targetType)}
                  </span>
                  <span className="text-xs text-ink-500">{timeAgo(report.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="section-title">Most viewed listings</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {summary.topByViews.map((business, index) => (
              <li key={business.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-ink-700">
                  {index + 1}. {business.name}
                </span>
                <span className="text-xs text-ink-500">{business.viewCount} views</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="card p-5">
          <h2 className="section-title">Recent searches (30d)</h2>
          {summary.searchQueries.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">No searches recorded yet.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {summary.searchQueries.map((query, index) => (
                <span key={`${query}-${index}`} className="badge-neutral">
                  {query}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card p-5">
        <h2 className="section-title">Event totals (30d)</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {summary.eventTotals.length === 0 ? (
            <p className="text-sm text-ink-500">No analytics events recorded yet.</p>
          ) : (
            summary.eventTotals.map((event) => (
              <span key={event.type} className="badge-neutral">
                {humanizeEnum(event.type)}: {event.count}
              </span>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
