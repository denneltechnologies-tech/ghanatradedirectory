import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getPublicBusiness, recordProfileView } from "@/lib/services/businesses";
import { listComments, getLikeState } from "@/lib/services/engagement";
import { getCurrentUser } from "@/lib/auth";
import { canManageBusiness } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { humanizeEnum, initials, safeHttpUrl, truncate } from "@/lib/format";
import { mediaUrl } from "@/lib/storage";
import { mapsHref } from "@/lib/client-links";
import { VerificationBadge } from "@/components/badges";
import { BusinessCard } from "@/components/business-card";
import { ContactActions } from "@/components/contact-actions";
import { LikeButton } from "@/components/like-button";
import { ShareButton } from "@/components/share-button";
import { ReportDialog } from "@/components/report-dialog";
import { CommentSection } from "@/components/comment-section";
import { ClaimForm } from "@/components/claim-form";
import { businessCardInclude } from "@/lib/search";
import { getBusinessLogo } from "@/lib/sector-media";
import { BusinessOfferingsSection } from "@/components/business-offerings-section";

const getBusiness = cache(async (slug: string) => getPublicBusiness(slug));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) return { title: "Business not found" };
  const logo = getBusinessLogo(business);
  return {
    title: `${business.name} — GhanaMarketTrade`,
    description: truncate(business.description, 155),
    alternates: { canonical: `/businesses/${business.slug}` },
    openGraph: {
      title: `${business.name} — GhanaMarketTrade`,
      description: truncate(business.description, 200),
      images: logo ? [logo] : ["/logo.png"],
    },
  };
}

export default async function BusinessProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const business = await getBusiness(slug);
  if (!business) notFound();

  void recordProfileView(business.id);

  const commentsPage = Number.parseInt(String(query.commentsPage ?? "1"), 10) || 1;
  const path = `/businesses/${business.slug}`;

  const [user, likeState, comments, related] = await Promise.all([
    getCurrentUser(),
    getLikeState(business.id, (await getCurrentUser())?.id ?? null),
    listComments(business.id, { page: commentsPage, perPage: 10 }),
    prisma.business.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        categoryId: business.categoryId,
        id: { not: business.id },
      },
      include: businessCardInclude,
      orderBy: [{ featured: "desc" }, { viewCount: "desc" }],
      take: 3,
    }),
  ]);

  const isOwner = user ? await canManageBusiness(user, business.id) : false;
  const logo = getBusinessLogo(business);
  const location = business.locations[0];
  const mapQuery = mapsHref([
    location?.address,
    location?.locality,
    location?.district?.name,
    location?.region?.name,
    "Ghana",
  ]);
  const website = safeHttpUrl(business.website);
  const gallery = business.media.filter((item) => item.kind === "OTHER" && item.status === "APPROVED");

  return (
    <div className="container-page py-6">
      <div className="relative mb-4 flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50/40 via-white to-slate-50 border border-ink-100 p-6 sm:h-52 shadow-2xs">
        {logo ? (
          <img
            src={logo}
            alt={`${business.name} logo`}
            className="max-h-28 max-w-[80%] object-contain drop-shadow-xs"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white shadow-xs">
              {initials(business.name)}
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <header className="card p-5">
            <div className="flex flex-wrap items-start gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm text-lg font-bold text-brand-700">
                {logo ? (
                  <img src={logo} alt={`${business.name} logo`} className="h-full w-full object-contain p-1.5" />
                ) : (
                  initials(business.name)
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-ink-900">{business.name}</h1>
                  {business.featured ? <span className="badge-gold">Featured</span> : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Link href={`/sectors/${business.category.parent?.slug ?? business.category.slug}`} className="badge-neutral">
                    {business.category.icon ? `${business.category.icon} ` : ""}
                    {business.category.parent ? `${business.category.parent.name} · ` : ""}
                    {business.category.name}
                  </Link>
                  <VerificationBadge level={business.verificationLevel} verifiedAt={business.verifiedAt} />
                </div>
                {location ? (
                  <p className="mt-2 text-sm text-ink-600">
                    📍 {[location.locality, location.district?.name, location.region?.name].filter(Boolean).join(", ")}
                    {location.address ? ` — ${location.address}` : ""}
                  </p>
                ) : null}
              </div>
            </div>

            <p className="mt-4 text-sm whitespace-pre-line text-ink-700">{business.description}</p>

            {business.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {business.tags.map((tag) => (
                  <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`} className="badge-neutral">
                    #{tag}
                  </Link>
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <LikeButton
                businessId={business.id}
                initialCount={likeState.count}
                initialLiked={likeState.liked}
                isAuthenticated={Boolean(user)}
                path={path}
              />
              <ShareButton title={business.name} path={path} businessId={business.id} />
              <ReportDialog
                targetType="BUSINESS"
                targetId={business.id}
                businessId={business.id}
                path={path}
                label="Report listing"
              />
              {isOwner ? (
                <Link href={`/dashboard/businesses/${business.id}`} className="btn-secondary btn-sm">
                  Manage listing
                </Link>
              ) : null}
            </div>
          </header>

          {/* Products & Services section positioned between description and comments */}
          <BusinessOfferingsSection business={business} />

          {business.longDescription ? (
            <section className="card p-5">
              <h2 className="section-title">About {business.name}</h2>
              <p className="mt-3 text-sm whitespace-pre-line text-ink-700">{business.longDescription}</p>
            </section>
          ) : null}

          {gallery.length > 0 ? (
            <section className="card p-5">
              <h2 className="section-title">Photos</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {gallery.map((item) => {
                  const src = mediaUrl(item.storageKey);
                  if (!src) return null;
                  return (
                     
                    <img
                      key={item.id}
                      src={src}
                      alt={item.altText ?? `${business.name} photo`}
                      loading="lazy"
                      className="h-32 w-full rounded-lg object-cover"
                    />
                  );
                })}
              </div>
            </section>
          ) : null}

          <CommentSection
            businessId={business.id}
            path={path}
            items={comments.items}
            total={comments.total}
            page={comments.page}
            totalPages={comments.totalPages}
            isAuthenticated={Boolean(user)}
            currentUserId={user?.id ?? null}
          />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card space-y-3 p-5">
            <h2 className="text-sm font-semibold text-ink-900">Contact {business.name}</h2>
            <ContactActions business={business} />
            <dl className="space-y-2 border-t border-ink-100 pt-3 text-sm">
              {business.contactHours ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Hours</dt>
                  <dd className="text-right text-ink-800">{business.contactHours}</dd>
                </div>
              ) : null}
              {business.preferredChannel ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Preferred channel</dt>
                  <dd className="text-right text-ink-800">{humanizeEnum(business.preferredChannel)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Delivery</dt>
                <dd className="text-right text-ink-800">
                  {business.deliveryOffered ? "Available" : "Not stated"}
                </dd>
              </div>
              {business.paymentMethods.length > 0 ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Payment</dt>
                  <dd className="text-right text-ink-800">{business.paymentMethods.join(", ")}</dd>
                </div>
              ) : null}
              {business.languages.length > 0 ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Languages</dt>
                  <dd className="text-right text-ink-800">{business.languages.join(", ")}</dd>
                </div>
              ) : null}
            </dl>
            {mapQuery ? (
              <a href={mapQuery} target="_blank" rel="noreferrer" className="btn-secondary btn-sm w-full">
                View on map
              </a>
            ) : null}
            {website ? (
              <a href={website} target="_blank" rel="noreferrer nofollow" className="btn-secondary btn-sm w-full">
                Visit website
              </a>
            ) : null}
          </div>

          {location || business.accessibilityNotes ? (
            <div className="card space-y-2 p-5 text-sm">
              <h2 className="text-sm font-semibold text-ink-900">Location</h2>
              {location?.landmark ? <p className="text-ink-600">Landmark: {location.landmark}</p> : null}
              {business.accessibilityNotes ? (
                <p className="text-ink-600">Accessibility: {business.accessibilityNotes}</p>
              ) : null}
            </div>
          ) : null}

          {business.logisticsProfile ? (
            <div className="card space-y-2 p-5">
              <h2 className="text-sm font-semibold text-ink-900">Logistics services</h2>
              <p className="text-sm text-ink-600">
                This business also offers delivery and transport services.
              </p>
              <Link href={`/logistics/${business.slug}`} className="btn-secondary btn-sm w-full">
                View logistics profile
              </Link>
            </div>
          ) : null}

          <div className="card space-y-3 p-5">
            <h2 className="text-sm font-semibold text-ink-900">Own this business?</h2>
            <ClaimForm businessId={business.id} path={path} isAuthenticated={Boolean(user)} />
          </div>

          <div className="card p-5 text-xs text-ink-500">
            <p>
              Information is supplied by the business owner. Always confirm details and agree terms
              before paying. Verification labels describe the exact check completed — not payment or
              government approval.
            </p>
          </div>
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="mt-10">
          <h2 className="section-title">Similar businesses</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <BusinessCard key={item.id} business={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
