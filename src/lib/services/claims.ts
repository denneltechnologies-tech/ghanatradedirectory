import { prisma } from "@/lib/db";
import { notify } from "@/lib/services/notifications";
import { addBusinessMember } from "@/lib/services/businesses";
import type { ClaimStatus } from "@/generated/prisma/enums";

export async function submitClaim(input: {
  businessId: string;
  claimantId: string;
  evidence: string;
  contactPhone?: string;
}) {
  const business = await prisma.business.findUnique({
    where: { id: input.businessId },
    select: { id: true, name: true },
  });
  if (!business) throw new Error("NOT_FOUND");

  const existing = await prisma.claim.findFirst({
    where: { businessId: input.businessId, claimantId: input.claimantId, status: "PENDING" },
    select: { id: true },
  });
  if (existing) throw new Error("CLAIM_PENDING");

  const claim = await prisma.claim.create({
    data: {
      businessId: input.businessId,
      claimantId: input.claimantId,
      evidence: input.evidence,
      contactPhone: input.contactPhone || null,
      status: "PENDING",
    },
  });

  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MODERATOR"] }, status: "ACTIVE" },
    select: { id: true },
  });
  await Promise.all(
    staff.map((member) =>
      notify({
        userId: member.id,
        type: "CLAIM_STATUS",
        title: "New listing claim",
        body: `${business.name} was claimed and needs review.`,
        link: "/admin/claims",
      }),
    ),
  );

  return claim;
}

export async function listClaimsForUser(userId: string) {
  return prisma.claim.findMany({
    where: { claimantId: userId },
    include: { business: { select: { name: true, slug: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function decideClaim(input: {
  claimId: string;
  actorId: string;
  decision: ClaimStatus;
  note?: string;
}) {
  const claim = await prisma.claim.findUnique({
    where: { id: input.claimId },
    include: { business: { select: { id: true, name: true, ownerId: true } } },
  });
  if (!claim) throw new Error("NOT_FOUND");
  if (claim.status !== "PENDING") throw new Error("ALREADY_DECIDED");

  const approved = input.decision === "APPROVED";

  const updated = await prisma.claim.update({
    where: { id: claim.id },
    data: {
      status: input.decision,
      reviewedById: input.actorId,
      reviewedAt: new Date(),
      decisionNote: input.note || null,
    },
  });

  if (approved) {
    await addBusinessMember(claim.businessId, claim.claimantId);
    const hasVerification = await prisma.verificationEvent.findFirst({
      where: { businessId: claim.businessId, level: "CONTACT_CONFIRMED" },
      select: { id: true },
    });
    if (!hasVerification) {
      await prisma.$transaction([
        prisma.verificationEvent.create({
          data: {
            businessId: claim.businessId,
            actorId: input.actorId,
            level: "CONTACT_CONFIRMED",
            evidence: claim.evidence,
            note: "Approved listing claim",
          },
        }),
        prisma.business.update({
          where: { id: claim.businessId },
          data: { verificationLevel: "CONTACT_CONFIRMED", verifiedAt: new Date() },
        }),
      ]);
    }
  }

  await prisma.moderationEvent.create({
    data: {
      action: approved ? "APPROVE_CLAIM" : "REJECT_CLAIM",
      targetType: "CLAIM",
      targetId: claim.id,
      businessId: claim.businessId,
      actorId: input.actorId,
      note: input.note || null,
    },
  });

  await notify({
    userId: claim.claimantId,
    type: "CLAIM_STATUS",
    title: approved ? "Claim approved" : "Claim not approved",
    body: approved
      ? `You can now manage ${claim.business.name}.`
      : `Your claim for ${claim.business.name} was reviewed. ${input.note ?? ""}`.trim(),
    link: "/dashboard",
  });

  return updated;
}

export async function getClaimQueue() {
  return prisma.claim.findMany({
    where: { status: "PENDING" },
    include: {
      business: { select: { id: true, name: true, slug: true, status: true, ownerId: true } },
      claimant: { select: { id: true, displayName: true, email: true, phone: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}
