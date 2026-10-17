import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicProvider } from "@/lib/services/logistics";
import { VerificationBadge } from "@/components/badges";
import { ContactActions } from "@/components/contact-actions";
import { ReportDialog } from "@/components/report-dialog";
import { getCurrentUser } from "@/lib/auth";
import { humanizeEnum, initials, toNumber, truncate } from "@/lib/format";
import { mediaUrl } from "@/lib/storage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getPublicProvider(slug);
  if (!provider) return { title: "Provider not found" };
  return {
    title: `${provider.business.name} — logistics & delivery`,
    description: truncate(provider.description, 155),
    alternates: { canonical: `/logistics/${provider.business.slug}` },
  };
}

export default async function ProviderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [provider, user] = await Promise.all([getPublicProvider(slug), getCurrentUser()]);
  if (!provider) notFound();

  const business = provider.business;
  const logo = mediaUrl(business.logoKey);
  const cover = mediaUrl(business.coverKey);
  const path = `/logistics/${business.slug}`;
  const minKg = toNumber(provider.capacityMinKg);
  const maxKg = toNumber(provider.capacityMaxKg);
  const capacity =
    minKg != null || maxKg != null
      ? `${minKg != null ? minKg.toLocaleString("en-GH") : "?"} – ${
          maxKg != null ? maxKg.toLocaleString("en-GH") : "?"
        } kg`
      : null;

  return (
    <div className="container-page py-6">
      <div className="relative mb-4 h-40 w-full overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 to-gold-100 sm:h-52">
        {cover ? (
           
          <img src={cover} alt={`${business.name} cover`} className="h-full w-full object-cover" />
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <header className="card p-5">
            <div className="flex flex-wrap items-start gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-600 text-lg font-bold text-white">
                {logo ? (
                   
                  <img src={logo} alt={`${business.name} logo`} className="h-full w-full object-cover" />
                ) : (
                  initials(business.name)
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-ink-900">{business.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="badge-gold">Logistics provider</span>
                  <VerificationBadge level={provider.verifiedLevel} />
                  {provider.baseRegion ? (
                    <span className="badge-neutral">📍 Based in {provider.baseRegion.name}</span>
                  ) : null}
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm whitespace-pre-line text-ink-700">{provider.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/logistics/quote?provider=${provider.id}`} className="btn-primary">
                Request a quote
              </Link>
              <Link href={`/businesses/${business.slug}`} className="btn-secondary">
                View business profile
              </Link>
              <ReportDialog
                targetType="LOGISTICS_PROVIDER"
                targetId={business.id}
                businessId={business.id}
                path={path}
                label="Report"
              />
            </div>
          </header>

          <section className="card p-5">
            <h2 className="section-title">Services &amp; coverage</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="label">Service types</p>
                <div className="flex flex-wrap gap-1.5">
                  {provider.serviceTypes.map((service) => (
                    <span key={service} className="badge-neutral">
                      {humanizeEnum(service)}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="label">Coverage</p>
                <div className="flex flex-wrap gap-1.5">
                  {provider.coverage.map((scope) => (
                    <span key={scope} className="badge-brand">
                      {humanizeEnum(scope)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <dl className="mt-5 grid gap-3 border-t border-ink-100 pt-4 text-sm sm:grid-cols-2">
              {provider.namedRoutes.length > 0 ? (
                <div>
                  <dt className="text-ink-500">Named routes</dt>
                  <dd className="text-ink-800">{provider.namedRoutes.join(", ")}</dd>
                </div>
              ) : null}
              {provider.vehicleTypes.length > 0 ? (
                <div>
                  <dt className="text-ink-500">Vehicle types</dt>
                  <dd className="text-ink-800">{provider.vehicleTypes.join(", ")}</dd>
                </div>
              ) : null}
              {capacity ? (
                <div>
                  <dt className="text-ink-500">Load capacity</dt>
                  <dd className="text-ink-800">{capacity}</dd>
                </div>
              ) : null}
              {provider.operatingHours ? (
                <div>
                  <dt className="text-ink-500">Operating hours</dt>
                  <dd className="text-ink-800">{provider.operatingHours}</dd>
                </div>
              ) : null}
              {provider.trackingMethod ? (
                <div>
                  <dt className="text-ink-500">Tracking</dt>
                  <dd className="text-ink-800">{provider.trackingMethod}</dd>
                </div>
              ) : null}
              {provider.insurancePolicy ? (
                <div>
                  <dt className="text-ink-500">Insurance</dt>
                  <dd className="text-ink-800">{provider.insurancePolicy}</dd>
                </div>
              ) : null}
              {provider.responseHours ? (
                <div>
                  <dt className="text-ink-500">Typical response</dt>
                  <dd className="text-ink-800">within {provider.responseHours} hours</dd>
                </div>
              ) : null}
              {provider.contactChannel ? (
                <div>
                  <dt className="text-ink-500">Preferred contact</dt>
                  <dd className="text-ink-800">{humanizeEnum(provider.contactChannel)}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          {provider.serviceAreas.length > 0 ? (
            <section className="card p-5">
              <h2 className="section-title">Service areas</h2>
              <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {provider.serviceAreas.map((area) => (
                  <li key={area.id} className="flex items-center justify-between gap-2">
                    <span className="text-ink-700">
                      {[area.district?.name, area.region?.name].filter(Boolean).join(", ") || "Ghana"}
                    </span>
                    <span className="badge-neutral">{humanizeEnum(area.scope)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card space-y-3 p-5">
            <h2 className="text-sm font-semibold text-ink-900">Contact provider</h2>
            <ContactActions business={business} />
          </div>
          <div className="card p-5 text-xs text-ink-500">
            <p>
              Requests are shared only with the providers you select. A quote is not a confirmed
              booking — agree final price and terms directly with the provider.
              {user ? "" : " Sign in to send a quote request."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
