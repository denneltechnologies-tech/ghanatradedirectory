import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { listBusinessesForUser, ownerDashboardStats } from "@/lib/services/businesses";
import { listClaimsForUser } from "@/lib/services/claims";
import { getProviderProfileForUser } from "@/lib/services/logistics";
import { prisma } from "@/lib/db";
import { StatusBadge, VerificationBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { humanizeEnum, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requirePageUser();
  const businesses = await listBusinessesForUser(user.id);
  const businessIds = businesses.map((business) => business.id);

  const [stats, claims, provider, unread] = await Promise.all([
    ownerDashboardStats(user.id, businessIds),
    listClaimsForUser(user.id),
    getProviderProfileForUser(user.id),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  const pendingClaims = claims.filter((claim) => claim.status === "PENDING");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Profile views", value: stats.views },
          { label: "Likes", value: stats.likes },
          { label: "Comments", value: stats.comments },
          { label: "Contact clicks", value: stats.contactClicks },
          { label: "Active offerings", value: stats.offerings },
          { label: "Open claims", value: stats.openClaims },
        ].map((item) => (
          <div key={item.label} className="card px-4 py-3">
            <p className="text-xs text-ink-500">{item.label}</p>
            <p className="text-xl font-bold text-ink-900">{item.value}</p>
          </div>
        ))}
      </div>

      {unread > 0 ? (
        <Link href="/dashboard/notifications" className="card flex items-center gap-3 border-gold-200 bg-gold-100 p-4">
          <span className="text-xl" aria-hidden>
            🔔
          </span>
          <span className="text-sm text-gold-500">
            You have {unread} unread {unread === 1 ? "notification" : "notifications"}.
          </span>
        </Link>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">Your businesses</h2>
          <Link href="/dashboard/businesses/new" className="btn-primary btn-sm">
            Add business
          </Link>
        </div>

        {businesses.length === 0 ? (
          <EmptyState
            title="No listings yet"
            description="Create a free listing so customers across Ghana can find and contact you."
            actionHref="/dashboard/businesses/new"
            actionLabel="Create your first listing"
          />
        ) : (
          <ul className="space-y-3">
            {businesses.map((business) => (
              <li key={business.id} className="card flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/dashboard/businesses/${business.id}`} className="font-semibold text-ink-900 hover:text-brand-700">
                      {business.name}
                    </Link>
                    <StatusBadge status={business.status} />
                    {business.verificationLevel !== "UNVERIFIED" ? (
                      <VerificationBadge level={business.verificationLevel} compact />
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-ink-500">
                    {business.category?.name}
                    {business.locations[0]
                      ? ` · ${[business.locations[0].locality, business.locations[0].region?.name].filter(Boolean).join(", ")}`
                      : ""}
                    {" · "}
                    {business._count.offerings} offerings · {business._count.likes} likes
                  </p>
                </div>
                <div className="flex gap-2">
                  {business.status === "PUBLISHED" ? (
                    <Link href={`/businesses/${business.slug}`} className="btn-secondary btn-sm">
                      View
                    </Link>
                  ) : null}
                  <Link href={`/dashboard/businesses/${business.id}`} className="btn-primary btn-sm">
                    Manage
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="section-title">Logistics profile</h2>
          {provider ? (
            <>
              <p className="mt-2 text-sm text-ink-600">
                Linked to {provider.business.name} ·{" "}
                {provider.serviceTypes.slice(0, 3).map(humanizeEnum).join(", ")}
                {provider.active ? "" : " · inactive"}
              </p>
              <Link href="/dashboard/logistics" className="btn-secondary btn-sm mt-3">
                Manage logistics profile
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-ink-600">
                Offer courier, haulage or transport services and receive quote requests.
              </p>
              <Link href="/dashboard/logistics" className="btn-secondary btn-sm mt-3">
                Create logistics profile
              </Link>
            </>
          )}
        </div>

        <div className="card p-5">
          <h2 className="section-title">Claims</h2>
          {pendingClaims.length === 0 ? (
            <p className="mt-2 text-sm text-ink-600">
              No pending claims.{" "}
              <Link href="/dashboard/claims" className="link-muted">
                View all claims →
              </Link>
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {pendingClaims.slice(0, 4).map((claim) => (
                <li key={claim.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-ink-700">{claim.business.name}</span>
                  <span className="badge-gold shrink-0">under review</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="text-xs text-ink-500">
        Last updated {timeAgo(user.updatedAt)}. Keep your contact details accurate so customers can
        reach you.
      </p>
    </div>
  );
}
