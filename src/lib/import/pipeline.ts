import type { ImportSource, BusinessStatus } from "../../generated/prisma/enums";
import type { PrismaClient } from "../../generated/prisma/client";
import { slugify, uniqueSlug } from "../slug";
import { FALLBACK_CATEGORY_SLUG } from "./categories";

export type ImportRecord = {
  source: ImportSource;
  sourceRef: string;
  sourceUrl?: string | null;
  name: string;
  categorySlug?: string | null;
  description?: string | null;
  status?: BusinessStatus;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  facebook?: string | null;
  contactHours?: string | null;
  regionName: string;
  districtName?: string | null;
  locality?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  tags?: string[];
  importBatchId?: string | null;
};

export type ImportContext = {
  importUserId: string;
  regionByName: Map<
    string,
    { id: string; districts: Map<string, string> }
  >;
  categoryBySlug: Map<string, string>;
  fallbackCategoryId: string | null;
};

export type ImportOutcome = "created" | "updated" | "skipped";

export function normalizeRegionKey(name: string): string {
  return slugify(name.replace(/region$/i, "").trim());
}

export function normalizeValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function buildImportContext(
  prisma: PrismaClient,
  ownerEmail: string,
): Promise<ImportContext> {
  let user = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: ownerEmail,
        displayName: "GhanaTrade Imports",
        passwordHash: "!",
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
  }

  const regionByName = new Map<
    string,
    { id: string; districts: Map<string, string> }
  >();
  const regions = await prisma.region.findMany({
    select: { id: true, name: true, districts: { select: { id: true, name: true } } },
  });
  for (const region of regions) {
    const districts = new Map<string, string>();
    for (const district of region.districts) {
      districts.set(slugify(district.name), district.id);
    }
    regionByName.set(normalizeRegionKey(region.name), { id: region.id, districts });
  }

  const categoryBySlug = new Map<string, string>();
  const categories = await prisma.category.findMany({
    select: { id: true, slug: true },
  });
  for (const category of categories) {
    categoryBySlug.set(category.slug, category.id);
  }

  return {
    importUserId: user.id,
    regionByName,
    categoryBySlug,
    fallbackCategoryId: categoryBySlug.get(FALLBACK_CATEGORY_SLUG) ?? null,
  };
}

function resolveCategoryId(ctx: ImportContext, slug: string | null | undefined): string | null {
  if (slug) {
    const id = ctx.categoryBySlug.get(slug);
    if (id) return id;
  }
  return ctx.fallbackCategoryId;
}

function buildDescription(record: ImportRecord, categoryLabel: string): string {
  const explicit = normalizeValue(record.description);
  if (explicit) return explicit;
  const place =
    normalizeValue(record.locality) ??
    normalizeValue(record.districtName) ??
    record.regionName;
  return `${record.name} is a ${categoryLabel} located in ${place}, Ghana. Imported from ${record.source} and awaiting verification.`;
}

function buildTags(record: ImportRecord): string[] {
  const tags = new Set<string>(["unclaimed", record.source.toLowerCase()]);
  for (const tag of record.tags ?? []) {
    const clean = tag.trim().toLowerCase();
    if (clean) tags.add(clean);
  }
  return Array.from(tags).slice(0, 12);
}

export async function importRecord(
  prisma: PrismaClient,
  ctx: ImportContext,
  record: ImportRecord,
): Promise<ImportOutcome> {
  const region = ctx.regionByName.get(normalizeRegionKey(record.regionName));
  if (!region) {
    return "skipped";
  }
  const districtId = record.districtName
    ? region.districts.get(slugify(record.districtName)) ?? null
    : null;
  const categoryId = resolveCategoryId(ctx, record.categorySlug);
  if (!categoryId) {
    return "skipped";
  }
  const categoryLabel = record.categorySlug
    ? record.categorySlug.replace(/-/g, " ")
    : "local business";
  const description = buildDescription(record, categoryLabel);
  const tags = buildTags(record);
  const phone = normalizeValue(record.phone);

  const where = {
    source_sourceRef: { source: record.source, sourceRef: record.sourceRef },
  };

  const existing = await prisma.business.findUnique({
    where,
    select: { id: true, claimed: true },
  });

  if (existing) {
    if (existing.claimed) {
      return "skipped";
    }
    const updateStatus = record.status ?? "PUBLISHED";
    await prisma.business.update({
      where: { id: existing.id },
      data: {
        name: record.name,
        categoryId,
        description,
        status: updateStatus,
        publishedAt: updateStatus === "PUBLISHED" ? new Date() : undefined,
        phone,
        whatsapp: normalizeValue(record.whatsapp),
        email: normalizeValue(record.email),
        website: normalizeValue(record.website),
        facebook: normalizeValue(record.facebook),
        contactHours: normalizeValue(record.contactHours),
        sourceUrl: record.sourceUrl ?? null,
        tags,
        importBatchId: record.importBatchId ?? undefined,
      },
    });
    await replaceLocation(prisma, existing.id, {
      regionId: region.id,
      districtId,
      locality: normalizeValue(record.locality),
      address: normalizeValue(record.address),
      latitude: record.latitude ?? null,
      longitude: record.longitude ?? null,
    });
    return "updated";
  }

  const nativeConflict = await prisma.business.findFirst({
    where: {
      source: null,
      OR: [
        ...(phone ? [{ phone }] : []),
        { name: { equals: record.name, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (nativeConflict) {
    return "skipped";
  }

  const slug = await uniqueSlug(record.name, async (candidate) => {
    const found = await prisma.business.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return found !== null;
  });

  const status = record.status ?? "PUBLISHED";
  const publishedAt = status === "PUBLISHED" ? new Date() : null;

  const created = await prisma.business.create({
    data: {
      ownerId: ctx.importUserId,
      categoryId,
      name: record.name,
      slug,
      description,
      status,
      publishedAt,
      phone,
      whatsapp: normalizeValue(record.whatsapp),
      email: normalizeValue(record.email),
      website: normalizeValue(record.website),
      facebook: normalizeValue(record.facebook),
      contactHours: normalizeValue(record.contactHours),
      source: record.source,
      sourceRef: record.sourceRef,
      sourceUrl: record.sourceUrl ?? null,
      claimed: false,
      importBatchId: record.importBatchId ?? null,
      tags,
    },
    select: { id: true },
  });

  await prisma.businessLocation.create({
    data: {
      businessId: created.id,
      regionId: region.id,
      districtId,
      locality: normalizeValue(record.locality),
      address: normalizeValue(record.address),
      latitude: record.latitude ?? null,
      longitude: record.longitude ?? null,
    },
  });

  return "created";
}

async function replaceLocation(
  prisma: PrismaClient,
  businessId: string,
  data: {
    regionId: string;
    districtId: string | null;
    locality: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  },
): Promise<void> {
  const existing = await prisma.businessLocation.findFirst({
    where: { businessId },
    select: { id: true },
  });
  if (existing) {
    await prisma.businessLocation.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.businessLocation.create({
      data: { businessId, ...data },
    });
  }
}
