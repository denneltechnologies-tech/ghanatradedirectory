 
import Link from "next/link";
import { initials, truncate } from "@/lib/format";
import { mediaUrl } from "@/lib/storage";
import { VerificationBadge } from "@/components/badges";
import type { BusinessCard as BusinessCardType } from "@/lib/search";

export function BusinessCard({ business }: { business: BusinessCardType }) {
  const cover = mediaUrl(business.coverKey) ?? mediaUrl(business.logoKey);
  const location = business.locations[0];
  const place = [location?.locality, location?.district?.name, location?.region?.name]
    .filter(Boolean)
    .join(", ");

  return (
    <Link
      href={`/businesses/${business.slug}`}
      className="card card-hover flex h-full flex-col overflow-hidden"
    >
      <div className="relative h-36 w-full bg-brand-50">
        {cover ? (
          <img
            src={cover}
            alt={`${business.name} cover`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-100 to-gold-100 text-2xl font-bold text-brand-700">
            {initials(business.name)}
          </div>
        )}
        {business.featured ? (
          <span className="badge-gold absolute top-2 left-2 shadow">Featured</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-ink-900">{business.name}</h3>
          {business.deliveryOffered ? (
            <span className="badge-neutral shrink-0" title="Offers delivery">
              🚚
            </span>
          ) : null}
        </div>
        {place ? <p className="text-xs text-ink-500">📍 {place}</p> : null}
        <p className="text-sm text-ink-600">{truncate(business.description, 110)}</p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <span className="badge-neutral">{business.category?.name}</span>
          {business.verificationLevel !== "UNVERIFIED" ? (
            <VerificationBadge level={business.verificationLevel} compact />
          ) : null}
          <span className="ml-auto flex items-center gap-3 text-xs text-ink-500">
            <span aria-label={`${business._count.likes} likes`}>❤ {business._count.likes}</span>
            <span aria-label={`${business._count.offerings} offerings`}>
              🛒 {business._count.offerings}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
