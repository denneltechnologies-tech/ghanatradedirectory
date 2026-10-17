import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  buildImportContext,
  importRecord,
  type ImportRecord,
  type ImportContext,
} from "../src/lib/import/pipeline";
import { categorySlugForOsm } from "../src/lib/import/categories";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const IMPORT_OWNER_EMAIL = process.env.IMPORT_OWNER_EMAIL ?? "imports@ghanatrade.app";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

export interface SectorQuery {
  name: string;
  slug: string;
  defaultCategorySlug: string;
  osmStatements: string[];
}

export const SECTORS: SectorQuery[] = [
  {
    name: "Agriculture & Agri-business",
    slug: "agriculture-agri-business",
    defaultCategorySlug: "agriculture-agri-business-agro-processing",
    osmStatements: [
      'nwr["name"]["shop"="agrarian"]',
      'nwr["name"]["craft"="agricultural_engines"]',
      'nwr["name"]["landuse"="farmland"]',
      'nwr["name"]["landuse"="plant_nursery"]',
      'nwr["name"]["amenity"="marketplace"]',
      'nwr["name"]["produce"]',
    ],
  },
  {
    name: "Food & Beverages",
    slug: "food-beverages",
    defaultCategorySlug: "food-beverages-restaurants-eateries",
    osmStatements: [
      'nwr["name"]["amenity"~"restaurant|cafe|fast_food|food_court|bar|pub|ice_cream"]',
      'nwr["name"]["shop"~"bakery|pastry|deli|beverages|confectionery"]',
    ],
  },
  {
    name: "Construction & Building Materials",
    slug: "construction-building-materials",
    defaultCategorySlug: "construction-building-materials-building-materials",
    osmStatements: [
      'nwr["name"]["shop"~"hardware|doityourself|building_materials|paint|timber|tiles"]',
      'nwr["name"]["craft"~"builder|carpenter|painter|roofer|mason|plasterer"]',
    ],
  },
  {
    name: "Fashion & Beauty",
    slug: "fashion-beauty",
    defaultCategorySlug: "fashion-beauty-tailoring-fashion",
    osmStatements: [
      'nwr["name"]["shop"~"clothes|boutique|tailor|shoes|jewelry|beauty|hairdresser|cosmetics|fabric"]',
      'nwr["name"]["craft"~"tailor|dressmaker|shoemaker"]',
    ],
  },
  {
    name: "Health & Wellness",
    slug: "health-wellness",
    defaultCategorySlug: "health-wellness-pharmacies",
    osmStatements: [
      'nwr["name"]["amenity"~"pharmacy|hospital|clinic|doctors|dentist"]',
      'nwr["name"]["leisure"="fitness_centre"]',
      'nwr["name"]["shop"~"chemist|optician|medical_supply"]',
    ],
  },
  {
    name: "Transport & Logistics",
    slug: "transport-logistics",
    defaultCategorySlug: "transport-logistics-courier-parcel",
    osmStatements: [
      'nwr["name"]["amenity"~"bus_station|ferry_terminal|taxi"]',
      'nwr["name"]["office"~"logistics|courier|transport"]',
      'nwr["name"]["shop"="courier"]',
    ],
  },
  {
    name: "Education & Training",
    slug: "education-training",
    defaultCategorySlug: "education-training-schools-academies",
    osmStatements: [
      'nwr["name"]["amenity"~"school|college|university|kindergarten|language_school|driving_school|training"]',
    ],
  },
  {
    name: "Technology & IT",
    slug: "technology-it",
    defaultCategorySlug: "technology-it-software-web",
    osmStatements: [
      'nwr["name"]["shop"~"electronics|computer|mobile_phone"]',
      'nwr["name"]["office"~"it|telecommunication|software"]',
    ],
  },
  {
    name: "Home Services",
    slug: "home-services",
    defaultCategorySlug: "home-services-plumbing-electrical",
    osmStatements: [
      'nwr["name"]["shop"~"furniture|interior_decoration|kitchen|appliances|curtain|bed|houseware"]',
      'nwr["name"]["craft"~"plumber|electrician|cleaner|hvac|gardener|cabinet_maker"]',
    ],
  },
  {
    name: "Professional Services",
    slug: "professional-services",
    defaultCategorySlug: "professional-services-consulting",
    osmStatements: [
      'nwr["name"]["amenity"~"bank|bureau_de_change"]',
      'nwr["name"]["office"~"lawyer|accountant|consulting|insurance|financial|tax_advisor"]',
    ],
  },
  {
    name: "Retail & General Trade",
    slug: "retail-general-trade",
    defaultCategorySlug: "retail-general-trade-groceries-provisions",
    osmStatements: [
      'nwr["name"]["shop"~"supermarket|convenience|department_store|general|variety_store|mall|wholesale"]',
    ],
  },
  {
    name: "Hospitality & Tourism",
    slug: "hospitality-tourism",
    defaultCategorySlug: "hospitality-tourism-hotels-lodges",
    osmStatements: [
      'nwr["name"]["tourism"~"hotel|motel|guest_house|hostel|resort|chalet"]',
      'nwr["name"]["tourism"="travel_agency"]',
    ],
  },
  {
    name: "Events & Media",
    slug: "events-media",
    defaultCategorySlug: "events-media-photography-video",
    osmStatements: [
      'nwr["name"]["craft"~"photographer|printer"]',
      'nwr["name"]["office"~"media|advertising|publishing|newspaper"]',
      'nwr["name"]["amenity"~"theatre|conference_centre|cinema"]',
    ],
  },
  {
    name: "Manufacturing & Industrial",
    slug: "manufacturing-industrial",
    defaultCategorySlug: "manufacturing-industrial-metalworks-fabrication",
    osmStatements: [
      'nwr["name"]["craft"~"metal_construction|blacksmith|welder"]',
      'nwr["name"]["industrial"~"factory|manufacturing"]',
      'nwr["name"]["man_made"="works"]',
      'nwr["name"]["office"="company"]',
    ],
  },
  {
    name: "Automotive",
    slug: "automotive",
    defaultCategorySlug: "automotive-auto-repairs",
    osmStatements: [
      'nwr["name"]["shop"~"car|car_repair|car_parts|motorcycle|tyres"]',
      'nwr["name"]["amenity"="fuel"]',
    ],
  },
  {
    name: "Real Estate & Property",
    slug: "real-estate-property",
    defaultCategorySlug: "real-estate-property-property-agents",
    osmStatements: [
      'nwr["name"]["office"="estate_agent"]',
      'nwr["name"]["shop"="estate_agent"]',
      'nwr["name"]["building"="apartments"]',
      'nwr["name"]["residential"="gated_community"]',
    ],
  },
];

const COMMERCIAL_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Central",
  "Eastern",
  "Northern",
];

function clean(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function fetchOverpassWithFallback(query: string): Promise<any[]> {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "GhanaTradeDirectory/1.0 (bulk-data-import; contact admin@ghanatrade.app)",
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (response.ok) {
        const payload = await response.json();
        return payload.elements ?? [];
      }
    } catch {
      // try next mirror
    }
  }
  return [];
}

async function fetchOsmForSectorRegion(
  sector: SectorQuery,
  regionName: string,
  limit: number,
): Promise<ImportRecord[]> {
  const areaName = `${regionName} Region`;
  const subqueries = sector.osmStatements.map((stmt) => `${stmt}(area.a);`).join("\n  ");
  const query = `[out:json][timeout:60];
area["name"="${areaName}"]["boundary"="administrative"]["admin_level"="4"]->.a;
(
  ${subqueries}
);
out center tags qt ${limit};
`;

  const elements = await fetchOverpassWithFallback(query);
  const results: ImportRecord[] = [];

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = clean(tags.name);
    if (!name) continue;

    const catSlug = categorySlugForOsm(tags) ?? sector.defaultCategorySlug;
    const phone = clean(tags["contact:phone"] ?? tags.phone ?? tags["contact:mobile"]);
    const email = clean(tags["contact:email"] ?? tags.email);
    const website = clean(tags["contact:website"] ?? tags.website ?? tags.url);
    const addressParts = [
      clean(tags["addr:housenumber"]),
      clean(tags["addr:street"]),
      clean(tags["addr:suburb"]),
      clean(tags["addr:city"]),
    ].filter(Boolean);

    results.push({
      source: "OSM",
      sourceRef: `${el.type}/${el.id}`,
      sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      name,
      categorySlug: catSlug,
      status: "PUBLISHED",
      phone,
      email,
      website,
      contactHours: clean(tags.opening_hours),
      regionName,
      districtName: clean(tags["addr:district"] ?? tags["addr:county"]),
      locality: clean(tags["addr:city"] ?? tags["addr:suburb"] ?? tags["addr:town"]),
      address: addressParts.length > 0 ? addressParts.join(", ") : null,
      latitude: el.lat ?? el.center?.lat ?? null,
      longitude: el.lon ?? el.center?.lon ?? null,
      tags: [sector.slug, "osm"],
    });
  }

  return results;
}

async function getSectorCurrentCount(sectorSlug: string): Promise<number> {
  const category = await prisma.category.findUnique({
    where: { slug: sectorSlug },
    include: { children: { select: { id: true } } },
  });
  if (!category) return 0;
  const categoryIds = [category.id, ...category.children.map((c) => c.id)];
  return prisma.business.count({
    where: {
      categoryId: { in: categoryIds },
      status: "PUBLISHED",
      deletedAt: null,
    },
  });
}

export async function runBulkImport(targetPerSector = 75): Promise<void> {
  console.log("=================================================================");
  console.log(`GhanaTrade: Bulk Directory Scale-Up (Target: ${targetPerSector}+ per sector)`);
  console.log("=================================================================\n");

  const ctx = await buildImportContext(prisma, IMPORT_OWNER_EMAIL);
  const batchId = `bulk-${new Date().toISOString().replace(/[:.]/g, "-")}`;

  for (const sector of SECTORS) {
    let currentCount = await getSectorCurrentCount(sector.slug);
    console.log(`\n▶ [${sector.name}] Current published: ${currentCount}`);

    if (currentCount >= targetPerSector) {
      console.log(`  ✓ Already has ${currentCount} businesses (meets target >= ${targetPerSector}).`);
      continue;
    }

    const needed = targetPerSector - currentCount;
    console.log(`  → Fetching real businesses to reach at least ${targetPerSector} (${needed} needed)...`);

    let addedThisSector = 0;
    for (const region of COMMERCIAL_REGIONS) {
      if (currentCount + addedThisSector >= targetPerSector) break;
      const batchNeeded = targetPerSector - (currentCount + addedThisSector);
      const fetchLimit = Math.min(Math.max(batchNeeded, 25), 60);

      console.log(`    Fetching from ${region} Region (limit: ${fetchLimit})...`);
      const osmRecords = await fetchOsmForSectorRegion(sector, region, fetchLimit);
      console.log(`    Received ${osmRecords.length} elements from ${region}. Importing...`);

      for (const rec of osmRecords) {
        rec.importBatchId = batchId;
        try {
          const outcome = await importRecord(prisma, ctx, rec);
          if (outcome === "created" || outcome === "updated") {
            addedThisSector++;
          }
        } catch (e) {
          // ignore duplicate conflict
        }
      }

      const updatedCount = await getSectorCurrentCount(sector.slug);
      console.log(`    Current sector total is now: ${updatedCount}`);
      if (updatedCount >= targetPerSector) break;
    }

    const finalCount = await getSectorCurrentCount(sector.slug);
    console.log(`  ★ Sector [${sector.name}] final count: ${finalCount}`);
  }

  console.log("\n=================================================================");
  console.log("FINAL DIRECTORY STATUS REPORT");
  console.log("=================================================================");

  const summary: { sector: string; publishedCount: number; status: string }[] = [];
  for (const sector of SECTORS) {
    const count = await getSectorCurrentCount(sector.slug);
    summary.push({
      sector: sector.name,
      publishedCount: count,
      status: count >= 60 ? "✅ Meets Target (60-100)" : "⏳ Progressing",
    });
  }

  console.table(summary);
}

runBulkImport(70)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
