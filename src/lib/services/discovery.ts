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

export type RegionOption = {
  id: string;
  name: string;
  slug: string;
  districts: { id: string; name: string; slug: string }[];
};

const FALLBACK_SECTORS: SectorCard[] = [
  { id: "s-1", name: "Agriculture & Agri-business", slug: "agriculture-agri-business", icon: "🌾", description: "Agro-processing, farming, inputs", businessCount: 0, children: [] },
  { id: "s-2", name: "Food & Beverages", slug: "food-beverages", icon: "🍲", description: "Restaurants, eateries, catering", businessCount: 0, children: [] },
  { id: "s-3", name: "Construction & Building Materials", slug: "construction-building-materials", icon: "🏗️", description: "Contractors, materials, hardware", businessCount: 0, children: [] },
  { id: "s-4", name: "Fashion & Beauty", slug: "fashion-beauty", icon: "👗", description: "Tailoring, cosmetics, salons", businessCount: 0, children: [] },
  { id: "s-5", name: "Health & Wellness", slug: "health-wellness", icon: "🩺", description: "Pharmacies, clinics, wellness", businessCount: 0, children: [] },
  { id: "s-6", name: "Banking & Financial Services", slug: "banking-financial-services", icon: "🏦", description: "Banks, insurance, fintech, investments", businessCount: 0, children: [] },
  { id: "s-7", name: "Hospitality & Tourism", slug: "hospitality-tourism", icon: "🏨", description: "Hotels, tours, travel agencies", businessCount: 0, children: [] },
  { id: "s-8", name: "Transport & Logistics", slug: "transport-logistics", icon: "🚚", description: "Haulage, freight, courier", businessCount: 0, children: [] },
  { id: "s-9", name: "Technology & IT", slug: "technology-it", icon: "💻", description: "Software, telecoms, internet", businessCount: 0, children: [] },
  { id: "s-10", name: "Manufacturing & Industrial", slug: "manufacturing-industrial", icon: "🏭", description: "Production, packaging, materials", businessCount: 0, children: [] },
];

const FALLBACK_REGIONS: RegionOption[] = [
  { id: "r-1", name: "Greater Accra", slug: "greater-accra", districts: [{ id: "d-1", name: "Accra Metropolitan", slug: "accra-metropolitan" }, { id: "d-2", name: "Tema Metropolitan", slug: "tema-metropolitan" }] },
  { id: "r-2", name: "Ashanti", slug: "ashanti", districts: [{ id: "d-3", name: "Kumasi Metropolitan", slug: "kumasi-metropolitan" }] },
  { id: "r-3", name: "Western", slug: "western", districts: [{ id: "d-4", name: "Sekondi-Takoradi Metropolitan", slug: "sekondi-takoradi-metropolitan" }] },
  { id: "r-4", name: "Central", slug: "central", districts: [{ id: "d-5", name: "Cape Coast Metropolitan", slug: "cape-coast-metropolitan" }] },
  { id: "r-5", name: "Eastern", slug: "eastern", districts: [{ id: "d-6", name: "New Juaben South Municipal", slug: "new-juaben-south-municipal" }] },
  { id: "r-6", name: "Northern", slug: "northern", districts: [{ id: "d-7", name: "Tamale Metropolitan", slug: "tamale-metropolitan" }] },
];

export async function getSectorCards(onlyFeatured = false): Promise<SectorCard[]> {
  try {
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
  } catch (err) {
    console.warn("Database unavailable in getSectorCards, returning fallbacks:", err);
    return FALLBACK_SECTORS;
  }
}

export async function getFeaturedBusinesses(limit = 6): Promise<BusinessCard[]> {
  try {
    return await prisma.business.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      include: businessCardInclude,
      orderBy: [{ featured: "desc" }, { viewCount: "desc" }, { publishedAt: "desc" }],
      take: limit,
    });
  } catch (err) {
    console.warn("Database unavailable in getFeaturedBusinesses:", err);
    return [];
  }
}

export async function getRecentBusinesses(limit = 6): Promise<BusinessCard[]> {
  try {
    return await prisma.business.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      include: businessCardInclude,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
  } catch (err) {
    console.warn("Database unavailable in getRecentBusinesses:", err);
    return [];
  }
}

export async function getRegionOptions(): Promise<RegionOption[]> {
  try {
    return await prisma.region.findMany({
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
  } catch (err) {
    console.warn("Database unavailable in getRegionOptions, returning fallbacks:", err);
    return FALLBACK_REGIONS;
  }
}

export async function getSectorOptions() {
  try {
    return await prisma.category.findMany({
      where: { active: true, parentId: null },
      select: { id: true, name: true, slug: true, icon: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  } catch (err) {
    console.warn("Database unavailable in getSectorOptions, returning fallbacks:", err);
    return FALLBACK_SECTORS.map((s) => ({ id: s.id, name: s.name, slug: s.slug, icon: s.icon }));
  }
}

export async function getPlatformStats() {
  try {
    const [businesses, sectors, regions, providers] = await Promise.all([
      prisma.business.count({ where: { status: "PUBLISHED", deletedAt: null } }),
      prisma.category.count({ where: { active: true, parentId: null } }),
      prisma.region.count(),
      prisma.logisticsProfile.count({ where: { active: true } }),
    ]);
    return { businesses, sectors, regions, providers };
  } catch (err) {
    console.warn("Database unavailable in getPlatformStats, returning fallbacks:", err);
    return { businesses: 0, sectors: 10, regions: 16, providers: 0 };
  }
}

export async function getFeaturedProviders(limit = 3) {
  try {
    return await prisma.logisticsProfile.findMany({
      where: { active: true, business: { status: "PUBLISHED", deletedAt: null } },
      include: {
        business: { select: { name: true, slug: true, description: true, verificationLevel: true } },
        baseRegion: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch (err) {
    console.warn("Database unavailable in getFeaturedProviders:", err);
    return [];
  }
}
