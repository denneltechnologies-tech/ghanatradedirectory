"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createDistrict,
  deleteDistrict,
  resolveReport,
  setUserStatus,
  toggleCategoryActive,
  upsertCategory,
} from "@/lib/services/admin";
import { categorySchema, claimDecisionSchema, districtSchema } from "@/lib/validation";
import { decideClaim } from "@/lib/services/claims";
import { prisma } from "@/lib/db";
import type {
  BusinessStatus,
  ClaimStatus,
  ReportStatus,
  UserStatus,
  VerificationLevel,
} from "@/generated/prisma/enums";

async function staffActor() {
  const user = await requireUser();
  if (!isStaff(user)) throw new Error("FORBIDDEN");
  return user;
}

export async function setBusinessStatusAction(formData: FormData): Promise<void> {
  const user = await staffActor();
  const businessId = String(formData.get("businessId") ?? "");
  const status = String(formData.get("status") ?? "") as BusinessStatus;
  const note = String(formData.get("note") ?? "") || undefined;

  const allowed: BusinessStatus[] = [
    "PUBLISHED",
    "REJECTED",
    "SUSPENDED",
    "ARCHIVED",
    "PENDING_REVIEW",
  ];
  if (!allowed.includes(status)) throw new Error("FORBIDDEN");

  await prisma.business.update({
    where: { id: businessId },
    data: {
      status,
      ...(status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
      lastUpdatedAt: new Date(),
    },
  });

  await prisma.moderationEvent.create({
    data: {
      action:
        status === "PUBLISHED"
          ? "APPROVE_BUSINESS"
          : status === "REJECTED"
            ? "REJECT_BUSINESS"
            : status === "SUSPENDED"
              ? "SUSPEND_BUSINESS"
              : status === "ARCHIVED"
                ? "ARCHIVE_BUSINESS"
                : "RESTORE_BUSINESS",
      targetType: "BUSINESS",
      targetId: businessId,
      businessId,
      actorId: user.id,
      note: note ?? null,
    },
  });

  await logAudit({
    actorId: user.id,
    action: `BUSINESS_${status}`,
    targetType: "BUSINESS",
    targetId: businessId,
    metadata: note ? { note } : undefined,
  });

  revalidatePath("/admin/businesses");
  revalidatePath("/admin");
  revalidatePath("/search");
}

export async function setVerificationAction(formData: FormData): Promise<void> {
  const user = await staffActor();
  const businessId = String(formData.get("businessId") ?? "");
  const level = String(formData.get("level") ?? "UNVERIFIED") as VerificationLevel;
  const evidence = String(formData.get("evidence") ?? "") || undefined;

  await prisma.$transaction([
    prisma.business.update({
      where: { id: businessId },
      data: {
        verificationLevel: level,
        verifiedAt: level === "UNVERIFIED" ? null : new Date(),
      },
    }),
    prisma.verificationEvent.create({
      data: { businessId, actorId: user.id, level, evidence: evidence ?? null },
    }),
  ]);

  await logAudit({
    actorId: user.id,
    action: `BUSINESS_VERIFIED_${level}`,
    targetType: "BUSINESS",
    targetId: businessId,
  });

  revalidatePath("/admin/businesses");
  revalidatePath("/admin");
}

export async function featureBusinessAction(formData: FormData): Promise<void> {
  const user = await staffActor();
  const businessId = String(formData.get("businessId") ?? "");
  const featured = String(formData.get("featured") ?? "false") === "true";

  await prisma.$transaction([
    prisma.business.update({ where: { id: businessId }, data: { featured } }),
    prisma.moderationEvent.create({
      data: {
        action: featured ? "FEATURE_BUSINESS" : "UNFEATURE_BUSINESS",
        targetType: "BUSINESS",
        targetId: businessId,
        businessId,
        actorId: user.id,
      },
    }),
  ]);

  revalidatePath("/admin/businesses");
  revalidatePath("/");
}

export async function decideClaimAction(formData: FormData): Promise<void> {
  const user = await staffActor();
  const input = claimDecisionSchema.parse({
    claimId: formData.get("claimId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? undefined,
  }) as { claimId: string; decision: ClaimStatus; note?: string };

  await decideClaim({
    claimId: input.claimId,
    actorId: user.id,
    decision: input.decision,
    note: input.note,
  });

  await logAudit({
    actorId: user.id,
    action: `CLAIM_${input.decision}`,
    targetType: "CLAIM",
    targetId: input.claimId,
  });

  revalidatePath("/admin/claims");
}

export async function resolveReportAction(formData: FormData): Promise<void> {
  const user = await staffActor();
  const reportId = String(formData.get("reportId") ?? "");
  const status = String(formData.get("status") ?? "RESOLVED") as ReportStatus;
  const note = String(formData.get("note") ?? "") || undefined;

  if (!["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"].includes(status)) {
    throw new Error("FORBIDDEN");
  }

  await resolveReport({ reportId, actorId: user.id, status, note });
  await logAudit({
    actorId: user.id,
    action: `REPORT_${status}`,
    targetType: "REPORT",
    targetId: reportId,
  });

  revalidatePath("/admin/reports");
}

export async function upsertCategoryAction(formData: FormData): Promise<void> {
  const user = await staffActor();
  const input = categorySchema.parse({
    id: formData.get("id") ?? undefined,
    name: formData.get("name"),
    parentId: formData.get("parentId") ?? undefined,
    icon: formData.get("icon") ?? undefined,
    description: formData.get("description") ?? undefined,
    active: formData.get("active") ?? "on",
    featured: formData.get("featured"),
    sortOrder: formData.get("sortOrder") ?? 0,
  });

  await upsertCategory(input);
  await logAudit({
    actorId: user.id,
    action: input.id ? "CATEGORY_UPDATED" : "CATEGORY_CREATED",
    targetType: "CATEGORY",
    targetId: input.id ?? null,
  });

  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function toggleCategoryAction(formData: FormData): Promise<void> {
  const user = await staffActor();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "true") === "true";
  await toggleCategoryActive(id, active);
  await logAudit({
    actorId: user.id,
    action: active ? "CATEGORY_ENABLED" : "CATEGORY_DISABLED",
    targetType: "CATEGORY",
    targetId: id,
  });
  revalidatePath("/admin/categories");
}

export async function createDistrictAction(formData: FormData): Promise<void> {
  const user = await staffActor();
  const input = districtSchema.parse({
    regionId: formData.get("regionId"),
    name: formData.get("name"),
    kind: formData.get("kind") ?? undefined,
  });
  await createDistrict(input);
  await logAudit({ actorId: user.id, action: "DISTRICT_CREATED", targetType: "DISTRICT" });
  revalidatePath("/admin/locations");
}

export async function deleteDistrictAction(formData: FormData): Promise<void> {
  const user = await staffActor();
  const id = String(formData.get("id") ?? "");
  await deleteDistrict(id);
  await logAudit({
    actorId: user.id,
    action: "DISTRICT_DELETED",
    targetType: "DISTRICT",
    targetId: id,
  });
  revalidatePath("/admin/locations");
}

export async function setUserStatusAction(formData: FormData): Promise<void> {
  const user = await staffActor();
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "ACTIVE") as UserStatus;
  if (userId === user.id) throw new Error("FORBIDDEN");
  await setUserStatus({ userId, actorId: user.id, status });
  revalidatePath("/admin/users");
}
