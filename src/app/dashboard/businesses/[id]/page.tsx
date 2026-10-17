import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth";
import { assertCanManageBusiness } from "@/lib/permissions";
import { getBusinessForOwner } from "@/lib/services/businesses";
import { getRegionOptions } from "@/lib/services/discovery";
import { prisma } from "@/lib/db";
import { BusinessForm, type BusinessFormValues } from "@/components/business-form";
import { OfferingForm, type OfferingValues } from "@/components/offering-form";
import { StatusBadge, VerificationBadge, OfferingStatusBadge } from "@/components/badges";
import {
  archiveBusinessAction,
  submitForReviewAction,
  uploadBusinessMediaAction,
  deleteBusinessMediaAction,
} from "@/actions/business";
import { archiveOfferingAction, uploadOfferingImageAction } from "@/actions/offering";
import { formatDate, formatMoney, humanizeEnum } from "@/lib/format";
import { mediaUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Manage listing" };

export default async function ManageBusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser();
  const { id } = await params;
  const query = await searchParams;

  await assertCanManageBusiness(user, id).catch(() => notFound());

  const [business, regionOptions, categories] = await Promise.all([
    getBusinessForOwner(id),
    getRegionOptions(),
    prisma.category.findMany({
      where: { active: true },
      select: { id: true, name: true, slug: true, icon: true, parentId: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!business) notFound();

  const location = business.locations[0];
  const values: BusinessFormValues = {
    id: business.id,
    name: business.name,
    description: business.description,
    longDescription: business.longDescription ?? "",
    categoryId: business.categoryId,
    phone: business.phone ?? "",
    whatsapp: business.whatsapp ?? "",
    email: business.email ?? "",
    website: business.website ?? "",
    facebook: business.facebook ?? "",
    instagram: business.instagram ?? "",
    tiktok: business.tiktok ?? "",
    twitter: business.twitter ?? "",
    contactHours: business.contactHours ?? "",
    preferredChannel: business.preferredChannel ?? "",
    registrationName: business.registrationName ?? "",
    registrationId: business.registrationId ?? "",
    deliveryOffered: business.deliveryOffered,
    paymentMethods: business.paymentMethods.join(", "),
    languages: business.languages.join(", "),
    tags: business.tags.join(", "),
    accessibilityNotes: business.accessibilityNotes ?? "",
    regionId: location?.regionId ?? "",
    districtId: location?.districtId ?? "",
    locality: location?.locality ?? "",
    address: location?.address ?? "",
    landmark: location?.landmark ?? "",
    latitude: location?.latitude != null ? String(location.latitude) : "",
    longitude: location?.longitude != null ? String(location.longitude) : "",
  };

  const canSubmit = ["DRAFT", "REJECTED", "PENDING_REVIEW"].includes(business.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-ink-900">{business.name}</h2>
            <StatusBadge status={business.status} />
            <VerificationBadge level={business.verificationLevel} verifiedAt={business.verifiedAt} compact />
          </div>
          <p className="mt-1 text-xs text-ink-500">
            Last updated {formatDate(business.lastUpdatedAt)} · /businesses/{business.slug}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {business.status === "PUBLISHED" ? (
            <Link href={`/businesses/${business.slug}`} className="btn-secondary btn-sm">
              View public page
            </Link>
          ) : null}
          {canSubmit ? (
            <form action={submitForReviewAction}>
              <input type="hidden" name="businessId" value={business.id} />
              <button type="submit" className="btn-primary btn-sm">
                Submit for review
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {query.created ? (
        <p className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">
          Draft created. Add offerings and a cover image, then submit for review.
        </p>
      ) : null}
      {query.media === "ok" ? (
        <p className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">
          Image uploaded.
        </p>
      ) : null}
      {query.media === "error" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
          Upload failed. Use a JPG, PNG, WEBP, AVIF or GIF under 5MB.
        </p>
      ) : null}
      {query.media === "missing" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
          Choose a file to upload.
        </p>
      ) : null}

      <section className="card space-y-4 p-5">
        <h3 className="section-title">Images</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              { kind: "COVER", label: "Cover image", key: business.coverKey },
              { kind: "LOGO", label: "Logo", key: business.logoKey },
            ] as const
          ).map((slot) => {
            const src = mediaUrl(slot.key);
            return (
              <div key={slot.kind} className="space-y-2">
                <p className="label">{slot.label}</p>
                <div className="h-28 w-full overflow-hidden rounded-lg bg-ink-100">
                  {src ? (
                     
                    <img src={src} alt={slot.label} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-ink-400">
                      No image
                    </span>
                  )}
                </div>
                <form action={uploadBusinessMediaAction} className="flex items-center gap-2">
                  <input type="hidden" name="businessId" value={business.id} />
                  <input type="hidden" name="kind" value={slot.kind} />
                  <input
                    type="file"
                    name="file"
                    accept="image/*"
                    required
                    className="block w-full text-xs text-ink-600"
                  />
                  <button type="submit" className="btn-secondary btn-sm shrink-0">
                    Upload
                  </button>
                </form>
              </div>
            );
          })}
          <div className="space-y-2">
            <p className="label">Add gallery photo</p>
            <form action={uploadBusinessMediaAction} className="flex items-center gap-2">
              <input type="hidden" name="businessId" value={business.id} />
              <input type="hidden" name="kind" value="OTHER" />
              <input type="file" name="file" accept="image/*" required className="block w-full text-xs text-ink-600" />
              <button type="submit" className="btn-secondary btn-sm shrink-0">
                Upload
              </button>
            </form>
          </div>
        </div>

        {business.media.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {business.media.map((item) => {
              const src = mediaUrl(item.storageKey);
              return (
                <div key={item.id} className="w-24 space-y-1">
                  <div className="h-20 w-24 overflow-hidden rounded-lg bg-ink-100">
                    {src ? (
                       
                      <img src={src} alt={item.kind} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <form action={deleteBusinessMediaAction}>
                    <input type="hidden" name="businessId" value={business.id} />
                    <input type="hidden" name="mediaId" value={item.id} />
                    <button type="submit" className="w-full text-xs text-danger hover:underline">
                      Remove
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="card space-y-4 p-5">
        <h3 className="section-title">Offerings</h3>
        {business.offerings.length === 0 ? (
          <p className="text-sm text-ink-500">No products or services yet. Add your first below.</p>
        ) : (
          <ul className="space-y-3">
            {business.offerings.map((offering) => {
              const offeringValues: OfferingValues = {
                id: offering.id,
                type: offering.type,
                title: offering.title,
                description: offering.description ?? "",
                priceAmount: offering.priceAmount != null ? offering.priceAmount.toString() : "",
                currency: offering.currency,
                priceLabel: offering.priceLabel ?? "",
                availability: offering.availability ?? "",
                deliveryNote: offering.deliveryNote ?? "",
                actionUrl: offering.actionUrl ?? "",
                sortOrder: String(offering.sortOrder),
              };
              const price = formatMoney(offering.priceAmount, offering.currency);
              return (
                <li key={offering.id} className="rounded-lg border border-ink-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-ink-900">{offering.title}</p>
                      <p className="text-xs text-ink-500">
                        {humanizeEnum(offering.type)}
                        {price ? ` · ${price}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <OfferingStatusBadge status={offering.status} />
                      {offering.status === "ACTIVE" ? (
                        <form action={archiveOfferingAction}>
                          <input type="hidden" name="offeringId" value={offering.id} />
                          <button type="submit" className="btn-ghost btn-sm text-danger">
                            Archive
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-ink-600">Edit</summary>
                    <div className="mt-3">
                      <OfferingForm businessId={business.id} values={offeringValues} />
                    </div>
                  </details>

                  <form action={uploadOfferingImageAction} className="mt-3 flex items-center gap-2">
                    <input type="hidden" name="offeringId" value={offering.id} />
                    <input type="file" name="file" accept="image/*" required className="block w-full text-xs text-ink-600" />
                    <button type="submit" className="btn-secondary btn-sm shrink-0">
                      Add photo
                    </button>
                  </form>
                  {offering.media.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {offering.media.map((media) => {
                        const src = mediaUrl(media.storageKey);
                        return src ? (
                           
                          <img key={media.id} src={src} alt={offering.title} className="h-14 w-14 rounded object-cover" />
                        ) : null;
                      })}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <details>
          <summary className="cursor-pointer text-sm font-medium text-brand-700">
            + Add a new offering
          </summary>
          <div className="mt-4">
            <OfferingForm businessId={business.id} />
          </div>
        </details>
      </section>

      <section>
        <h3 className="section-title mb-3">Listing details</h3>
        <BusinessForm
          mode="edit"
          values={values}
          categories={categories}
          regions={regionOptions}
          status={query.created ? "created" : undefined}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="section-title">Verification history</h3>
          {business.verificationEvents.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">No verification checks recorded yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {business.verificationEvents.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-2">
                  <span className="text-ink-700">{humanizeEnum(event.level)}</span>
                  <span className="text-xs text-ink-500">
                    {formatDate(event.createdAt)}
                    {event.actor ? ` · ${event.actor.displayName}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h3 className="section-title">Claims on this listing</h3>
          {business.claims.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">No claims submitted.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {business.claims.map((claim) => (
                <li key={claim.id} className="flex items-center justify-between gap-2">
                  <span className="text-ink-700">{humanizeEnum(claim.status)}</span>
                  <span className="text-xs text-ink-500">{formatDate(claim.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card border-red-200 p-5">
        <h3 className="section-title text-danger">Archive listing</h3>
        <p className="mt-1 text-sm text-ink-600">
          Archiving hides the listing from the directory. You can contact support to restore it.
        </p>
        <form
          action={archiveBusinessAction}
          className="mt-3"
          onSubmit={undefined}
        >
          <input type="hidden" name="businessId" value={business.id} />
          <button type="submit" className="btn-danger btn-sm">
            Archive this listing
          </button>
        </form>
      </section>
    </div>
  );
}
