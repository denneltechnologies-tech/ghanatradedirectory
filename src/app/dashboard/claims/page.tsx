import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { listClaimsForUser } from "@/lib/services/claims";
import { EmptyState } from "@/components/empty-state";
import { formatDate, humanizeEnum } from "@/lib/format";

export const metadata: Metadata = { title: "My claims" };

const TONE: Record<string, string> = {
  PENDING: "badge-gold",
  APPROVED: "badge-brand",
  REJECTED: "badge-danger",
};

export default async function DashboardClaimsPage() {
  const user = await requirePageUser();
  const claims = await listClaimsForUser(user.id);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-ink-900">My claims</h2>
        <p className="mt-1 text-sm text-ink-600">
          Claims you have submitted to manage a listing. A moderator reviews the evidence you
          provide.
        </p>
      </div>

      {claims.length === 0 ? (
        <EmptyState
          title="No claims submitted"
          description="If you own a business already listed, open its profile and choose “Own this business?”."
          actionHref="/search"
          actionLabel="Find your business"
        />
      ) : (
        <ul className="space-y-3">
          {claims.map((claim) => (
            <li key={claim.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-ink-900">{claim.business.name}</p>
                  <p className="text-xs text-ink-500">Submitted {formatDate(claim.createdAt)}</p>
                </div>
                <span className={TONE[claim.status] ?? "badge-neutral"}>
                  {humanizeEnum(claim.status)}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-600">{claim.evidence}</p>
              {claim.decisionNote ? (
                <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">
                  Moderator note: {claim.decisionNote}
                </p>
              ) : null}
              {claim.status === "APPROVED" ? (
                <Link
                  href={`/businesses/${claim.business.slug}`}
                  className="btn-secondary btn-sm mt-3"
                >
                  View listing
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
