import Link from "next/link";
import { SearchForm } from "@/components/search-form";
import { SectorCard } from "@/components/sector-card";
import { BusinessCard } from "@/components/business-card";
import {
  getFeaturedBusinesses,
  getFeaturedProviders,
  getPlatformStats,
  getRecentBusinesses,
  getRegionOptions,
  getSectorCards,
  getSectorOptions,
} from "@/lib/services/discovery";
import { humanizeEnum } from "@/lib/format";

export default async function HomePage() {
  const [sectors, sectorOptions, regions, featured, recent, stats, providers] = await Promise.all([
    getSectorCards(),
    getSectorOptions(),
    getRegionOptions(),
    getFeaturedBusinesses(6),
    getRecentBusinesses(6),
    getPlatformStats(),
    getFeaturedProviders(3),
  ]);

  return (
    <div>
      <section className="border-b border-ink-200 bg-gradient-to-b from-brand-50 to-white">
        <div className="container-page py-10 sm:py-14">
          <div className="max-w-2xl">
            <span className="badge-brand">GhanaMarketTrade · Official Directory</span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              Find and buy anything in Ghana
            </h1>
            <p className="mt-3 text-ink-600">
              Search verified Ghanaian businesses by sector, products, services, and location.
              Contact them directly via WhatsApp or phone, and arrange deliveries seamlessly.
            </p>
          </div>
          <div className="mt-6">
            <SearchForm sectors={sectorOptions} regions={regions} />
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Published businesses", value: stats.businesses },
              { label: "Sectors", value: stats.sectors },
              { label: "Regions covered", value: stats.regions },
              { label: "Logistics providers", value: stats.providers },
            ].map((item) => (
              <div key={item.label} className="card px-4 py-3">
                <dt className="text-xs text-ink-500">{item.label}</dt>
                <dd className="text-xl font-bold text-ink-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="container-page py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="section-title">Browse by sector</h2>
            <p className="mt-1 text-sm text-ink-600">
              Start with a sector, then narrow by region and district.
            </p>
          </div>
          <Link href="/sectors" className="link-muted text-sm">
            All sectors →
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sectors.slice(0, 8).map((sector) => (
            <SectorCard key={sector.id} sector={sector} />
          ))}
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="container-page py-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Popular this week</h2>
              <p className="mt-1 text-sm text-ink-600">Featured and most-viewed listings.</p>
            </div>
            <Link href="/search?sort=popular" className="link-muted text-sm">
              See more →
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6 border-y border-ink-200 bg-white">
        <div className="container-page grid gap-6 py-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <span className="badge-gold">Logistics</span>
            <h2 className="mt-3 text-2xl font-bold text-ink-900">
              Need something moved or delivered?
            </h2>
            <p className="mt-2 text-ink-600">
              Compare courier, haulage and transport providers by service type, route and coverage.
              Send one request to the providers you choose and receive quotes.
            </p>
            <p className="mt-2 text-xs text-ink-500">
              The platform shares your request only with the providers you select. Quoting is not a
              confirmed booking — you agree terms directly with the provider.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/logistics" className="btn-primary">
                Find a provider
              </Link>
              <Link href="/logistics/quote" className="btn-secondary">
                Request a quote
              </Link>
            </div>
          </div>
          <div className="grid gap-3">
            {providers.length === 0 ? (
              <div className="card p-4 text-sm text-ink-600">
                No logistics providers yet. Be the first to list your transport or delivery service.
              </div>
            ) : (
              providers.map((provider) => (
                <Link
                  key={provider.id}
                  href={`/logistics/${provider.business.slug}`}
                  className="card card-hover flex items-start gap-3 p-4"
                >
                  <span className="mt-0.5 text-xl" aria-hidden>
                    🚚
                  </span>
                  <span className="flex flex-col">
                    <span className="font-semibold text-ink-900">{provider.business.name}</span>
                    <span className="text-xs text-ink-500">
                      {provider.serviceTypes.slice(0, 3).map(humanizeEnum).join(" · ")}
                      {provider.baseRegion ? ` · ${provider.baseRegion.name}` : ""}
                    </span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {recent.length > 0 ? (
        <section className="container-page py-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Recently added</h2>
              <p className="mt-1 text-sm text-ink-600">New listings from across Ghana.</p>
            </div>
            <Link href="/search?sort=recent" className="link-muted text-sm">
              See more →
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="container-page pb-4">
        <div className="card flex flex-col items-start gap-3 bg-brand-600 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Own a business or run deliveries?</h2>
            <p className="text-sm text-brand-50">
              Create a free listing, add your products or services, and let customers reach you.
            </p>
          </div>
          <Link href="/register" className="btn bg-white text-brand-700 hover:bg-brand-50">
            Get listed free
          </Link>
        </div>
      </section>
    </div>
  );
}
