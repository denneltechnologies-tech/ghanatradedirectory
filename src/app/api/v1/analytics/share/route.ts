import type { NextRequest } from "next/server";
import { ok, parseJson, withApi } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

type ShareBody = {
  businessId?: string;
  offeringId?: string;
  channel?: string;
};

export const POST = withApi(async (request: NextRequest) => {
  const body = await parseJson<ShareBody>(request).catch(() => ({}) as ShareBody);

  await trackEvent({
    type: "SHARE",
    businessId: body.businessId ?? null,
    offeringId: body.offeringId ?? null,
    channel: body.channel ?? "native",
  });

  return ok({ recorded: true });
});
