import type { Metadata } from "next";
import Link from "next/link";
import { listProviders } from "@/lib/services/logistics";
import { getRegionOptions } from "@/lib/services/discovery";
import { VerificationBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { humanizeEnum } from "@/lib/format";
import { CoverageScope, LogisticsServiceType } from "@/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Logistics providers",
  description:
    "Compare courier, parcel, haulage and transport providers across Ghana by service type, route and coverage.",
  alternates: { canonical: "/logistics" },
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LogisticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const filter = {
    serviceType: first(query.serviceType) || undefined,
    coverage: first(query.coverage) || undefined,
    region: first(query.region) || undefined,
    q: first(query.q)?.trim() || undefined,
    page: Number.parseInt(first(query.page) ?? "1", 10) || 1,
    perPage: 12,
  };

  const [result, regions] = await Promise.all([listProviders(filter), getRegionOptions()]);

  return (
    <div className="container-page py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">Logistics &amp; delivery providers</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-600">
          Courier, parcel, haulage, cold chain and transport services across Ghana. Compare
          providers, then send a quote request to the ones you choose.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/logistics/quote" className="btn-primary">
            Request a delivery quote
          </Link>
          <Link href="/dashboard/logistics" className="btn-secondary">
            Offer transport services
          </Link>
        </div>
      </header>

      <form action="/logistics" className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <div>
          <label htmlFor="log-q" className="label">
            Search
          </label>
          <input id="log-q" name="q" defaultValue={filter.q ?? ""} className="input" placeholder="Provider or vehicle" />
        </div>
        <div>
          <label htmlFor="log-service" className="label">
            Service type
          </label>
          <select id="log-service" name="serviceType" defaultValue={filter.serviceType ?? ""} className="select">
            <option value="">All services</option>
            {Object.values(LogisticsServiceType).map((value) => (
              <option key={value} value={value}>
                {humanizeEnum(value)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="log-coverage" className="label">
            Coverage
          </label>
          <select id="log-coverage" name="coverage" defaultValue={filter.coverage ?? ""} className="select">
            <option value="">Any coverage</option>
            {Object.values(CoverageScope).map((value) => (
              <option key={value} value={value}>
                {humanizeEnum(value)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="log-region" className="label">
            Region
          </label>
          <select id="log-region" name="region" defaultValue={filter.region ?? ""} className="select">
            <option value="">All regions</option>
            {regions.map((region) => (
              <option key={region.id} value={region.slug}>
                {region.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="btn-primary">
            Search providers
          </button>
          <Link href="/logistics" className="btn-ghost">
            Reset
          </Link>
        </div>
      </form>

      <p className="mb-3 text-sm text-ink-500">
        {result.total} {result.total === 1 ? "provider" : "providers"}
      </p>

      {result.items.length === 0 ? (
        <EmptyState
          title="No providers matched"
          description="Try a different service type or region. If you run deliveries, list your service for free."
          actionHref="/dashboard/logistics"
          actionLabel="List your logistics service"
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((provider) => (
              <Link
                key={provider.id}
                href={`/logistics/${provider.business.slug}`}
                className="card card-hover flex h-full flex-col gap-3 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-ink-900">{provider.business.name}</h2>
                  <span className="text-xl" aria-hidden>
                    🚚
                  </span>
                </div>
                <p className="text-sm text-ink-600">{provider.business.description}</p>
                <div className="mt-auto flex flex-wrap gap-1.5">
                  {provider.serviceTypes.slice(0, 3).map((service) => (
                    <span key={service} className="badge-neutral">
                      {humanizeEnum(service)}
                    </span>
                  ))}
                  {provider.baseRegion ? (
                    <span className="badge-neutral">📍 {provider.baseRegion.name}</span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between">
                  {provider.business.verificationLevel !== "UNVERIFIED" ? (
                    <VerificationBadge level={provider.business.verificationLevel} compact />
                  ) : (
                    <span />
                  )}
                  <span className="text-xs text-ink-500">{provider._count.responses} quotes</span>
                </div>
              </Link>
            ))}
          </div>
          <Pagination
            pathname="/logistics"
            params={{
              q: filter.q,
              serviceType: filter.serviceType,
              coverage: filter.coverage,
              region: filter.region,
            }}
            page={result.page}
            totalPages={result.totalPages}
          />
        </>
      )}
    </div>
  );
}
