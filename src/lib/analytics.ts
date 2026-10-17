import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { AnalyticsEventType } from "@/generated/prisma/enums";

export type TrackEventInput = {
  type: AnalyticsEventType;
  userId?: string | null;
  businessId?: string | null;
  offeringId?: string | null;
  logisticsProfileId?: string | null;
  quoteRequestId?: string | null;
  query?: string | null;
  sectorSlug?: string | null;
  regionSlug?: string | null;
  channel?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function trackEvent(input: TrackEventInput): Promise<void> {
  try {
    await prisma.analyticsEvent.create({ data: input });
  } catch (error) {
    console.error("[analytics] failed to record event", error);
  }
}
