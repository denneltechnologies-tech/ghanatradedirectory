import type { NextRequest } from "next/server";
import { apiUser, ok, pagination, withApi } from "@/lib/api";
import { parseSearchInput, searchBusinesses } from "@/lib/search";
import { trackEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request: NextRequest) => {
  const url = new URL(request.url);
  const input = parseSearchInput(url.searchParams);
  const paging = pagination(url, input.perPage ?? 12);

  const result = await searchBusinesses({ ...input, page: paging.page, perPage: paging.perPage });
  const user = await apiUser();

  if (input.q) {
    await trackEvent({
      type: result.total === 0 ? "NO_RESULT_SEARCH" : "SEARCH",
      query: input.q,
      sectorSlug: input.sector ?? null,
      regionSlug: input.region ?? null,
      userId: user?.id ?? null,
      metadata: { resultCount: result.total },
    });
  }

  return ok({
    data: result.items.map((business) => ({
      id: business.id,
      slug: business.slug,
      name: business.name,
      description: business.description,
      category: business.category
        ? {
            id: business.category.id,
            name: business.category.name,
            slug: business.category.slug,
            icon: business.category.icon,
          }
        : null,
      location: business.locations[0]
        ? {
            locality: business.locations[0].locality,
            address: business.locations[0].address,
            region: business.locations[0].region,
            district: business.locations[0].district,
          }
        : null,
      deliveryOffered: business.deliveryOffered,
      featured: business.featured,
      verificationLevel: business.verificationLevel,
      viewCount: business.viewCount,
      counts: business._count,
      publishedAt: business.publishedAt,
      url: `/businesses/${business.slug}`,
    })),
    meta: {
      page: result.page,
      perPage: result.perPage,
      total: result.total,
      totalPages: result.totalPages,
    },
  });
});
