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
import { categorySlugForGoogle } from "../src/lib/import/categories";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Configure .env before importing.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const IMPORT_OWNER_EMAIL = process.env.IMPORT_OWNER_EMAIL ?? "imports@ghanatrade.app";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.types",
  "places.primaryType",
  "places.regularOpeningHours",
  "places.addressComponents",
  "nextPageToken",
].join(",");

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type Place = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  types?: string[];
  primaryType?: string;
  regularOpeningHours?: { weekdayText?: string[] };
  addressComponents?: AddressComponent[];
};

type SearchResponse = { places?: Place[]; nextPageToken?: string };

type Args = {
  regions: string[];
  all: boolean;
  pages: number;
  includeUnmapped: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { regions: [], all: false, pages: 3, includeUnmapped: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--all") args.all = true;
    else if (token === "--region") args.regions.push(argv[++i] ?? "");
    else if (token === "--pages") args.pages = Number(argv[++i] ?? "3") || 3;
    else if (token === "--include-unmapped") args.includeUnmapped = true;
  }
  return args;
}

function clean(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function componentValue(
  components: AddressComponent[] | undefined,
  wanted: string[],
): string | null {
  if (!components) return null;
  for (const component of components) {
    if (component.types?.some((type) => wanted.includes(type))) {
      return clean(component.longText) ?? clean(component.shortText);
    }
  }
  return null;
}

function placeToRecord(
  place: Place,
  regionName: string,
  includeUnmapped: boolean,
): ImportRecord | null {
  const name = clean(place.displayName?.text);
  if (!name || !place.id) return null;

  const types = place.types ?? [];
  const categorySlug = categorySlugForGoogle(
    place.primaryType ? [place.primaryType, ...types] : types,
  );
  if (!categorySlug && !includeUnmapped) return null;

  return {
    source: "GOOGLE",
    sourceRef: place.id,
    sourceUrl: `https://www.google.com/maps/place/?q=place_id:${place.id}`,
    name,
    categorySlug,
    phone:
      clean(place.nationalPhoneNumber) ?? clean(place.internationalPhoneNumber) ?? null,
    website: clean(place.websiteUri),
    contactHours: place.regularOpeningHours?.weekdayText?.join("; ") ?? null,
    regionName,
    districtName: componentValue(place.addressComponents, [
      "administrative_area_level_2",
      "administrative_area_level_3",
    ]),
    locality: componentValue(place.addressComponents, ["locality", "postal_town", "sublocality"]),
    address: clean(place.formattedAddress),
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    tags: types.slice(0, 5),
  };
}

async function searchText(query: string, pageToken?: string): Promise<SearchResponse> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY as string,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 20,
      languageCode: "en",
      regionCode: "GH",
      ...(pageToken ? { pageToken } : {}),
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Places API ${response.status}: ${detail.slice(0, 300)}`);
  }
  return (await response.json()) as SearchResponse;
}

async function main(): Promise<void> {
  if (!API_KEY) {
    console.log(
      "GOOGLE_PLACES_API_KEY is not set — skipping Google import.\n" +
        "Set it in .env (Places API enabled, billing on) then re-run: npm run db:import:google -- --all",
    );
    return;
  }

  const args = parseArgs(process.argv.slice(2));
  if (!args.all && args.regions.length === 0) {
    console.error(
      "Usage: npm run db:import:google -- --region \"Greater Accra\" [--pages 3] [--include-unmapped]\n" +
        "       npm run db:import:google -- --all [--pages 3]",
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

  const batchId = `google-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  console.log(`Import batch ${batchId} — ${targets.length} region(s), ${args.pages} page(s)/region`);

  const totals = { created: 0, updated: 0, skipped: 0, fetched: 0 };

  for (const region of targets) {
    console.log(`\n>> ${region.name}`);
    const query = `businesses in ${region.name} Region, Ghana`;
    let pageToken: string | undefined;

    for (let page = 0; page < args.pages; page += 1) {
      let result: SearchResponse;
      try {
        result = await searchText(query, pageToken);
      } catch (error) {
        console.error(`  ! search failed, skipping region: ${String(error)}`);
        break;
      }
      const places = result.places ?? [];
      totals.fetched += places.length;
      console.log(`  page ${page + 1}: ${places.length} places`);

      for (const place of places) {
        const record = placeToRecord(place, region.name, args.includeUnmapped);
        if (!record) {
          totals.skipped += 1;
          continue;
        }
        record.importBatchId = batchId;
        const outcome: ImportOutcome = await importRecord(prisma, ctx, record);
        totals[outcome] += 1;
      }

      pageToken = result.nextPageToken;
      if (!pageToken) break;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    console.log(
      `  running total → created ${totals.created}, updated ${totals.updated}, skipped ${totals.skipped}`,
    );
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
