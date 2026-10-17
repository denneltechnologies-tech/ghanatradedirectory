"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createDistrict,
  deleteBusiness,
  deleteDistrict,
  resolveReport,
  setUserStatus,
  superAdminCreateBusiness,
  toggleCategoryActive,
  updateBusinessDetails,
  upsertCategory,
} from "@/lib/services/admin";
import { discoverAccurateLogo } from "@/lib/services/logo-discovery";
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

export async function quickApproveBusinessAction(formData: FormData): Promise<void> {
  const user = await staffActor();
  const businessId = String(formData.get("businessId") ?? "");

  await prisma.business.update({
    where: { id: businessId },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      lastUpdatedAt: new Date(),
    },
  });

  await prisma.moderationEvent.create({
    data: {
      action: "APPROVE_BUSINESS",
      targetType: "BUSINESS",
      targetId: businessId,
      businessId,
      actorId: user.id,
      note: "Approved by Super Administrator",
    },
  });

  await logAudit({
    actorId: user.id,
    action: "BUSINESS_QUICK_APPROVED",
    targetType: "BUSINESS",
    targetId: businessId,
  });

  revalidatePath("/admin/businesses");
  revalidatePath("/admin");
  revalidatePath("/search");
  revalidatePath("/");
}

export async function deleteBusinessAction(formData: FormData): Promise<void> {
  const user = await staffActor();
  const businessId = String(formData.get("businessId") ?? "");
  const note = String(formData.get("note") ?? "Removed by Super Administrator");

  await deleteBusiness(businessId, user.id, note);

  await logAudit({
    actorId: user.id,
    action: "BUSINESS_DELETED",
    targetType: "BUSINESS",
    targetId: businessId,
    metadata: { note },
  });

  revalidatePath("/admin/businesses");
  revalidatePath("/admin");
  revalidatePath("/search");
  revalidatePath("/");
}

export async function updateBusinessLogoAction(formData: FormData): Promise<void> {
  const user = await staffActor();
  const businessId = String(formData.get("businessId") ?? "");
  const logoUrl = String(formData.get("logoUrl") ?? "").trim();

  await updateBusinessDetails(businessId, { logoKey: logoUrl || undefined });

  await logAudit({
    actorId: user.id,
    action: "BUSINESS_LOGO_UPDATED",
    targetType: "BUSINESS",
    targetId: businessId,
    metadata: { logoUrl },
  });

  revalidatePath("/admin/businesses");
  revalidatePath("/search");
  revalidatePath("/");
}

export async function fetchAccurateLogoAction(formData: FormData): Promise<void> {
  const user = await staffActor();
  const businessId = String(formData.get("businessId") ?? "");

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true, website: true },
  });
  if (!business) throw new Error("NOT_FOUND");

  const result = await discoverAccurateLogo(business.name, business.website);
  if (result.logoUrl || result.website) {
    await prisma.business.update({
      where: { id: businessId },
      data: {
        ...(result.logoUrl ? { logoKey: result.logoUrl } : {}),
        ...(result.website && !business.website ? { website: result.website } : {}),
        lastUpdatedAt: new Date(),
      },
    });

    await logAudit({
      actorId: user.id,
      action: "BUSINESS_LOGO_DISCOVERED",
      targetType: "BUSINESS",
      targetId: businessId,
      metadata: { logoUrl: result.logoUrl, source: result.source },
    });
  }

  revalidatePath("/admin/businesses");
  revalidatePath("/search");
  revalidatePath("/");
}

export async function superAdminCreateBusinessAction(formData: FormData): Promise<void> {
  const user = await staffActor();
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const longDescription = String(formData.get("longDescription") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  let logoKey = String(formData.get("logoKey") ?? "").trim();
  const regionId = String(formData.get("regionId") ?? "").trim() || undefined;
  const districtId = String(formData.get("districtId") ?? "").trim() || undefined;
  const locality = String(formData.get("locality") ?? "").trim() || undefined;
  const address = String(formData.get("address") ?? "").trim() || undefined;
  const featured = formData.get("featured") === "true" || formData.get("featured") === "on";
  const verificationLevel = String(formData.get("verificationLevel") ?? "CAC_REGULATOR_ACCREDITED") as VerificationLevel;
  const status = (String(formData.get("status") ?? "PUBLISHED") as BusinessStatus) || "PUBLISHED";

  if (!name || !categoryId || !description) {
    throw new Error("Please fill in business name, sector, and description.");
  }

  if (!logoKey && website) {
    const discovered = await discoverAccurateLogo(name, website);
    if (discovered.logoUrl) {
      logoKey = discovered.logoUrl;
    }
  }

  const created = await superAdminCreateBusiness({
    name,
    categoryId,
    description,
    longDescription: longDescription || undefined,
    phone: phone || undefined,
    whatsapp: whatsapp || undefined,
    email: email || undefined,
    website: website || undefined,
    logoKey: logoKey || undefined,
    regionId,
    districtId,
    locality,
    address,
    featured,
    verificationLevel,
    status,
    actorId: user.id,
  });

  await logAudit({
    actorId: user.id,
    action: "SUPER_ADMIN_CREATE_BUSINESS",
    targetType: "BUSINESS",
    targetId: created.id,
    metadata: { name, slug: created.slug },
  });

  revalidatePath("/admin/businesses");
  revalidatePath("/admin");
  revalidatePath("/search");
  revalidatePath("/");

  redirect("/admin/businesses");
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
