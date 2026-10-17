import { prisma } from "@/lib/db";
import { businessCardInclude, type BusinessCard } from "@/lib/search";

export type SectorCard = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  businessCount: number;
  children: { id: string; name: string; slug: string; icon: string | null }[];
};

export async function getSectorCards(onlyFeatured = false): Promise<SectorCard[]> {
  const [categories, counts] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null, active: true, ...(onlyFeatured ? { featured: true } : {}) },
      include: {
        children: {
          where: { active: true },
          select: { id: true, name: true, slug: true, icon: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.business.groupBy({
      by: ["categoryId"],
      where: { status: "PUBLISHED", deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const countByCategory = new Map(counts.map((row) => [row.categoryId, row._count._all]));

  return categories.map((category) => {
    const own = countByCategory.get(category.id) ?? 0;
    const childTotal = category.children.reduce(
      (total, child) => total + (countByCategory.get(child.id) ?? 0),
      0,
    );
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      description: category.description,
      businessCount: own + childTotal,
      children: category.children,
    };
  });
}

export async function getFeaturedBusinesses(limit = 6): Promise<BusinessCard[]> {
  return prisma.business.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    include: businessCardInclude,
    orderBy: [{ featured: "desc" }, { viewCount: "desc" }, { publishedAt: "desc" }],
    take: limit,
  });
}

export async function getRecentBusinesses(limit = 6): Promise<BusinessCard[]> {
  return prisma.business.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    include: businessCardInclude,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

export type RegionOption = {
  id: string;
  name: string;
  slug: string;
  districts: { id: string; name: string; slug: string }[];
};

export async function getRegionOptions(): Promise<RegionOption[]> {
  return prisma.region.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      districts: {
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getSectorOptions() {
  return prisma.category.findMany({
    where: { active: true, parentId: null },
    select: { id: true, name: true, slug: true, icon: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getPlatformStats() {
  const [businesses, sectors, regions, providers] = await Promise.all([
    prisma.business.count({ where: { status: "PUBLISHED", deletedAt: null } }),
    prisma.category.count({ where: { active: true, parentId: null } }),
    prisma.region.count(),
    prisma.logisticsProfile.count({ where: { active: true } }),
  ]);
  return { businesses, sectors, regions, providers };
}

export async function getFeaturedProviders(limit = 3) {
  return prisma.logisticsProfile.findMany({
    where: { active: true, business: { status: "PUBLISHED", deletedAt: null } },
    include: {
      business: { select: { name: true, slug: true, description: true, verificationLevel: true } },
      baseRegion: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
