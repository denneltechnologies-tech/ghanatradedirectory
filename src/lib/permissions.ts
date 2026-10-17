import { prisma } from "@/lib/db";
import type { UserModel } from "@/generated/prisma/models";

export type Actor = Pick<UserModel, "id" | "role" | "status"> | null | undefined;

export function isAuthenticated(actor: Actor): boolean {
  return Boolean(actor && actor.status === "ACTIVE");
}

export function isAdmin(actor: Actor): boolean {
  return isAuthenticated(actor) && actor!.role === "ADMIN";
}

export function isStaff(actor: Actor): boolean {
  return isAuthenticated(actor) && (actor!.role === "ADMIN" || actor!.role === "MODERATOR");
}

export function isLogisticsProvider(actor: Actor): boolean {
  return isAuthenticated(actor) && actor!.role === "LOGISTICS_PROVIDER";
}

export function isBusinessOwner(actor: Actor): boolean {
  return isAuthenticated(actor) && actor!.role === "BUSINESS_OWNER";
}

export async function canManageBusiness(
  actor: Actor,
  businessId: string,
): Promise<boolean> {
  if (!isAuthenticated(actor)) return false;
  if (isAdmin(actor)) return true;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { ownerId: true, members: { select: { userId: true } } },
  });
  if (!business) return false;

  return (
    business.ownerId === actor!.id ||
    business.members.some((member) => member.userId === actor!.id)
  );
}

export async function assertCanManageBusiness(actor: Actor, businessId: string) {
  const allowed = await canManageBusiness(actor, businessId);
  if (!allowed) throw new Error("FORBIDDEN");
}

export function canModerate(actor: Actor): boolean {
  return isStaff(actor);
}

export function assertStaff(actor: Actor) {
  if (!isStaff(actor)) throw new Error("FORBIDDEN");
}

export function assertAdmin(actor: Actor) {
  if (!isAdmin(actor)) throw new Error("FORBIDDEN");
}
