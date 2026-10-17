import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  buildImportContext,
  importRecord,
  normalizeRegionKey,
  type ImportRecord,
  type ImportOutcome,
} from "../src/lib/import/pipeline";
import { categorySlugForOsm } from "../src/lib/import/categories";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Configure .env before importing.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const OVERPASS_URL =
  process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
const IMPORT_OWNER_EMAIL = process.env.IMPORT_OWNER_EMAIL ?? "imports@ghanatrade.app";

const AMENITY_BLOCKLIST = new Set([
  "place_of_worship",
  "police",
  "courthouse",
  "townhall",
  "embassy",
  "fire_station",
  "community_centre",
  "social_facility",
  "public_building",
  "grave_yard",
  "parking",
  "parking_entrance",
  "parking_space",
  "toilets",
  "drinking_water",
  "fountain",
  "bench",
  "shelter",
  "recycling",
  "waste_basket",
  "waste_transfer_station",
  "prison",
  "ranger_station",
  "customs",
  "monitoring_station",
  "clock",
  "post_box",
]);

const OFFICE_BLOCKLIST = new Set([
  "government",
  "diplomatic",
  "ngo",
  "association",
  "research",
  "educational_institution",
  "political_party",
  "religion",
  "notary",
]);

const TOURISM_BLOCKLIST = new Set(["information", "artwork", "picnic_site", "picnic_table"]);

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type Args = {
  regions: string[];
  all: boolean;
  limit: number;
  includeUnmapped: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { regions: [], all: false, limit: 500, includeUnmapped: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--all") args.all = true;
    else if (token === "--region") args.regions.push(argv[++i] ?? "");
    else if (token === "--limit") args.limit = Number(argv[++i] ?? "500") || 500;
    else if (token === "--include-unmapped") args.includeUnmapped = true;
  }
  return args;
}

function clean(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function firstTag(tags: Record<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    const value = clean(tags[key]);
    if (value) return value;
  }
  return null;
}

function buildAddress(tags: Record<string, string>): string | null {
  const parts = [
    clean(tags["addr:housenumber"]),
    clean(tags["addr:street"]),
    clean(tags["addr:suburb"]),
    clean(tags["addr:city"]),
  ].filter((value): value is string => value !== null);
  return parts.length > 0 ? parts.join(", ") : null;
}

function isBlocked(tags: Record<string, string>): boolean {
  if (tags.amenity && AMENITY_BLOCKLIST.has(tags.amenity)) return true;
  if (tags.office && OFFICE_BLOCKLIST.has(tags.office)) return true;
  if (tags.tourism && TOURISM_BLOCKLIST.has(tags.tourism)) return true;
  return false;
}

function toImportedTags(tags: Record<string, string>): string[] {
  const collected: string[] = [];
  for (const key of ["shop", "amenity", "office", "craft", "tourism", "healthcare"]) {
    if (tags[key]) collected.push(tags[key]);
  }
  return collected;
}

function elementToRecord(
  element: OverpassElement,
  regionName: string,
  includeUnmapped: boolean,
): ImportRecord | null {
  const tags = element.tags;
  if (!tags) return null;
  const name = clean(tags.name);
  if (!name) return null;
  if (isBlocked(tags)) return null;

  const categorySlug = categorySlugForOsm(tags);
  if (!categorySlug && !includeUnmapped) return null;

  const latitude = element.lat ?? element.center?.lat ?? null;
  const longitude = element.lon ?? element.center?.lon ?? null;

  return {
    source: "OSM",
    sourceRef: `${element.type}/${element.id}`,
    sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    name,
    categorySlug,
    phone: firstTag(tags, ["contact:phone", "phone", "contact:mobile", "mobile"]),
    whatsapp: firstTag(tags, ["contact:whatsapp", "whatsapp"]),
    email: firstTag(tags, ["contact:email", "email"]),
    website: firstTag(tags, ["contact:website", "website", "url"]),
    facebook: firstTag(tags, ["contact:facebook", "facebook"]),
    contactHours: clean(tags.opening_hours),
    regionName,
    districtName: firstTag(tags, ["addr:district", "addr:county"]),
    locality: firstTag(tags, ["addr:city", "addr:town", "addr:suburb", "addr:place", "addr:village"]),
    address: buildAddress(tags),
    latitude,
    longitude,
    tags: toImportedTags(tags),
  };
}

function buildQuery(regionName: string, limit: number): string {
  const area = `${regionName} Region`;
  return `[out:json][timeout:180];
area["name"="${area}"]["boundary"="administrative"]["admin_level"="4"]->.a;
(
  nwr["name"]["shop"](area.a);
  nwr["name"]["amenity"](area.a);
  nwr["name"]["office"](area.a);
  nwr["name"]["craft"](area.a);
  nwr["name"]["tourism"](area.a);
  nwr["name"]["healthcare"](area.a);
);
out center tags qt ${limit};
`;
}

async function fetchOverpass(query: string): Promise<OverpassElement[]> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(OVERPASS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "GhanaTradeDirectory/1.0 (data import; contact admin@ghanatrade.app)",
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (response.status === 429 || response.status === 504 || response.status >= 500) {
        throw new Error(`Overpass responded ${response.status}`);
      }
      if (!response.ok) {
        throw new Error(`Overpass responded ${response.status} ${response.statusText}`);
      }
      const payload = (await response.json()) as { elements?: OverpassElement[] };
      return payload.elements ?? [];
    } catch (error) {
      lastError = error;
      const waitMs = attempt * 5000;
      console.warn(`  ! attempt ${attempt} failed: ${String(error)} — retrying in ${waitMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.all && args.regions.length === 0) {
    console.error(
      "Usage: npm run db:import:osm -- --region \"Greater Accra\" [--region Ashanti] [--limit 500] [--include-unmapped]\n" +
        "       npm run db:import:osm -- --all [--limit 500]",
    );
    process.exit(1);
  }

  const ctx = await buildImportContext(prisma, IMPORT_OWNER_EMAIL);
  const allRegions = await prisma.region.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  let targets = allRegions;
  if (!args.all) {
    const wanted = new Set(args.regions.map(normalizeRegionKey));
    targets = allRegions.filter((region) => wanted.has(normalizeRegionKey(region.name)));
    if (targets.length === 0) {
      console.error(`No matching regions. Available: ${allRegions.map((r) => r.name).join(", ")}`);
      process.exit(1);
    }
  }

  const batchId = `osm-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  console.log(`Import batch ${batchId} — ${targets.length} region(s), limit ${args.limit}/region`);

  const totals = { created: 0, updated: 0, skipped: 0, fetched: 0 };

  for (const region of targets) {
    console.log(`\n>> ${region.name}`);
    let elements: OverpassElement[];
    try {
      elements = await fetchOverpass(buildQuery(region.name, args.limit));
    } catch (error) {
      console.error(`  ! query failed, skipping region: ${String(error)}`);
      continue;
    }
    totals.fetched += elements.length;
    console.log(`  fetched ${elements.length} elements`);

    for (const element of elements) {
      const record = elementToRecord(element, region.name, args.includeUnmapped);
      if (!record) {
        totals.skipped += 1;
        continue;
      }
      record.importBatchId = batchId;
      const outcome: ImportOutcome = await importRecord(prisma, ctx, record);
      totals[outcome] += 1;
    }
    console.log(
      `  running total → created ${totals.created}, updated ${totals.updated}, skipped ${totals.skipped}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(
    `\nDone. fetched ${totals.fetched}, created ${totals.created}, updated ${totals.updated}, skipped ${totals.skipped}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
