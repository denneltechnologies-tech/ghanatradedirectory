import type { Metadata } from "next";
import Link from "next/link";
import { getClaimQueue } from "@/lib/services/claims";
import { decideClaimAction } from "@/actions/admin";
import { formatDate, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Admin · Claims" };

export default async function AdminClaimsPage() {
  const claims = await getClaimQueue();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink-900">Listing claims</h2>
        <p className="text-sm text-ink-500">{claims.length} pending</p>
      </div>

      {claims.length === 0 ? (
        <p className="card p-5 text-sm text-ink-500">No pending claims. All caught up.</p>
      ) : (
        <ul className="space-y-3">
          {claims.map((claim) => (
            <li key={claim.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/businesses/${claim.business.slug}`} className="font-semibold text-ink-900 hover:text-brand-700">
                    {claim.business.name}
                  </Link>
                  <p className="mt-1 text-xs text-ink-500">
                    Claimed by {claim.claimant.displayName} ({claim.claimant.email})
                    {claim.claimant.phone ? ` · ${claim.claimant.phone}` : ""} · submitted{" "}
                    {timeAgo(claim.createdAt)}
                  </p>
                </div>
                <span className="badge-gold">pending</span>
              </div>

              <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-700">
                {claim.evidence}
              </p>
              {claim.contactPhone ? (
                <p className="mt-1 text-xs text-ink-500">Contact phone on claim: {claim.contactPhone}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-end gap-2">
                <form action={decideClaimAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="claimId" value={claim.id} />
                  <div>
                    <label className="label" htmlFor={`claim-note-${claim.id}`}>
                      Decision note
                    </label>
                    <input
                      id={`claim-note-${claim.id}`}
                      name="note"
                      className="input text-sm"
                      placeholder="Why approved or rejected"
                    />
                  </div>
                  <button type="submit" name="decision" value="APPROVED" className="btn-primary btn-sm">
                    Approve
                  </button>
                  <button type="submit" name="decision" value="REJECTED" className="btn-danger btn-sm">
                    Reject
                  </button>
                </form>
                <span className="text-xs text-ink-400">Updated {formatDate(claim.createdAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
