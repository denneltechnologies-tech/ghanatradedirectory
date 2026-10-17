import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth";
import { getQuoteRequestForActor } from "@/lib/services/logistics";
import { acceptQuoteAction, cancelQuoteRequestAction, closeQuoteRequestAction } from "@/actions/logistics";
import { QuoteStatusBadge } from "@/components/badges";
import { QuoteResponseForm } from "@/components/quote-response-form";
import { formatDate, formatMoney, humanizeEnum, timeAgo, toNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Quote request" };

const RESPONSE_TONE: Record<string, string> = {
  SUBMITTED: "badge-gold",
  ACCEPTED: "badge-brand",
  DECLINED: "badge-neutral",
  WITHDRAWN: "badge-neutral",
  EXPIRED: "badge-neutral",
};

export default async function QuoteRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const user = await requirePageUser(`/quotes/${id}`);
  const query = await searchParams;

  const request = await getQuoteRequestForActor(id, user).catch(() => null);
  if (!request) notFound();

  const isRequester = request.requesterId === user.id;
  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";
  const myRecipient = request.recipients.find(
    (recipient) => recipient.logisticsProfile.userId === user.id,
  );
  const myResponse = myRecipient
    ? request.responses.find((response) => response.logisticsProfileId === myRecipient.logisticsProfileId)
    : undefined;
  const canDecide = isRequester && ["SENT", "RESPONSES_RECEIVED"].includes(request.status);

  return (
    <div className="container-page py-8">
      <nav className="mb-3 text-xs text-ink-500">
        <Link href="/dashboard/quotes" className="link-muted">
          Quote requests
        </Link>
        <span className="mx-1">/</span>
        <span className="text-ink-700">{id.slice(0, 8)}…</span>
      </nav>

      {query.sent ? (
        <p className="mb-4 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">
          Your request was sent to {request.recipients.length}{" "}
          {request.recipients.length === 1 ? "provider" : "providers"}. You will be notified when
          they reply.
        </p>
      ) : null}

      <header className="card mb-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-ink-900">
              {request.pickupRegion.name} → {request.dropoffRegion.name}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              {humanizeEnum(request.serviceType)} · created {timeAgo(request.createdAt)}
            </p>
          </div>
          <QuoteStatusBadge status={request.status} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="section-title">Request details</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-500">Pickup</dt>
                <dd className="text-ink-800">
                  {[request.pickupDetails, request.pickupDistrict?.name, request.pickupRegion.name]
                    .filter(Boolean)
                    .join(", ")}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500">Drop-off</dt>
                <dd className="text-ink-800">
                  {[request.dropoffDetails, request.dropoffDistrict?.name, request.dropoffRegion.name]
                    .filter(Boolean)
                    .join(", ")}
                </dd>
              </div>
              {request.requestedDate ? (
                <div>
                  <dt className="text-ink-500">Preferred date</dt>
                  <dd className="text-ink-800">
                    {formatDate(request.requestedDate)}
                    {request.timeWindow ? ` · ${request.timeWindow}` : ""}
                  </dd>
                </div>
              ) : null}
              {request.cargoType ? (
                <div>
                  <dt className="text-ink-500">Cargo</dt>
                  <dd className="text-ink-800">
                    {request.cargoType}
                    {request.weightKg != null ? ` · ${toNumber(request.weightKg)?.toLocaleString("en-GH")} kg` : ""}
                  </dd>
                </div>
              ) : null}
              {request.vehicleNeeds ? (
                <div>
                  <dt className="text-ink-500">Vehicle needs</dt>
                  <dd className="text-ink-800">{request.vehicleNeeds}</dd>
                </div>
              ) : null}
              {request.specialHandling ? (
                <div>
                  <dt className="text-ink-500">Special handling</dt>
                  <dd className="text-ink-800">{request.specialHandling}</dd>
                </div>
              ) : null}
            </dl>
            {request.cargoDescription ? (
              <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600">
                {request.cargoDescription}
              </p>
            ) : null}
            {request.notes ? <p className="mt-2 text-sm text-ink-600">Notes: {request.notes}</p> : null}
          </section>

          <section className="card p-5">
            <h2 className="section-title">
              Responses <span className="text-ink-400">({request.responses.length})</span>
            </h2>
            {request.responses.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">
                No quotes yet. Providers usually respond within a day.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {request.responses.map((response) => {
                  const price = formatMoney(response.priceAmount, response.currency);
                  const business = response.logisticsProfile.business;
                  return (
                    <li key={response.id} className="rounded-lg border border-ink-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <Link href={`/logistics/${business.slug}`} className="font-semibold text-ink-900 hover:text-brand-700">
                            {business.name}
                          </Link>
                          <p className="text-xs text-ink-500">
                            {response.provider.displayName} · {timeAgo(response.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={RESPONSE_TONE[response.status] ?? "badge-neutral"}>
                            {humanizeEnum(response.status)}
                          </span>
                          <span className="text-lg font-bold text-ink-900">{price ?? "On request"}</span>
                        </div>
                      </div>
                      {response.inclusions ? (
                        <p className="mt-2 text-sm text-ink-600">Includes: {response.inclusions}</p>
                      ) : null}
                      <div className="mt-1 flex flex-wrap gap-4 text-xs text-ink-500">
                        {response.estimatedPickup ? <span>Pickup: {response.estimatedPickup}</span> : null}
                        {response.estimatedDelivery ? <span>Delivery: {response.estimatedDelivery}</span> : null}
                        {response.validUntil ? <span>Valid until {formatDate(response.validUntil)}</span> : null}
                      </div>
                      {response.terms ? (
                        <p className="mt-2 text-xs text-ink-500">Terms: {response.terms}</p>
                      ) : null}

                      {isRequester || isStaff ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {business.phone ? (
                            <a href={`tel:${business.phone}`} className="btn-secondary btn-sm">
                              Call {business.phone}
                            </a>
                          ) : null}
                          {business.whatsapp ? (
                            <a
                              href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-secondary btn-sm"
                            >
                              WhatsApp
                            </a>
                          ) : null}
                          {canDecide ? (
                            <form action={acceptQuoteAction}>
                              <input type="hidden" name="responseId" value={response.id} />
                              <input type="hidden" name="requestId" value={request.id} />
                              <button type="submit" className="btn-primary btn-sm">
                                Accept this quote
                              </button>
                            </form>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {myRecipient && !myResponse && request.status !== "CANCELLED" && request.status !== "CLOSED" ? (
            <section className="card p-5">
              <h2 className="section-title">Send your quote</h2>
              <div className="mt-3">
                <QuoteResponseForm quoteRequestId={request.id} />
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card space-y-2 p-5">
            <h2 className="text-sm font-semibold text-ink-900">Requester</h2>
            {isRequester || isStaff || myRecipient ? (
              <>
                <p className="text-sm text-ink-800">{request.requester.displayName}</p>
                <p className="text-sm text-ink-600">{request.contactPhone}</p>
                {request.contactEmail ? <p className="text-sm text-ink-600">{request.contactEmail}</p> : null}
              </>
            ) : (
              <p className="text-sm text-ink-500">Contact details are hidden.</p>
            )}
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-ink-900">
              Providers contacted ({request.recipients.length})
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-ink-600">
              {request.recipients.map((recipient) => (
                <li key={recipient.id} className="flex items-center justify-between gap-2">
                  <Link href={`/logistics/${recipient.logisticsProfile.business.slug}`} className="link-muted truncate">
                    {recipient.logisticsProfile.business.name}
                  </Link>
                  <span className="text-xs text-ink-400">
                    {recipient.seenAt ? "seen" : "sent"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {isRequester && !["CANCELLED", "CLOSED"].includes(request.status) ? (
            <div className="card space-y-2 p-5">
              <h2 className="text-sm font-semibold text-ink-900">Manage request</h2>
              <form action={closeQuoteRequestAction}>
                <input type="hidden" name="requestId" value={request.id} />
                <button type="submit" className="btn-secondary btn-sm w-full">
                  Mark as closed
                </button>
              </form>
              {request.status !== "ACCEPTED" ? (
                <form action={cancelQuoteRequestAction}>
                  <input type="hidden" name="requestId" value={request.id} />
                  <button type="submit" className="btn-ghost btn-sm w-full text-danger">
                    Cancel request
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}

          <p className="px-1 text-xs text-ink-500">
            Always confirm cargo, weight, route and price before pickup. The platform does not
            process payments for deliveries.
          </p>
        </aside>
      </div>
    </div>
  );
}
