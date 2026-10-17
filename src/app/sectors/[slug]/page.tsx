import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BusinessCard } from "@/components/business-card";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { parseSearchInput, searchBusinesses } from "@/lib/search";
import { getRegionOptions } from "@/lib/services/discovery";

async function getSector(slug: string) {
  return prisma.category.findFirst({
    where: { slug, active: true },
    include: {
      parent: { select: { name: true, slug: true } },
      children: {
        where: { active: true },
        select: { id: true, name: true, slug: true, icon: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sector = await getSector(slug);
  if (!sector) return { title: "Sector not found" };
  return {
    title: sector.name,
    description:
      sector.description ??
      `Businesses in the ${sector.name} sector across Ghana. Find contact details, products and services.`,
    alternates: { canonical: `/sectors/${sector.slug}` },
  };
}

export default async function SectorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sector = await getSector(slug);
  if (!sector) notFound();

  const query = await searchParams;
  const input = parseSearchInput({ ...query, sector: sector.slug });
  if (query.subcategory === sector.slug) delete input.subcategory;

  const [results, regionOptions] = await Promise.all([
    searchBusinesses(input),
    getRegionOptions(),
  ]);

  return (
    <div className="container-page py-8">
      <nav className="mb-3 flex items-center gap-1 text-xs text-ink-500">
        <Link href="/sectors" className="link-muted">
          Sectors
        </Link>
        {sector.parent ? (
          <>
            <span>/</span>
            <Link href={`/sectors/${sector.parent.slug}`} className="link-muted">
              {sector.parent.name}
            </Link>
          </>
        ) : null}
        <span>/</span>
        <span className="text-ink-700">{sector.name}</span>
      </nav>

      <header className="mb-5 flex items-start gap-3">
        <span className="text-3xl" aria-hidden>
          {sector.icon ?? "🏷️"}
        </span>
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{sector.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-600">
            {sector.description ??
              `Find ${sector.name.toLowerCase()} businesses across Ghana with contact details and what they offer.`}
          </p>
        </div>
      </header>

      {sector.children.length > 0 ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {sector.children.map((child) => (
            <Link
              key={child.id}
              href={`/search?subcategory=${child.slug}`}
              className="badge-neutral hover:bg-brand-50 hover:text-brand-700"
            >
              {child.icon ? `${child.icon} ` : ""}
              {child.name}
            </Link>
          ))}
        </div>
      ) : null}

      <form action={`/sectors/${sector.slug}`} className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="sector-region" className="label">
            Filter by region
          </label>
          <select id="sector-region" name="region" defaultValue={input.region ?? ""} className="select">
            <option value="">All regions</option>
            {regionOptions.map((option) => (
              <option key={option.id} value={option.slug}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px] flex-1">
          <label htmlFor="sector-town" className="label">
            Town / area
          </label>
          <input
            id="sector-town"
            name="town"
            defaultValue={input.town ?? ""}
            className="input"
            placeholder="e.g. Kumasi"
          />
        </div>
        <button type="submit" className="btn-primary">
          Filter
        </button>
        {input.region || input.town ? (
          <Link href={`/sectors/${sector.slug}`} className="btn-ghost">
            Clear
          </Link>
        ) : null}
      </form>

      <p className="mb-3 text-sm text-ink-500">
        {results.total} {results.total === 1 ? "business" : "businesses"}
      </p>

      {results.items.length === 0 ? (
        <EmptyState
          title={`No ${sector.name.toLowerCase()} businesses found`}
          description="Try a wider region, or browse all sectors."
          actionHref="/search"
          actionLabel="Search all businesses"
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.items.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
          <Pagination
            pathname={`/sectors/${sector.slug}`}
            params={{ region: input.region, town: input.town }}
            page={results.page}
            totalPages={results.totalPages}
          />
        </>
      )}
    </div>
  );
}
