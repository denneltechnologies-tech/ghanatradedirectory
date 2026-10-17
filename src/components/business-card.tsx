import Link from "next/link";
import { initials, truncate } from "@/lib/format";
import { VerificationBadge } from "@/components/badges";
import type { BusinessCard as BusinessCardType } from "@/lib/search";
import { getBusinessLogo } from "@/lib/sector-media";

export function BusinessCard({ business }: { business: BusinessCardType }) {
  const logo = getBusinessLogo(business);
  const location = business.locations[0];
  const place = [location?.locality, location?.district?.name, location?.region?.name]
    .filter(Boolean)
    .join(", ");

  return (
    <Link
      href={`/businesses/${business.slug}`}
      className="card card-hover group flex h-full flex-col overflow-hidden bg-white"
    >
      <div className="relative flex h-44 w-full items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-white border-b border-ink-100 p-6">
        {logo ? (
          <img
            src={logo}
            alt={`${business.name} logo`}
            loading="lazy"
            className="max-h-28 max-w-[85%] object-contain drop-shadow-xs transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 text-2xl font-bold border border-brand-100 shadow-xs">
              {initials(business.name)}
            </span>
            <span className="text-xs font-medium text-ink-500">{business.category?.name}</span>
          </div>
        )}
        {business.featured ? (
          <span className="badge-gold absolute top-2.5 right-2.5 shadow-xs">Featured</span>
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
