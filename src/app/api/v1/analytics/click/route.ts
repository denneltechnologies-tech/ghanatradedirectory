import type { NextRequest } from "next/server";
import { ApiException, apiUser, ok, parseJson, withApi } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import type { AnalyticsEventType } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const CHANNEL_EVENTS: Record<string, AnalyticsEventType> = {
  whatsapp: "WHATSAPP_CLICK",
  call: "CONTACT_CLICK",
  phone: "CONTACT_CLICK",
  email: "EMAIL_CLICK",
  website: "WEBSITE_CLICK",
  order: "ORDER_CLICK",
};

type ClickBody = {
  businessId?: string;
  offeringId?: string;
  channel?: string;
};

export const POST = withApi(async (request: NextRequest) => {
  const body = await parseJson<ClickBody>(request);
  if (!body.businessId) {
    throw new ApiException(400, "MISSING_BUSINESS", "businessId is required.");
  }

  const channel = (body.channel ?? "call").toLowerCase();
  const type = CHANNEL_EVENTS[channel] ?? "CONTACT_CLICK";
  const user = await apiUser();

  await trackEvent({
    type,
    businessId: body.businessId,
    offeringId: body.offeringId ?? null,
    channel,
    userId: user?.id ?? null,
  });

  return ok({ recorded: true });
});
