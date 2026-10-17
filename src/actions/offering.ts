"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { errorState, formToObject, successState, type ActionState } from "@/lib/actions";
import { offeringSchema } from "@/lib/validation";
import { assertCanManageBusiness } from "@/lib/permissions";
import { archiveOffering, createOffering, updateOffering } from "@/lib/services/offerings";
import { saveImage } from "@/lib/storage";
import { prisma } from "@/lib/db";

export async function createOfferingAction(
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
    input = offeringSchema.parse({ ...formToObject(formData), businessId });
  } catch (error) {
    return errorState(error);
  }

  await createOffering(input);
  revalidatePath(`/dashboard/businesses/${businessId}`);
  return successState("Offering added.");
}

export async function updateOfferingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    return errorState(error);
  }

  const offeringId = String(formData.get("offeringId") ?? "");
  const offering = await prisma.offering.findUnique({
    where: { id: offeringId },
    select: { businessId: true },
  });
  if (!offering) return { status: "error", message: "Offering not found." };

  try {
    await assertCanManageBusiness(user, offering.businessId);
  } catch (error) {
    return errorState(error);
  }

  let input;
  try {
    input = offeringSchema.parse({
      ...formToObject(formData),
      businessId: offering.businessId,
    });
  } catch (error) {
    return errorState(error);
  }

  await updateOffering(offeringId, input);
  revalidatePath(`/dashboard/businesses/${offering.businessId}`);
  return successState("Offering updated.");
}

export async function archiveOfferingAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const offeringId = String(formData.get("offeringId") ?? "");
  const offering = await prisma.offering.findUnique({
    where: { id: offeringId },
    select: { businessId: true },
  });
  if (!offering) redirect("/dashboard");
  await assertCanManageBusiness(user, offering.businessId);
  await archiveOffering(offeringId);
  revalidatePath(`/dashboard/businesses/${offering.businessId}`);
}

export async function uploadOfferingImageAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const offeringId = String(formData.get("offeringId") ?? "");
  const offering = await prisma.offering.findUnique({
    where: { id: offeringId },
    select: { businessId: true },
  });
  if (!offering) redirect("/dashboard");
  await assertCanManageBusiness(user, offering.businessId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/dashboard/businesses/${offering.businessId}?media=missing`);
  }

  try {
    const saved = await saveImage(file);
    await prisma.media.create({
      data: {
        offeringId,
        businessId: offering.businessId,
        kind: "OFFERING",
        storageKey: saved.storageKey,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        status: "APPROVED",
      },
    });
  } catch {
    redirect(`/dashboard/businesses/${offering.businessId}?media=error`);
  }

  revalidatePath(`/dashboard/businesses/${offering.businessId}`);
  redirect(`/dashboard/businesses/${offering.businessId}?media=ok`);
}
