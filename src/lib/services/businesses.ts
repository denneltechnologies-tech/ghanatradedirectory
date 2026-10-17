import { prisma } from "@/lib/db";
import { uniqueSlug } from "@/lib/slug";
import type { BusinessInput } from "@/lib/validation";
import type { Prisma } from "@/generated/prisma/client";
import type { BusinessStatus } from "@/generated/prisma/enums";

export async function slugExists(slug: string): Promise<boolean> {
  const found = await prisma.business.findUnique({ where: { slug }, select: { id: true } });
  return Boolean(found);
}

export async function listBusinessesForUser(userId: string) {
  return prisma.business.findMany({
    where: {
      deletedAt: null,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: {
      category: { select: { name: true, slug: true, icon: true } },
      locations: {
        select: {
          locality: true,
          region: { select: { name: true, slug: true } },
          district: { select: { name: true } },
        },
        take: 1,
      },
      _count: { select: { offerings: true, likes: true, comments: true, claims: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getBusinessForOwner(businessId: string) {
  return prisma.business.findUnique({
    where: { id: businessId },
    include: {
      category: true,
      locations: true,
      media: { orderBy: { sortOrder: "asc" } },
      offerings: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        include: { media: true },
      },
      logisticsProfile: true,
      claims: { orderBy: { createdAt: "desc" }, take: 5 },
      verificationEvents: { orderBy: { createdAt: "desc" }, include: { actor: { select: { displayName: true } } } },
    },
  });
}

export async function getPublicBusiness(slug: string) {
  return prisma.business.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    include: {
      category: {
        select: { name: true, slug: true, icon: true, parent: { select: { name: true, slug: true } } },
      },
      locations: {
        include: {
          region: { select: { name: true, slug: true } },
          district: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      offerings: {
        where: { status: "ACTIVE", deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        include: { media: { orderBy: { sortOrder: "asc" } } },
      },
      media: { orderBy: { sortOrder: "asc" } },
      logisticsProfile: true,
      _count: { select: { likes: true, comments: true, offerings: true } },
    },
  });
}

async function locationData(input: BusinessInput) {
  return {
    regionId: input.regionId,
    districtId: input.districtId || null,
    locality: input.locality || null,
    address: input.address || null,
    landmark: input.landmark || null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    isPublic: true,
  };
}

function profileFields(input: BusinessInput) {
  return {
    name: input.name,
    description: input.description,
    longDescription: input.longDescription || null,
    categoryId: input.categoryId,
    phone: input.phone || null,
    whatsapp: input.whatsapp || null,
    email: input.email || null,
    website: input.website || null,
    facebook: input.facebook || null,
    instagram: input.instagram || null,
    tiktok: input.tiktok || null,
    twitter: input.twitter || null,
    contactHours: input.contactHours || null,
    preferredChannel: input.preferredChannel || null,
    registrationName: input.registrationName || null,
    registrationId: input.registrationId || null,
    deliveryOffered: input.deliveryOffered,
    paymentMethods: input.paymentMethods,
    languages: input.languages,
    tags: input.tags,
    accessibilityNotes: input.accessibilityNotes || null,
  };
}

export async function createBusiness(ownerId: string, input: BusinessInput) {
  const slug = await uniqueSlug(input.name, slugExists);
  const location = await locationData(input);

  return prisma.business.create({
    data: {
      ...profileFields(input),
      slug,
      ownerId,
      status: "DRAFT",
      lastUpdatedAt: new Date(),
      locations: { create: [location] },
      members: { create: [{ userId: ownerId, role: "PRIMARY" }] },
      subscriptions: { create: [{ plan: "FREE" }] },
    },
  });
}

export async function updateBusiness(businessId: string, input: BusinessInput) {
  const existing = await prisma.business.findUnique({
    where: { id: businessId },
    include: { locations: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (!existing) throw new Error("NOT_FOUND");

  const location = await locationData(input);
  const needsReview = existing.status === "PUBLISHED";

  return prisma.business.update({
    where: { id: businessId },
    data: {
      ...profileFields(input),
      lastUpdatedAt: new Date(),
      ...(needsReview ? { status: "PENDING_REVIEW" as BusinessStatus } : {}),
      locations: existing.locations[0]
        ? { update: { where: { id: existing.locations[0].id }, data: location } }
        : { create: [location] },
    },
  });
}

export async function submitBusinessForReview(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { _count: { select: { offerings: true } } },
  });
  if (!business) throw new Error("NOT_FOUND");

  return prisma.business.update({
    where: { id: businessId },
    data: { status: "PENDING_REVIEW", lastUpdatedAt: new Date() },
  });
}

export async function archiveBusiness(businessId: string) {
  return prisma.business.update({
    where: { id: businessId },
    data: { status: "ARCHIVED", deletedAt: new Date() },
  });
}

export async function setBusinessStatus(businessId: string, status: BusinessStatus) {
  return prisma.business.update({
    where: { id: businessId },
    data: {
      status,
      ...(status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
      lastUpdatedAt: new Date(),
    },
  });
}

export async function addBusinessMember(businessId: string, userId: string) {
  return prisma.businessMember.upsert({
    where: { businessId_userId: { businessId, userId } },
    create: { businessId, userId, role: "MANAGER" },
    update: {},
  });
}

export async function recordProfileView(businessId: string) {
  try {
    await prisma.business.update({
      where: { id: businessId },
      data: { viewCount: { increment: 1 } },
    });
  } catch {
    // view counting must never break the page
  }
}

export async function ownerDashboardStats(userId: string, businessIds: string[]) {
  if (businessIds.length === 0) {
    return { views: 0, likes: 0, comments: 0, contactClicks: 0, offerings: 0, openClaims: 0 };
  }

  const [views, likes, comments, contactClicks, offerings, openClaims] = await Promise.all([
    prisma.business.aggregate({
      where: { id: { in: businessIds } },
      _sum: { viewCount: true },
    }),
    prisma.like.count({ where: { businessId: { in: businessIds } } }),
    prisma.comment.count({ where: { businessId: { in: businessIds }, status: "VISIBLE" } }),
    prisma.analyticsEvent.count({
      where: {
        businessId: { in: businessIds },
        type: { in: ["CONTACT_CLICK", "WHATSAPP_CLICK", "EMAIL_CLICK", "WEBSITE_CLICK", "ORDER_CLICK"] },
      },
    }),
    prisma.offering.count({
      where: { businessId: { in: businessIds }, deletedAt: null, status: "ACTIVE" },
    }),
    prisma.claim.count({ where: { businessId: { in: businessIds }, status: "PENDING" } }),
  ]);

  return {
    views: views._sum.viewCount ?? 0,
    likes,
    comments,
    contactClicks,
    offerings,
    openClaims,
  };
}

export type BusinessUpsertData = Prisma.BusinessUpdateInput;
