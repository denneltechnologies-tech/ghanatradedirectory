"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { errorState, formToObject, successState, type ActionState } from "@/lib/actions";
import { providerProfileSchema, quoteRequestSchema, quoteResponseSchema } from "@/lib/validation";
import { assertCanManageBusiness } from "@/lib/permissions";
import {
  acceptQuoteResponse,
  createQuoteRequest,
  submitQuoteResponse,
  updateRequestStatus,
  upsertProviderProfile,
} from "@/lib/services/logistics";
import { trackEvent } from "@/lib/analytics";

export async function upsertProviderAction(
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
    input = providerProfileSchema.parse({ ...formToObject(formData), businessId });
  } catch (error) {
    return errorState(error);
  }

  await upsertProviderProfile(user.id, input);
  revalidatePath("/dashboard/logistics");
  revalidatePath("/logistics");
  redirect("/dashboard/logistics?saved=1");
}

export async function quoteRequestAction(
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
    input = quoteRequestSchema.parse(formToObject(formData));
  } catch (error) {
    return errorState(error);
  }

  let request;
  try {
    request = await createQuoteRequest(user.id, input);
  } catch (error) {
    return errorState(error);
  }

  await trackEvent({
    type: "QUOTE_REQUEST_SUBMITTED",
    userId: user.id,
    quoteRequestId: request.id,
    metadata: { serviceType: input.serviceType, recipients: input.recipientProfileIds.length },
  });

  redirect(`/quotes/${request.id}?sent=1`);
}

export async function quoteResponseAction(
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
    input = quoteResponseSchema.parse(formToObject(formData));
  } catch (error) {
    return errorState(error);
  }

  try {
    await submitQuoteResponse(user.id, input);
  } catch (error) {
    return errorState(error);
  }

  revalidatePath("/dashboard/quotes");
  revalidatePath(`/quotes/${input.quoteRequestId}`);
  return successState("Quote submitted. The customer can now see your response.");
}

export async function acceptQuoteAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const responseId = String(formData.get("responseId") ?? "");
  const requestId = String(formData.get("requestId") ?? "");
  await acceptQuoteResponse(responseId, user.id);
  revalidatePath(`/quotes/${requestId}`);
}

export async function cancelQuoteRequestAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const requestId = String(formData.get("requestId") ?? "");
  await updateRequestStatus(requestId, user.id, "CANCELLED");
  revalidatePath(`/quotes/${requestId}`);
  revalidatePath("/dashboard/quotes");
}

export async function closeQuoteRequestAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const requestId = String(formData.get("requestId") ?? "");
  await updateRequestStatus(requestId, user.id, "CLOSED");
  revalidatePath(`/quotes/${requestId}`);
  revalidatePath("/dashboard/quotes");
}
