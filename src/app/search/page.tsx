import type { Metadata } from "next";
import { BusinessCard } from "@/components/business-card";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { SearchFilters } from "@/components/search-filters";
import { SearchForm } from "@/components/search-form";
import { buildQueryString, parseSearchInput, searchBusinesses } from "@/lib/search";
import { getRegionOptions, getSectorOptions } from "@/lib/services/discovery";
import { trackEvent } from "@/lib/analytics";

const SORT_LABEL: Record<string, string> = {
  recent: "recently added",
  popular: "most viewed",
  name: "name",
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const input = parseSearchInput(params);
  const title = input.q ? `“${input.q}” businesses` : "Browse businesses";
  return {
    title,
    description: "Search Ghanaian businesses by sector, region, district and what they offer.",
    alternates: { canonical: `/search${buildQueryString(input)}` },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const input = parseSearchInput(params);

  const [results, sectorOptions, regionOptions] = await Promise.all([
    searchBusinesses(input),
    getSectorOptions(),
    getRegionOptions(),
  ]);

  await trackEvent({
    type: results.total === 0 ? "NO_RESULT_SEARCH" : "SEARCH",
    query: input.q ?? null,
    sectorSlug: input.sector ?? input.subcategory ?? null,
    regionSlug: input.region ?? null,
    metadata: { total: results.total, page: results.page },
  });

  const label = input.q ? `“${input.q}”` : input.sector ? input.sector.replace(/-/g, " ") : "all businesses";

  return (
    <div className="container-page py-8">
      <div className="mb-5">
        <SearchForm
          variant="inline"
          defaultQuery={input.q ?? ""}
          sectors={sectorOptions}
          regions={regionOptions}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <SearchFilters sectors={sectorOptions} regions={regionOptions} values={input} />
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-ink-900">Results for {label}</h1>
              <p className="text-sm text-ink-500">
                {results.total} {results.total === 1 ? "business" : "businesses"}
                {input.sort && SORT_LABEL[input.sort] ? ` · sorted by ${SORT_LABEL[input.sort]}` : ""}
                {input.delivery ? " · offers delivery" : ""}
              </p>
            </div>
          </div>

          {results.items.length === 0 ? (
            <EmptyState
              title="No businesses matched your search"
              description="Try removing a filter, widening the region, or using fewer keywords."
              actionHref="/search"
              actionLabel="Reset filters"
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {results.items.map((business) => (
                  <BusinessCard key={business.id} business={business} />
                ))}
              </div>
              <Pagination
                pathname="/search"
                params={{
                  q: input.q,
                  sector: input.sector,
                  subcategory: input.subcategory,
                  region: input.region,
                  district: input.district,
                  town: input.town,
                  type: input.type,
                  delivery: input.delivery ? "1" : undefined,
                  sort: input.sort,
                }}
                page={results.page}
                totalPages={results.totalPages}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
