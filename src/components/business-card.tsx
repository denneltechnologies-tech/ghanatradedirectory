import Link from "next/link";
import { initials, truncate } from "@/lib/format";
import { VerificationBadge } from "@/components/badges";
import type { BusinessCard as BusinessCardType } from "@/lib/search";
import { getBusinessCover, getBusinessLogo } from "@/lib/sector-media";

export function BusinessCard({ business }: { business: BusinessCardType }) {
  const cover = getBusinessCover(business);
  const logo = getBusinessLogo(business);
  const location = business.locations[0];
  const place = [location?.locality, location?.district?.name, location?.region?.name]
    .filter(Boolean)
    .join(", ");

  return (
    <Link
      href={`/businesses/${business.slug}`}
      className="card card-hover group flex h-full flex-col overflow-hidden"
    >
      <div className="relative h-40 w-full overflow-hidden bg-ink-100">
        <img
          src={cover}
          alt={`${business.name} cover`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Brand logo avatar badge */}
        <div className="absolute bottom-2.5 left-2.5 flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border-2 border-white bg-white shadow-md">
          {logo ? (
            <img
              src={logo}
              alt={`${business.name} logo`}
              className="h-full w-full object-contain p-1"
              loading="lazy"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-brand-700 text-xs font-bold text-white">
              {initials(business.name)}
            </span>
          )}
        </div>
        {business.featured ? (
          <span className="badge-gold absolute top-2.5 right-2.5 shadow-sm">Featured</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-ink-900 group-hover:text-brand-700 transition-colors">
            {business.name}
          </h3>
          {business.deliveryOffered ? (
            <span className="badge-neutral shrink-0" title="Offers delivery">
              🚚
            </span>
          ) : null}
        </div>
        {place ? <p className="text-xs text-ink-500">📍 {place}</p> : null}
        <p className="text-sm text-ink-600 line-clamp-2">{truncate(business.description, 110)}</p>
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
