import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type BusinessSearchInput = {
  q?: string;
  sector?: string;
  subcategory?: string;
  region?: string;
  district?: string;
  town?: string;
  type?: string;
  delivery?: boolean;
  featured?: boolean;
  sort?: string;
  page?: number;
  perPage?: number;
};

export const businessCardInclude = {
  category: { select: { id: true, name: true, slug: true, icon: true, parentId: true } },
  locations: {
    select: {
      locality: true,
      address: true,
      landmark: true,
      region: { select: { name: true, slug: true } },
      district: { select: { name: true, slug: true } },
    },
    take: 1,
  },
  _count: { select: { likes: true, comments: true, offerings: true } },
} satisfies Prisma.BusinessInclude;

export type BusinessCard = Prisma.BusinessGetPayload<{
  include: typeof businessCardInclude;
}>;

export function parseSearchInput(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): BusinessSearchInput {
  const get = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) {
      const value = params.get(key);
      return value ?? undefined;
    }
    const value = params[key];
    if (Array.isArray(value)) return value[0];
    return value;
  };

  return {
    q: get("q")?.trim() || undefined,
    sector: get("sector")?.trim() || undefined,
    subcategory: get("subcategory")?.trim() || undefined,
    region: get("region")?.trim() || undefined,
    district: get("district")?.trim() || undefined,
    town: get("town")?.trim() || undefined,
    type: get("type")?.trim() || undefined,
    delivery: get("delivery") === "1" || get("delivery") === "true" || undefined,
    featured: get("featured") === "1" || undefined,
    sort: get("sort")?.trim() || undefined,
    page: Number.parseInt(get("page") ?? "1", 10) || 1,
    perPage: Number.parseInt(get("perPage") ?? "12", 10) || 12,
  };
}

export function buildBusinessWhere(input: BusinessSearchInput): Prisma.BusinessWhereInput {
  const where: Prisma.BusinessWhereInput = {
    status: "PUBLISHED",
    deletedAt: null,
  };

  if (input.q) {
    const q = input.q;
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { longDescription: { contains: q, mode: "insensitive" } },
      { tags: { has: q } },
      { tags: { hasSome: [q, q.toLowerCase()] } },
      {
        offerings: {
          some: {
            status: "ACTIVE",
            deletedAt: null,
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }

  if (input.subcategory) {
    where.category = { slug: input.subcategory };
  } else if (input.sector) {
    where.category = { OR: [{ slug: input.sector }, { parent: { slug: input.sector } }] };
  }

  if (input.region || input.district || input.town) {
    where.locations = {
      some: {
        isPublic: true,
        ...(input.region ? { region: { slug: input.region } } : {}),
        ...(input.district ? { district: { slug: input.district } } : {}),
        ...(input.town ? { locality: { contains: input.town, mode: "insensitive" } } : {}),
      },
    };
  }

  if (input.type === "product" || input.type === "service") {
    where.offerings = {
      some: {
        status: "ACTIVE",
        deletedAt: null,
        type: input.type === "product" ? "PRODUCT" : "SERVICE",
      },
    };
  }

  if (input.delivery) where.deliveryOffered = true;
  if (input.featured) where.featured = true;

  return where;
}

export function businessOrderBy(sort?: string): Prisma.BusinessOrderByWithRelationInput[] {
  switch (sort) {
    case "recent":
      return [{ publishedAt: "desc" }, { updatedAt: "desc" }];
    case "name":
      return [{ name: "asc" }];
    case "popular":
      return [{ viewCount: "desc" }, { featured: "desc" }];
    default:
      return [{ featured: "desc" }, { publishedAt: "desc" }, { updatedAt: "desc" }];
  }
}

export async function searchBusinesses(input: BusinessSearchInput) {
  const page = Math.max(1, input.page ?? 1);
  const perPage = Math.min(48, Math.max(1, input.perPage ?? 12));
  const where = buildBusinessWhere(input);

  const [items, total] = await Promise.all([
    prisma.business.findMany({
      where,
      include: businessCardInclude,
      orderBy: businessOrderBy(input.sort),
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.business.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export function buildQueryString(
  input: BusinessSearchInput,
  overrides: Record<string, string | number | undefined> = {},
): string {
  const params = new URLSearchParams();
  const merged: Record<string, string | number | boolean | undefined> = {
    q: input.q,
    sector: input.sector,
    subcategory: input.subcategory,
    region: input.region,
    district: input.district,
    town: input.town,
    type: input.type,
    delivery: input.delivery ? "1" : undefined,
    featured: input.featured ? "1" : undefined,
    sort: input.sort,
    page: input.page && input.page > 1 ? input.page : undefined,
    ...overrides,
  };
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
