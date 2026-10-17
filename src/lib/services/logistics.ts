import { prisma } from "@/lib/db";
import { notify } from "@/lib/services/notifications";
import type { Prisma } from "@/generated/prisma/client";
import type { ProviderProfileInput, QuoteRequestInput, QuoteResponseInput } from "@/lib/validation";
import type { QuoteRequestStatus } from "@/generated/prisma/enums";

export type ProviderFilter = {
  serviceType?: string;
  region?: string;
  coverage?: string;
  q?: string;
  page?: number;
  perPage?: number;
};

export async function upsertProviderProfile(userId: string, input: ProviderProfileInput) {
  const business = await prisma.business.findFirst({
    where: { id: input.businessId, deletedAt: null },
    select: { id: true },
  });
  if (!business) throw new Error("NOT_FOUND");

  const data = {
    description: input.description,
    serviceTypes: input.serviceTypes,
    coverage: input.coverage,
    baseRegionId: input.baseRegionId || null,
    baseDistrictId: input.baseDistrictId || null,
    namedRoutes: input.namedRoutes,
    vehicleTypes: input.vehicleTypes,
    capacityMinKg: input.capacityMinKg ?? null,
    capacityMaxKg: input.capacityMaxKg ?? null,
    operatingHours: input.operatingHours || null,
    trackingMethod: input.trackingMethod || null,
    insurancePolicy: input.insurancePolicy || null,
    responseHours: input.responseHours ?? null,
    contactChannel: input.contactChannel || null,
    active: input.active,
  };

  return prisma.logisticsProfile.upsert({
    where: { businessId: input.businessId },
    create: { ...data, businessId: input.businessId, userId },
    update: data,
  });
}

export async function getProviderProfileForUser(userId: string) {
  return prisma.logisticsProfile.findFirst({
    where: { userId },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          phone: true,
          whatsapp: true,
          email: true,
          description: true,
        },
      },
      baseRegion: { select: { name: true, slug: true } },
      baseDistrict: { select: { name: true } },
      serviceAreas: { include: { region: true, district: true } },
    },
  });
}

export function buildProviderWhere(filter: ProviderFilter): Prisma.LogisticsProfileWhereInput {
  const where: Prisma.LogisticsProfileWhereInput = {
    active: true,
    business: { status: "PUBLISHED", deletedAt: null },
  };

  if (filter.serviceType) {
    where.serviceTypes = { has: filter.serviceType as never };
  }
  if (filter.coverage) {
    where.coverage = { has: filter.coverage as never };
  }
  if (filter.region) {
    where.OR = [
      { baseRegion: { slug: filter.region } },
      { serviceAreas: { some: { region: { slug: filter.region } } } },
    ];
  }
  if (filter.q) {
    where.AND = [
      {
        OR: [
          { business: { name: { contains: filter.q, mode: "insensitive" } } },
          { description: { contains: filter.q, mode: "insensitive" } },
          { vehicleTypes: { has: filter.q } },
        ],
      },
    ];
  }

  return where;
}

export async function listProviders(filter: ProviderFilter) {
  const page = Math.max(1, filter.page ?? 1);
  const perPage = Math.min(48, Math.max(1, filter.perPage ?? 12));
  const where = buildProviderWhere(filter);

  const [items, total] = await Promise.all([
    prisma.logisticsProfile.findMany({
      where,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            phone: true,
            whatsapp: true,
            verificationLevel: true,
          },
        },
        baseRegion: { select: { name: true, slug: true } },
        _count: { select: { responses: true } },
      },
      orderBy: [{ business: { featured: "desc" } }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.logisticsProfile.count({ where }),
  ]);

  return { items, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getPublicProvider(slug: string) {
  return prisma.logisticsProfile.findFirst({
    where: { active: true, business: { slug, status: "PUBLISHED", deletedAt: null } },
    include: {
      business: true,
      baseRegion: { select: { name: true, slug: true } },
      baseDistrict: { select: { name: true } },
      serviceAreas: { include: { region: true, district: true } },
    },
  });
}

export async function createQuoteRequest(requesterId: string, input: QuoteRequestInput) {
  const profiles = await prisma.logisticsProfile.findMany({
    where: { id: { in: input.recipientProfileIds }, active: true },
    include: { business: { select: { id: true, name: true } } },
  });
  if (profiles.length === 0) throw new Error("NO_RECIPIENTS");

  const request = await prisma.quoteRequest.create({
    data: {
      requesterId,
      serviceType: input.serviceType,
      pickupRegionId: input.pickupRegionId,
      pickupDistrictId: input.pickupDistrictId || null,
      pickupDetails: input.pickupDetails,
      dropoffRegionId: input.dropoffRegionId,
      dropoffDistrictId: input.dropoffDistrictId || null,
      dropoffDetails: input.dropoffDetails,
      requestedDate: input.requestedDate ? new Date(input.requestedDate) : null,
      timeWindow: input.timeWindow || null,
      cargoType: input.cargoType || null,
      cargoDescription: input.cargoDescription || null,
      weightKg: input.weightKg ?? null,
      quantity: input.quantity ?? null,
      vehicleNeeds: input.vehicleNeeds || null,
      specialHandling: input.specialHandling || null,
      notes: input.notes || null,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail || null,
      consentShare: input.consentShare,
      consentAt: new Date(),
      status: "SENT",
      recipients: {
        create: profiles.map((profile) => ({ logisticsProfileId: profile.id })),
      },
    },
  });

  await Promise.all(
    profiles.map((profile) =>
      notify({
        userId: profile.userId,
        type: "QUOTE_REQUEST",
        title: "New quote request",
        body: `${input.pickupDetails} → ${input.dropoffDetails}`,
        link: "/dashboard/quotes",
      }),
    ),
  );

  return request;
}

export async function listRequestsForRequester(requesterId: string) {
  return prisma.quoteRequest.findMany({
    where: { requesterId },
    include: {
      pickupRegion: { select: { name: true } },
      dropoffRegion: { select: { name: true } },
      responses: {
        include: {
          logisticsProfile: { include: { business: { select: { name: true, slug: true } } } },
        },
      },
      _count: { select: { recipients: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listProviderInbox(userId: string) {
  const profile = await prisma.logisticsProfile.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return { profileId: null, requests: [] };

  const requests = await prisma.quoteRequest.findMany({
    where: { recipients: { some: { logisticsProfileId: profile.id } } },
    include: {
      requester: { select: { displayName: true, email: true } },
      pickupRegion: { select: { name: true } },
      pickupDistrict: { select: { name: true } },
      dropoffRegion: { select: { name: true } },
      dropoffDistrict: { select: { name: true } },
      responses: { where: { logisticsProfileId: profile.id } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { profileId: profile.id, requests };
}

export async function getQuoteRequestForActor(requestId: string, actor: { id: string; role: string }) {
  const request = await prisma.quoteRequest.findUnique({
    where: { id: requestId },
    include: {
      requester: { select: { id: true, displayName: true, email: true, phone: true } },
      pickupRegion: { select: { name: true } },
      pickupDistrict: { select: { name: true } },
      dropoffRegion: { select: { name: true } },
      dropoffDistrict: { select: { name: true } },
      recipients: {
        include: { logisticsProfile: { include: { business: { select: { name: true, slug: true } } } } },
      },
      responses: {
        include: {
          provider: { select: { displayName: true } },
          logisticsProfile: { include: { business: { select: { name: true, slug: true, phone: true, whatsapp: true } } } },
        },
      },
    },
  });
  if (!request) return null;

  const isRequester = request.requesterId === actor.id;
  const isStaff = actor.role === "ADMIN" || actor.role === "MODERATOR";
  const isRecipient = request.recipients.some((recipient) => recipient.logisticsProfile.userId === actor.id);

  if (!isRequester && !isStaff && !isRecipient) throw new Error("FORBIDDEN");
  return request;
}

export async function submitQuoteResponse(providerUserId: string, input: QuoteResponseInput) {
  const profile = await prisma.logisticsProfile.findFirst({
    where: { userId: providerUserId },
    select: { id: true },
  });
  if (!profile) throw new Error("NOT_FOUND");

  const recipient = await prisma.quoteRequestRecipient.findUnique({
    where: {
      quoteRequestId_logisticsProfileId: {
        quoteRequestId: input.quoteRequestId,
        logisticsProfileId: profile.id,
      },
    },
  });
  if (!recipient) throw new Error("FORBIDDEN");

  const request = await prisma.quoteRequest.findUnique({
    where: { id: input.quoteRequestId },
    select: { id: true, requesterId: true, status: true },
  });
  if (!request) throw new Error("NOT_FOUND");
  if (request.status === "CANCELLED" || request.status === "CLOSED") {
    throw new Error("REQUEST_CLOSED");
  }

  const data = {
    priceAmount: input.priceAmount ?? null,
    currency: input.currency || "GHS",
    inclusions: input.inclusions || null,
    estimatedPickup: input.estimatedPickup || null,
    estimatedDelivery: input.estimatedDelivery || null,
    terms: input.terms || null,
    validUntil: input.validUntil ? new Date(input.validUntil) : null,
    status: "SUBMITTED" as const,
  };

  const response = await prisma.quoteResponse.upsert({
    where: {
      quoteRequestId_logisticsProfileId: {
        quoteRequestId: input.quoteRequestId,
        logisticsProfileId: profile.id,
      },
    },
    create: { ...data, quoteRequestId: input.quoteRequestId, logisticsProfileId: profile.id, providerUserId },
    update: data,
  });

  if (request.status === "SENT") {
    await prisma.quoteRequest.update({
      where: { id: request.id },
      data: { status: "RESPONSES_RECEIVED" },
    });
  }

  await notify({
    userId: request.requesterId,
    type: "QUOTE_RESPONSE",
    title: "A provider replied with a quote",
    body: "Open your request to compare quotes and contact the provider.",
    link: `/quotes/${request.id}`,
  });

  return response;
}

export async function acceptQuoteResponse(responseId: string, requesterId: string) {
  const response = await prisma.quoteResponse.findUnique({
    where: { id: responseId },
    include: { quoteRequest: { select: { id: true, requesterId: true } } },
  });
  if (!response) throw new Error("NOT_FOUND");
  if (response.quoteRequest.requesterId !== requesterId) throw new Error("FORBIDDEN");

  await prisma.$transaction([
    prisma.quoteResponse.update({ where: { id: responseId }, data: { status: "ACCEPTED" } }),
    prisma.quoteResponse.updateMany({
      where: { quoteRequestId: response.quoteRequestId, id: { not: responseId } },
      data: { status: "DECLINED" },
    }),
    prisma.quoteRequest.update({
      where: { id: response.quoteRequestId },
      data: { status: "ACCEPTED" },
    }),
  ]);

  return response;
}

export async function updateRequestStatus(
  requestId: string,
  requesterId: string,
  status: QuoteRequestStatus,
) {
  const request = await prisma.quoteRequest.findUnique({
    where: { id: requestId },
    select: { requesterId: true },
  });
  if (!request) throw new Error("NOT_FOUND");
  if (request.requesterId !== requesterId) throw new Error("FORBIDDEN");

  return prisma.quoteRequest.update({ where: { id: requestId }, data: { status } });
}

export async function markInboxSeen(userId: string) {
  const profile = await prisma.logisticsProfile.findFirst({ where: { userId }, select: { id: true } });
  if (!profile) return;
  await prisma.quoteRequestRecipient.updateMany({
    where: { logisticsProfileId: profile.id, seenAt: null },
    data: { seenAt: new Date() },
  });
}
