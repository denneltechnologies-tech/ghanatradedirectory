"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { errorState, formToObject, successState, type ActionState } from "@/lib/actions";
import { businessSchema, claimSchema } from "@/lib/validation";
import {
  archiveBusiness,
  createBusiness,
  submitBusinessForReview,
  updateBusiness,
} from "@/lib/services/businesses";
import { submitClaim } from "@/lib/services/claims";
import { saveImage } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { assertCanManageBusiness } from "@/lib/permissions";
import { trackEvent } from "@/lib/analytics";

export async function createBusinessAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    return errorState(error);
  }

  let input;
  try {
    input = businessSchema.parse(formToObject(formData));
  } catch (error) {
    return errorState(error);
  }

  const business = await createBusiness(user.id, input);
  revalidatePath("/dashboard");
  redirect(`/dashboard/businesses/${business.id}?created=1`);
}

export async function updateBusinessAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    return errorState(error);
  }

  const businessId = String(formData.get("businessId") ?? "");
  try {
    await assertCanManageBusiness(user, businessId);
  } catch (error) {
    return errorState(error);
  }

  let input;
  try {
    input = businessSchema.parse(formToObject(formData));
  } catch (error) {
    return errorState(error);
  }

  await updateBusiness(businessId, input);
  revalidatePath(`/dashboard/businesses/${businessId}`);
  return successState("Listing saved. Changes to a published profile return to review.");
}

export async function submitForReviewAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const businessId = String(formData.get("businessId") ?? "");
  await assertCanManageBusiness(user, businessId);
  await submitBusinessForReview(businessId);
  revalidatePath(`/dashboard/businesses/${businessId}`);
}

export async function archiveBusinessAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const businessId = String(formData.get("businessId") ?? "");
  await assertCanManageBusiness(user, businessId);
  await archiveBusiness(businessId);
  redirect("/dashboard");
}

export async function claimBusinessAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    return errorState(error);
  }

  let input;
  try {
    input = claimSchema.parse(formToObject(formData));
  } catch (error) {
    return errorState(error);
  }

  try {
    await submitClaim({ ...input, claimantId: user.id });
  } catch (error) {
    return errorState(error);
  }

  revalidatePath(`/businesses`);
  return successState("Claim submitted. A moderator will review your evidence.");
}

export async function uploadBusinessMediaAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const businessId = String(formData.get("businessId") ?? "");
  const kind = String(formData.get("kind") ?? "OTHER");
  await assertCanManageBusiness(user, businessId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/dashboard/businesses/${businessId}?media=missing`);
  }

  try {
    const saved = await saveImage(file);
    if (kind === "LOGO") {
      await prisma.media.deleteMany({ where: { businessId, kind: "LOGO" } });
    }
    if (kind === "COVER") {
      await prisma.media.deleteMany({ where: { businessId, kind: "COVER" } });
    }
    await prisma.media.create({
      data: {
        businessId,
        kind: kind === "LOGO" || kind === "COVER" ? kind : "OTHER",
        storageKey: saved.storageKey,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        status: "APPROVED",
      },
    });
    await prisma.business.update({
      where: { id: businessId },
      data:
        kind === "LOGO"
          ? { logoKey: saved.storageKey }
          : kind === "COVER"
            ? { coverKey: saved.storageKey }
            : {},
    });
  } catch {
    redirect(`/dashboard/businesses/${businessId}?media=error`);
  }

  revalidatePath(`/dashboard/businesses/${businessId}`);
  redirect(`/dashboard/businesses/${businessId}?media=ok`);
}

export async function deleteBusinessMediaAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const businessId = String(formData.get("businessId") ?? "");
  const mediaId = String(formData.get("mediaId") ?? "");
  await assertCanManageBusiness(user, businessId);

  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (media && media.businessId === businessId) {
    await prisma.media.delete({ where: { id: mediaId } });
    await prisma.business.update({
      where: { id: businessId },
      data:
        media.kind === "LOGO"
          ? { logoKey: null }
          : media.kind === "COVER"
            ? { coverKey: null }
            : {},
    });
  }
  revalidatePath(`/dashboard/businesses/${businessId}`);
}

export async function trackContactClickAction(input: {
  businessId: string;
  channel: string;
  offeringId?: string;
}): Promise<void> {
  const user = await requireUser().catch(() => null);
  await trackEvent({
    type:
      input.channel === "whatsapp"
        ? "WHATSAPP_CLICK"
        : input.channel === "email"
          ? "EMAIL_CLICK"
          : input.channel === "website"
            ? "WEBSITE_CLICK"
            : input.channel === "order"
              ? "ORDER_CLICK"
              : "CONTACT_CLICK",
    businessId: input.businessId,
    offeringId: input.offeringId ?? null,
    userId: user?.id ?? null,
    channel: input.channel,
  });
}
