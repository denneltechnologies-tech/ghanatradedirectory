import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { listProviderInbox, listRequestsForRequester } from "@/lib/services/logistics";
import { QuoteStatusBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { QuoteResponseForm } from "@/components/quote-response-form";
import { formatDate, formatMoney, humanizeEnum, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Quote requests" };

export default async function DashboardQuotesPage() {
  const user = await requirePageUser();
  const [asRequester, inbox] = await Promise.all([
    listRequestsForRequester(user.id),
    listProviderInbox(user.id),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="section-title">Your quote requests</h2>
        <p className="mt-1 text-sm text-ink-600">Requests you sent to logistics providers.</p>
        {asRequester.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No quote requests yet"
              description="Need something moved? Request a quote and compare provider responses."
              actionHref="/logistics/quote"
              actionLabel="Request a quote"
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {asRequester.map((request) => (
              <li key={request.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink-900">
                      {request.pickupRegion.name} → {request.dropoffRegion.name}
                    </p>
                    <p className="text-xs text-ink-500">
                      {humanizeEnum(request.serviceType)} · sent {timeAgo(request.createdAt)} ·{" "}
                      {request._count.recipients} providers
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <QuoteStatusBadge status={request.status} />
                    <Link href={`/quotes/${request.id}`} className="btn-secondary btn-sm">
                      Open
                    </Link>
                  </div>
                </div>
                {request.responses.length > 0 ? (
                  <p className="mt-2 text-xs text-brand-700">
                    {request.responses.length} {request.responses.length === 1 ? "response" : "responses"} received
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="section-title">Incoming requests (as a provider)</h2>
        <p className="mt-1 text-sm text-ink-600">
          Requests where customers selected your logistics profile.
        </p>
        {!inbox.profileId ? (
          <div className="mt-4 rounded-lg border border-ink-200 bg-white p-4 text-sm text-ink-600">
            You do not have a logistics profile yet.{" "}
            <Link href="/dashboard/logistics" className="link-muted font-medium">
              Create one
            </Link>{" "}
            to receive requests.
          </div>
        ) : inbox.requests.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">No incoming requests yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {inbox.requests.map((request) => {
              const myResponse = request.responses[0];
              return (
                <li key={request.id} className="card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-ink-900">
                        {request.pickupDetails} → {request.dropoffDetails}
                      </p>
                      <p className="text-xs text-ink-500">
                        {humanizeEnum(request.serviceType)} · {request.requester.displayName} ·{" "}
                        {timeAgo(request.createdAt)}
                      </p>
                      {request.cargoDescription ? (
                        <p className="mt-1 text-xs text-ink-600">{request.cargoDescription}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <QuoteStatusBadge status={request.status} />
                      <Link href={`/quotes/${request.id}`} className="btn-secondary btn-sm">
                        View
                      </Link>
                    </div>
                  </div>

                  {myResponse ? (
                    <p className="mt-3 text-sm text-brand-700">
                      You quoted {formatMoney(myResponse.priceAmount, myResponse.currency) ?? "—"} ·{" "}
                      {humanizeEnum(myResponse.status)}
                    </p>
                  ) : null}

                  {request.status !== "CANCELLED" && request.status !== "CLOSED" ? (
                    <details className="mt-3" open={!myResponse}>
                      <summary className="cursor-pointer text-sm font-medium text-brand-700">
                        {myResponse ? "Update your quote" : "Send a quote"}
                      </summary>
                      <div className="mt-3">
                        <QuoteResponseForm
                          quoteRequestId={request.id}
                          replace={Boolean(myResponse)}
                          values={
                            myResponse
                              ? {
                                  priceAmount:
                                    myResponse.priceAmount != null ? myResponse.priceAmount.toString() : "",
                                  currency: myResponse.currency,
                                  inclusions: myResponse.inclusions ?? "",
                                  estimatedPickup: myResponse.estimatedPickup ?? "",
                                  estimatedDelivery: myResponse.estimatedDelivery ?? "",
                                  terms: myResponse.terms ?? "",
                                  validUntil: myResponse.validUntil
                                    ? myResponse.validUntil.toISOString().slice(0, 10)
                                    : "",
                                }
                              : undefined
                          }
                        />
                      </div>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-ink-500">
        Requests created on or after {formatDate(new Date())} are shown here. Always confirm cargo,
        weight and route before pickup.
      </p>
    </div>
  );
}
