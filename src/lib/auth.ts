import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { env, SESSION_TTL_DAYS } from "@/lib/env";
import type { UserModel } from "@/generated/prisma/models";

const BCRYPT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return compare(plain, passwordHash);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function requestMeta(): Promise<{ userAgent?: string; ip?: string }> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return {
    userAgent: headerList.get("user-agent") ?? undefined,
    ip: forwarded?.split(",")[0]?.trim() ?? undefined,
  };
}

export async function createSession(userId: string): Promise<string> {
  const token = newOpaqueToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  const meta = await requestMeta();

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      userAgent: meta.userAgent,
      ip: meta.ip,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(env.sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.sessionCookie)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(env.sessionCookie);
}

export const getCurrentUser = cache(async (): Promise<UserModel | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.sessionCookie)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  if (session.user.status !== "ACTIVE") return null;

  return session.user;
});

export async function requireUser(): Promise<UserModel> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function requirePageUser(nextPath?: string): Promise<UserModel> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  return user;
}

export async function pruneExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
