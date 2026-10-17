import { prisma } from "@/lib/db";
import type { OfferingInput } from "@/lib/validation";

function offeringData(input: OfferingInput) {
  return {
    type: input.type,
    title: input.title,
    description: input.description || null,
    priceAmount: input.priceAmount ?? null,
    currency: input.currency || "GHS",
    priceLabel: input.priceLabel || null,
    availability: input.availability || null,
    deliveryNote: input.deliveryNote || null,
    actionUrl: input.actionUrl || null,
    sortOrder: input.sortOrder ?? 0,
  };
}

export async function listOfferings(businessId: string) {
  return prisma.offering.findMany({
    where: { businessId, deletedAt: null },
    include: { media: { orderBy: { sortOrder: "asc" } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function getOffering(offeringId: string) {
  return prisma.offering.findUnique({
    where: { id: offeringId },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          deletedAt: true,
          phone: true,
          whatsapp: true,
          email: true,
          website: true,
          deliveryOffered: true,
        },
      },
    },
  });
}

export async function createOffering(input: OfferingInput) {
  return prisma.offering.create({
    data: { ...offeringData(input), businessId: input.businessId },
  });
}

export async function updateOffering(offeringId: string, input: OfferingInput) {
  return prisma.offering.update({
    where: { id: offeringId },
    data: offeringData(input),
  });
}

export async function archiveOffering(offeringId: string) {
  return prisma.offering.update({
    where: { id: offeringId },
    data: { status: "ARCHIVED", deletedAt: new Date() },
  });
}

export async function reorderOfferings(businessId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.offering.updateMany({
        where: { id, businessId },
        data: { sortOrder: index },
      }),
    ),
  );
}
