import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  KNOWN_BRAND_LOGOS,
  extractDomain,
  getSectorDefaultCover,
  getSectorOfferings,
} from "../src/lib/sector-media";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  console.log("Starting Real Logos, Real Covers & Offerings Seeding...");

  const businesses = await prisma.business.findMany({
    where: { deletedAt: null },
    include: {
      category: {
        select: {
          name: true,
          slug: true,
          parent: { select: { name: true, slug: true } },
        },
      },
      offerings: { select: { id: true } },
    },
  });

  console.log(`Found ${businesses.length} total businesses to process.`);

  let logosUpdated = 0;
  let coversUpdated = 0;
  let offeringsCreated = 0;

  for (const b of businesses) {
    const sectorSlug = b.category?.parent?.slug ?? b.category?.slug ?? b.category?.name;
    const defaultCover = getSectorDefaultCover(sectorSlug);

    // Determine logo
    let logoToSet: string | null = null;
    const lowerName = b.name.toLowerCase();

    // 1. Check known brands first
    for (const [key, logoUrl] of Object.entries(KNOWN_BRAND_LOGOS)) {
      if (lowerName.includes(key)) {
        logoToSet = logoUrl;
        break;
      }
    }

    // 2. Check website domain if no brand match
    if (!logoToSet && b.website) {
      const domain = extractDomain(b.website);
      if (domain && !domain.includes("facebook.com") && !domain.includes("instagram.com")) {
        logoToSet = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      }
    }

    const updates: { coverKey?: string; logoKey?: string } = {};

    if (!b.coverKey && defaultCover) {
      updates.coverKey = defaultCover;
      coversUpdated++;
    }

    if (!b.logoKey && logoToSet) {
      updates.logoKey = logoToSet;
      logosUpdated++;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.business.update({
        where: { id: b.id },
        data: updates,
      });
    }

    // Seed offerings for businesses that have none
    // If business has 0 offerings, populate 3-4 sector tailored offerings
    if (b.offerings.length === 0) {
      const templates = getSectorOfferings(sectorSlug, b.name);
      for (const [idx, tpl] of templates.entries()) {
        await prisma.offering.create({
          data: {
            businessId: b.id,
            title: tpl.title,
            type: tpl.type,
            priceLabel: tpl.priceLabel,
            description: tpl.description,
            status: "ACTIVE",
            sortOrder: idx,
          },
        });
        offeringsCreated++;
      }
    }
  }

  console.log("Seeding and Image Update Summary:");
  console.log(`  - Covers Assigned: ${coversUpdated}`);
  console.log(`  - Real Logos Assigned: ${logosUpdated}`);
  console.log(`  - Offerings Created: ${offeringsCreated}`);
  console.log("Done successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding logos and offerings:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
