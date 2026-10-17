import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOffering } from "@/lib/services/offerings";
import { getPublicBusiness } from "@/lib/services/businesses";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney, humanizeEnum, safeHttpUrl, truncate } from "@/lib/format";
import { mediaUrl } from "@/lib/storage";
import { ContactActions } from "@/components/contact-actions";
import { ShareButton } from "@/components/share-button";
import { ReportDialog } from "@/components/report-dialog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; offeringId: string }>;
}): Promise<Metadata> {
  const { slug, offeringId } = await params;
  const offering = await getOffering(offeringId);
  if (!offering || offering.business.slug !== slug || offering.business.status !== "PUBLISHED") {
    return { title: "Offering not found" };
  }
  const price = formatMoney(offering.priceAmount, offering.currency);
  return {
    title: `${offering.title} · ${offering.business.name}`,
    description: truncate(
      offering.description ?? `${offering.title} from ${offering.business.name}${price ? ` — ${price}` : ""}`,
      155,
    ),
    alternates: { canonical: `/businesses/${slug}/offerings/${offeringId}` },
  };
}

export default async function OfferingPage({
  params,
}: {
  params: Promise<{ slug: string; offeringId: string }>;
}) {
  const { slug, offeringId } = await params;
  const [offering, user] = await Promise.all([getOffering(offeringId), getCurrentUser()]);

  if (
    !offering ||
    offering.business.slug !== slug ||
    offering.business.status !== "PUBLISHED" ||
    offering.business.deletedAt ||
    offering.deletedAt ||
    offering.status !== "ACTIVE"
  ) {
    notFound();
  }

  const business = await getPublicBusiness(slug);
  const price = formatMoney(offering.priceAmount, offering.currency);
  const images = offering.media.map((item) => mediaUrl(item.storageKey)).filter(Boolean) as string[];
  const path = `/businesses/${slug}/offerings/${offeringId}`;
  const orderUrl = safeHttpUrl(offering.actionUrl);

  return (
    <div className="container-page py-8">
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-ink-500">
        <Link href={`/businesses/${slug}`} className="link-muted">
          {offering.business.name}
        </Link>
        <span>/</span>
        <span className="text-ink-700">{offering.title}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <div className="card overflow-hidden">
            <div className="h-64 w-full bg-ink-100 sm:h-80">
              {images[0] ? (
                 
                <img src={images[0]} alt={offering.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl" aria-hidden>
                  {offering.type === "SERVICE" ? "🛠️" : "📦"}
                </div>
              )}
            </div>
          </div>

          {images.length > 1 ? (
            <div className="grid grid-cols-4 gap-2">
              {images.slice(1).map((src, index) => (
                 
                <img
                  key={`${src}-${index}`}
                  src={src}
                  alt={`${offering.title} photo ${index + 2}`}
                  loading="lazy"
                  className="h-20 w-full rounded-lg object-cover"
                />
              ))}
            </div>
          ) : null}

          <section className="card p-5">
            <h1 className="text-2xl font-bold text-ink-900">{offering.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="badge-neutral">{humanizeEnum(offering.type)}</span>
              {offering.availability ? <span className="badge-brand">{offering.availability}</span> : null}
            </div>
            {offering.description ? (
              <p className="mt-4 text-sm whitespace-pre-line text-ink-700">{offering.description}</p>
            ) : null}
            {offering.deliveryNote ? (
              <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600">
                🚚 {offering.deliveryNote}
              </p>
            ) : null}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card space-y-3 p-5">
            <p className="text-2xl font-bold text-ink-900">
              {price ?? offering.priceLabel ?? "Price on request"}
            </p>
            {offering.priceLabel && price ? (
              <p className="text-sm text-ink-500">{offering.priceLabel}</p>
            ) : null}
            <p className="text-sm text-ink-600">
              Supplied by{" "}
              <Link href={`/businesses/${slug}`} className="font-medium text-brand-700 hover:underline">
                {offering.business.name}
              </Link>
            </p>
            <ContactActions
              business={offering.business}
              offeringId={offering.id}
              orderUrl={orderUrl}
            />
            <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-3">
              <ShareButton title={`${offering.title} · ${offering.business.name}`} path={path} />
              <ReportDialog
                targetType="OFFERING"
                targetId={offering.id}
                businessId={offering.business.id}
                path={path}
                label="Report"
              />
            </div>
          </div>

          {business && business.offerings.length > 1 ? (
            <div className="card space-y-2 p-5">
              <h2 className="text-sm font-semibold text-ink-900">More from {business.name}</h2>
              <ul className="space-y-2 text-sm">
                {business.offerings
                  .filter((item) => item.id !== offering.id)
                  .slice(0, 5)
                  .map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/businesses/${slug}/offerings/${item.id}`}
                        className="link-muted block truncate"
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          <p className="px-1 text-xs text-ink-500">
            Prices are set by the business and shown in Ghana cedi (GHS) where provided. Confirm
            details before paying. {user ? "" : ""}
          </p>
        </aside>
      </div>
    </div>
  );
}
