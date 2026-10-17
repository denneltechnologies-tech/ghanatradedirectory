import Link from "next/link";
import { formatMoney, humanizeEnum, truncate, whatsappHref, telHref } from "@/lib/format";
import { mediaUrl } from "@/lib/storage";
import { getSectorOfferings } from "@/lib/sector-media";

type OfferingMedia = {
  storageKey: string;
};

type DbOffering = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  priceAmount?: unknown;
  currency?: string;
  priceLabel?: string | null;
  media?: OfferingMedia[];
};

type BusinessOfferingsProps = {
  business: {
    id: string;
    name: string;
    slug: string;
    phone?: string | null;
    whatsapp?: string | null;
    website?: string | null;
    category: {
      name: string;
      slug: string;
      parent?: { name: string; slug: string } | null;
    };
    offerings: DbOffering[];
  };
};

export function BusinessOfferingsSection({ business }: BusinessOfferingsProps) {
  const hasDbOfferings = business.offerings && business.offerings.length > 0;
  const sectorSlug = business.category.parent?.slug ?? business.category.slug;

  const items = hasDbOfferings
    ? business.offerings.map((offering) => {
        const image = mediaUrl(offering.media?.[0]?.storageKey ?? null);
        const price = formatMoney(offering.priceAmount, offering.currency ?? "GHS");
        return {
          id: offering.id,
          title: offering.title,
          type: humanizeEnum(offering.type),
          isService: offering.type === "SERVICE",
          priceLabel: price ?? offering.priceLabel ?? "Inquiry on request",
          description: offering.description ?? "Contact this business directly for specifications, pricing, and scheduling.",
          image,
          icon: offering.type === "SERVICE" ? "🛠️" : "📦",
          isDb: true,
        };
      })
    : getSectorOfferings(sectorSlug, business.name).map((template, idx) => ({
        id: `tpl-${idx}`,
        title: template.title,
        type: template.type === "SERVICE" ? "Service" : "Product",
        isService: template.type === "SERVICE",
        priceLabel: template.priceLabel,
        description: template.description,
        image: null,
        icon: template.icon,
        isDb: false,
      }));

  return (
    <section className="card p-5 sm:p-6" id="products-services">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-base" aria-hidden>
              💼
            </span>
            <h2 className="text-xl font-bold text-ink-900">Products &amp; Services</h2>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            Browse the active commercial solutions, products, and services offered by {business.name}.
          </p>
        </div>
        <span className="badge-neutral text-xs font-medium">
          {items.length} {items.length === 1 ? "Offering" : "Offerings"}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const inquiryMessage = `Hello ${business.name}, I am inquiring about your "${item.title}" (${item.type}) listed on Ghana Trade Directory.`;
          const whatsappUrl = whatsappHref(business.whatsapp || business.phone, inquiryMessage);
          const phoneUrl = telHref(business.phone);

          return (
            <div
              key={item.id}
              className="group flex flex-col justify-between rounded-xl border border-ink-100 bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink-50 border border-ink-100 text-2xl shadow-2xs">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <span aria-hidden>{item.icon}</span>
                    )}
                  </span>
                  <div className="flex flex-wrap items-center justify-end gap-1.5 text-right">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                        item.isService ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      }`}
                    >
                      {item.type}
                    </span>
                    <span className="badge-gold text-xs font-semibold">{item.priceLabel}</span>
                  </div>
                </div>

                <h3 className="mt-3 text-base font-semibold text-ink-900 group-hover:text-brand-700 transition-colors">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs text-ink-600 line-clamp-3 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary btn-sm flex-1 justify-center gap-1.5 text-xs py-1.5"
                    title="Inquire directly on WhatsApp"
                  >
                    <span>💬</span>
                    <span>Inquire / Order</span>
                  </a>
                ) : phoneUrl ? (
                  <a
                    href={phoneUrl}
                    className="btn-secondary btn-sm flex-1 justify-center gap-1.5 text-xs py-1.5"
                    title="Call business directly"
                  >
                    <span>📞</span>
                    <span>Call to Inquire</span>
                  </a>
                ) : (
                  <span className="text-xs text-ink-500 italic">Direct Inquiry Available</span>
                )}

                {item.isDb ? (
                  <Link
                    href={`/businesses/${business.slug}/offerings/${item.id}`}
                    className="btn-secondary btn-sm text-xs py-1.5"
                  >
                    Details →
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
