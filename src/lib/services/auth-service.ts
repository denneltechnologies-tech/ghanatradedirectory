import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { createSession, hashPassword, hashToken, newOpaqueToken, verifyPassword } from "@/lib/auth";
import { env } from "@/lib/env";
import { notify } from "@/lib/services/notifications";
import type { RegisterInput } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export async function registerUser(input: RegisterInput) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new Error("EMAIL_IN_USE");

  const isConfiguredAdmin = env.adminEmails.includes(email);
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: input.displayName,
      phone: input.phone || null,
      role: isConfiguredAdmin ? "ADMIN" : input.role,
      consentAt: new Date(),
    },
  });

  await createSession(user.id);
  await notify({
    userId: user.id,
    type: "SYSTEM",
    title: "Welcome to Ghana Business Directory",
    body: "Browse trusted businesses or create a listing to be discovered.",
    link: "/dashboard",
  });
  await logAudit({ actorId: user.id, action: "USER_REGISTERED", targetType: "USER", targetId: user.id });

  return user;
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return null;
  if (user.status !== "ACTIVE") throw new Error("ACCOUNT_INACTIVE");

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  await logAudit({ actorId: user.id, action: "USER_SIGNED_IN", targetType: "USER", targetId: user.id });

  return user;
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return null;

  const token = newOpaqueToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  return { user, token };
}

export async function resetPassword(token: string, password: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw new Error("INVALID_TOKEN");
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  await logAudit({ actorId: record.userId, action: "PASSWORD_RESET", targetType: "USER", targetId: record.userId });
  return record.userId;
}

export async function updateOwnProfile(
  userId: string,
  input: { displayName: string; phone?: string; password?: string },
) {
  const data: { displayName: string; phone: string | null; passwordHash?: string } = {
    displayName: input.displayName,
    phone: input.phone || null,
  };
  if (input.password) {
    data.passwordHash = await hashPassword(input.password);
  }
  return prisma.user.update({ where: { id: userId }, data });
}

export async function deactivateAccount(userId: string) {
  const anonymizedEmail = `deactivated-${createHash("sha1").update(userId).digest("hex").slice(0, 12)}@removed.local`;
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId } }),
    prisma.business.updateMany({
      where: { ownerId: userId },
      data: { status: "ARCHIVED", deletedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        status: "DEACTIVATED",
        email: anonymizedEmail,
        displayName: "Deactivated account",
        phone: null,
        passwordHash: await hashPassword(newOpaqueToken()),
      },
    }),
  ]);
  await logAudit({ actorId: userId, action: "ACCOUNT_DEACTIVATED", targetType: "USER", targetId: userId });
}
