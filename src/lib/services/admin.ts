import { prisma } from "@/lib/db";
import { uniqueSlug } from "@/lib/slug";
import { slugify } from "@/lib/slug";
import type { CategoryInput, DistrictInput } from "@/lib/validation";
import type { BusinessStatus, CommentStatus, ReportStatus, UserStatus } from "@/generated/prisma/enums";

export async function getReviewQueue() {
  return prisma.business.findMany({
    where: { status: "PENDING_REVIEW", deletedAt: null },
    include: {
      owner: { select: { displayName: true, email: true } },
      category: { select: { name: true, slug: true } },
      locations: { include: { region: { select: { name: true } }, district: { select: { name: true } } } },
      _count: { select: { offerings: true } },
    },
    orderBy: { updatedAt: "asc" },
  });
}

export async function listBusinessesForAdmin(params?: {
  status?: BusinessStatus;
  q?: string;
  page?: number;
  perPage?: number;
}) {
  const { status, q, page = 1, perPage = 50 } = params ?? {};
  const skip = (page - 1) * perPage;

  const where: any = {
    deletedAt: null,
    ...(status ? { status } : {}),
  };

  if (q && q.trim()) {
    const term = q.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
      { website: { contains: term, mode: "insensitive" } },
      { category: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.business.findMany({
      where,
      include: {
        owner: { select: { displayName: true, email: true } },
        category: { select: { name: true, slug: true } },
        locations: { include: { region: { select: { name: true } }, district: { select: { name: true } } } },
        _count: { select: { offerings: true, comments: true, likes: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: perPage,
    }),
    prisma.business.count({ where }),
  ]);

  return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
}

export async function superAdminCreateBusiness(input: {
  name: string;
  categoryId: string;
  description: string;
  longDescription?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  logoKey?: string;
  featured?: boolean;
  verificationLevel?: any;
  status?: BusinessStatus;
  regionId?: string;
  districtId?: string;
  locality?: string;
  address?: string;
  actorId: string;
}) {
  const baseSlug = slugify(input.name);
  const slug = await uniqueSlug(baseSlug, async (candidate) => {
    const found = await prisma.business.findUnique({ where: { slug: candidate }, select: { id: true } });
    return Boolean(found);
  });

  return prisma.business.create({
    data: {
      name: input.name,
      slug,
      categoryId: input.categoryId,
      ownerId: input.actorId,
      description: input.description,
      longDescription: input.longDescription || null,
      phone: input.phone || null,
      whatsapp: input.whatsapp || null,
      email: input.email || null,
      website: input.website || null,
      logoKey: input.logoKey || null,
      featured: input.featured ?? false,
      verificationLevel: input.verificationLevel ?? "CAC_REGULATOR_ACCREDITED",
      verifiedAt: input.verificationLevel && input.verificationLevel !== "UNVERIFIED" ? new Date() : null,
      status: input.status ?? "PUBLISHED",
      publishedAt: input.status !== "DRAFT" ? new Date() : null,
      locations: input.regionId
        ? {
            create: {
              regionId: input.regionId,
              districtId: input.districtId || null,
              locality: input.locality || null,
              address: input.address || null,
              isPublic: true,
            },
          }
        : undefined,
    },
  });
}

export async function deleteBusiness(businessId: string, actorId: string, note?: string) {
  const business = await prisma.business.update({
    where: { id: businessId },
    data: {
      deletedAt: new Date(),
      status: "ARCHIVED",
    },
  });

  await prisma.moderationEvent.create({
    data: {
      action: "ARCHIVE_BUSINESS",
      targetType: "BUSINESS",
      targetId: businessId,
      businessId,
      actorId,
      note: note || "Business removed by Super Administrator",
    },
  });

  return business;
}

export async function updateBusinessDetails(
  businessId: string,
  data: {
    name?: string;
    categoryId?: string;
    description?: string;
    longDescription?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    website?: string;
    logoKey?: string;
    status?: BusinessStatus;
    verificationLevel?: any;
    featured?: boolean;
  },
) {
  return prisma.business.update({
    where: { id: businessId },
    data: {
      ...data,
      lastUpdatedAt: new Date(),
    },
  });
}

export async function getReportQueue(status?: ReportStatus) {
  return prisma.report.findMany({
    where: status ? { status } : { status: { in: ["OPEN", "IN_REVIEW"] } },
    include: {
      reporter: { select: { displayName: true, email: true } },
      assignedTo: { select: { displayName: true } },
      business: { select: { id: true, name: true, slug: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
}

export async function getModerationComments(status: CommentStatus = "VISIBLE") {
  return prisma.comment.findMany({
    where: { status },
    include: {
      author: { select: { displayName: true, email: true } },
      business: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function resolveReport(input: {
  reportId: string;
  actorId: string;
  status: ReportStatus;
  note?: string;
}) {
  const report = await prisma.report.findUnique({ where: { id: input.reportId } });
  if (!report) throw new Error("NOT_FOUND");

  const [updated] = await prisma.$transaction([
    prisma.report.update({
      where: { id: input.reportId },
      data: {
        status: input.status,
        assignedToId: input.actorId,
        resolutionNote: input.note || null,
        resolvedAt: input.status === "RESOLVED" || input.status === "DISMISSED" ? new Date() : null,
      },
    }),
    prisma.moderationEvent.create({
      data: {
        action: input.status === "DISMISSED" ? "DISMISS_REPORT" : "RESOLVE_REPORT",
        targetType: "REPORT",
        targetId: input.reportId,
        businessId: report.businessId,
        actorId: input.actorId,
        note: input.note || null,
      },
    }),
  ]);

  return updated;
}

export async function listCategoryTree() {
  return prisma.category.findMany({
    include: {
      parent: { select: { name: true } },
      _count: { select: { businesses: true, children: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function categorySlugExists(slug: string): Promise<boolean> {
  const found = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  return Boolean(found);
}

export async function upsertCategory(input: CategoryInput) {
  const data = {
    name: input.name,
    parentId: input.parentId || null,
    icon: input.icon || null,
    description: input.description || null,
    active: Boolean(input.active),
    featured: Boolean(input.featured),
    sortOrder: input.sortOrder ?? 0,
  };

  if (input.id) {
    return prisma.category.update({ where: { id: input.id }, data });
  }

  const slug = await uniqueSlug(input.name, categorySlugExists);
  return prisma.category.create({ data: { ...data, slug } });
}

export async function toggleCategoryActive(id: string, active: boolean) {
  return prisma.category.update({ where: { id }, data: { active } });
}

export async function listRegionsWithDistricts() {
  return prisma.region.findMany({
    include: {
      districts: { orderBy: { name: "asc" } },
      _count: { select: { businessLocations: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createDistrict(input: DistrictInput) {
  const base = slugify(input.name);
  const slug = await uniqueSlug(base, async (candidate) => {
    const existing = await prisma.district.findUnique({
      where: { regionId_slug: { regionId: input.regionId, slug: candidate } },
      select: { id: true },
    });
    return Boolean(existing);
  });
  return prisma.district.create({
    data: {
      regionId: input.regionId,
      name: input.name,
      kind: input.kind || null,
      slug,
    },
  });
}

export async function deleteDistrict(id: string) {
  await prisma.district.delete({ where: { id } });
}

export async function listUsers(search?: string) {
  return prisma.user.findMany({
    where: search
      ? {
          OR: [
            { displayName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {},
    select: {
      id: true,
      displayName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { businesses: true, comments: true, reports: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function setUserStatus(input: {
  userId: string;
  actorId: string;
  status: UserStatus;
}) {
  const user = await prisma.user.update({
    where: { id: input.userId },
    data: { status: input.status },
  });
  if (input.status === "SUSPENDED") {
    await prisma.session.deleteMany({ where: { userId: input.userId } });
  }
  await prisma.moderationEvent.create({
    data: {
      action: input.status === "SUSPENDED" ? "SUSPEND_USER" : "REINSTATE_USER",
      targetType: "USER",
      targetId: input.userId,
      actorId: input.actorId,
      note: `Status set to ${input.status}`,
    },
  });
  return user;
}

export async function listModerationEvents(limit = 100) {
  return prisma.moderationEvent.findMany({
    include: {
      actor: { select: { displayName: true, role: true } },
      comment: { select: { body: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listAuditEvents(limit = 100) {
  return prisma.auditEvent.findMany({
    include: { actor: { select: { displayName: true, email: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function analyticsSummary(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);

  const [
    totalBusinesses,
    publishedBusinesses,
    pendingBusinesses,
    totalUsers,
    openReports,
    pendingClaims,
    quoteRequests,
    topByViews,
    topEvents,
    searches,
    noResultSearches,
    providerResponses,
  ] = await Promise.all([
    prisma.business.count({ where: { deletedAt: null } }),
    prisma.business.count({ where: { status: "PUBLISHED", deletedAt: null } }),
    prisma.business.count({ where: { status: "PENDING_REVIEW", deletedAt: null } }),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.report.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
    prisma.claim.count({ where: { status: "PENDING" } }),
    prisma.quoteRequest.count({ where: { createdAt: { gte: since } } }),
    prisma.business.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, slug: true, viewCount: true },
      orderBy: { viewCount: "desc" },
      take: 8,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["type"],
      where: { createdAt: { gte: since } },
      _count: { type: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { type: "SEARCH", createdAt: { gte: since }, query: { not: null } },
      select: { query: true },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.analyticsEvent.count({ where: { type: "NO_RESULT_SEARCH", createdAt: { gte: since } } }),
    prisma.quoteResponse.count({ where: { createdAt: { gte: since } } }),
  ]);

  return {
    totalBusinesses,
    publishedBusinesses,
    pendingBusinesses,
    totalUsers,
    openReports,
    pendingClaims,
    quoteRequests,
    providerResponses,
    noResultSearches,
    topByViews,
    eventTotals: topEvents.map((event) => ({ type: event.type, count: event._count.type })),
    searchQueries: searches.map((search) => search.query),
  };
}

export async function exportSnapshot() {
  const [businesses, users, reports, quoteRequests] = await Promise.all([
    prisma.business.findMany({ where: { deletedAt: null } }),
    prisma.user.findMany({
      select: { id: true, displayName: true, email: true, role: true, status: true, createdAt: true },
    }),
    prisma.report.findMany(),
    prisma.quoteRequest.findMany(),
  ]);
  return { generatedAt: new Date().toISOString(), businesses, users, reports, quoteRequests };
}
