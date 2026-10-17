import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type AuditInput = {
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
  correlationId?: string | null;
  ip?: string | null;
};

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditEvent.create({ data: input });
  } catch (error) {
    console.error("[audit] failed to record event", error);
  }
}
