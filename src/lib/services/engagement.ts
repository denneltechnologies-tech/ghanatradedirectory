import { prisma } from "@/lib/db";
import type { z } from "zod";
import type { reportSchema } from "@/lib/validation";
import type { CommentStatus } from "@/generated/prisma/enums";

const COMMENT_RATE_LIMIT = 5;
const COMMENT_RATE_WINDOW_MS = 10 * 60 * 1000;
const COMMENT_EDIT_WINDOW_MS = 30 * 60 * 1000;

export async function getLikeState(businessId: string, userId?: string | null) {
  const [count, like] = await Promise.all([
    prisma.like.count({ where: { businessId } }),
    userId
      ? prisma.like.findUnique({
          where: { userId_businessId: { userId, businessId } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  return { count, liked: Boolean(like) };
}

export async function toggleLike(businessId: string, userId: string) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, status: "PUBLISHED", deletedAt: null },
    select: { id: true },
  });
  if (!business) throw new Error("NOT_FOUND");

  const existing = await prisma.like.findUnique({
    where: { userId_businessId: { userId, businessId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({ data: { userId, businessId } });
  }

  return getLikeState(businessId, userId);
}

export async function listComments(
  businessId: string,
  options: { page?: number; perPage?: number; includeModerated?: boolean } = {},
) {
  const page = Math.max(1, options.page ?? 1);
  const perPage = Math.min(50, Math.max(1, options.perPage ?? 10));
  const where = {
    businessId,
    ...(options.includeModerated ? {} : { status: "VISIBLE" as CommentStatus }),
  };

  const [items, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      include: { author: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.comment.count({ where }),
  ]);

  return { items, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function createComment(input: {
  businessId: string;
  authorId: string;
  body: string;
  parentId?: string;
}) {
  const business = await prisma.business.findFirst({
    where: { id: input.businessId, status: "PUBLISHED", deletedAt: null },
    select: { id: true, name: true, slug: true, ownerId: true },
  });
  if (!business) throw new Error("NOT_FOUND");

  const recent = await prisma.comment.count({
    where: {
      authorId: input.authorId,
      createdAt: { gte: new Date(Date.now() - COMMENT_RATE_WINDOW_MS) },
    },
  });
  if (recent >= COMMENT_RATE_LIMIT) throw new Error("RATE_LIMITED");

  const comment = await prisma.comment.create({
    data: {
      businessId: input.businessId,
      authorId: input.authorId,
      body: input.body,
      parentId: input.parentId || null,
    },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return comment;
}

export async function updateOwnComment(commentId: string, authorId: string, body: string) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.authorId !== authorId) throw new Error("FORBIDDEN");
  if (Date.now() - comment.createdAt.getTime() > COMMENT_EDIT_WINDOW_MS) {
    throw new Error("EDIT_WINDOW_CLOSED");
  }
  return prisma.comment.update({
    where: { id: commentId },
    data: { body, editedAt: new Date() },
  });
}

export async function softDeleteOwnComment(commentId: string, authorId: string) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.authorId !== authorId) throw new Error("FORBIDDEN");
  return prisma.comment.update({
    where: { id: commentId },
    data: { status: "REMOVED", deletedAt: new Date(), body: "[removed by author]" },
  });
}

export async function moderateComment(input: {
  commentId: string;
  actorId: string;
  status: CommentStatus;
  note?: string;
}) {
  const comment = await prisma.comment.findUnique({ where: { id: input.commentId } });
  if (!comment) throw new Error("NOT_FOUND");

  const action =
    input.status === "VISIBLE"
      ? "RESTORE_COMMENT"
      : input.status === "HIDDEN"
        ? "HIDE_COMMENT"
        : "REMOVE_COMMENT";

  const [updated] = await prisma.$transaction([
    prisma.comment.update({
      where: { id: input.commentId },
      data: { status: input.status },
    }),
    prisma.moderationEvent.create({
      data: {
        action,
        targetType: "COMMENT",
        targetId: input.commentId,
        businessId: comment.businessId,
        actorId: input.actorId,
        commentId: input.commentId,
        note: input.note ?? null,
      },
    }),
  ]);

  return updated;
}

export async function reportContent(
  input: z.infer<typeof reportSchema>,
  reporterId?: string | null,
) {
  let businessId = input.businessId || null;

  if (input.targetType === "BUSINESS" || input.targetType === "LOGISTICS_PROVIDER") {
    businessId = input.targetId;
  } else if (input.targetType === "OFFERING") {
    const offering = await prisma.offering.findUnique({
      where: { id: input.targetId },
      select: { businessId: true },
    });
    businessId = offering?.businessId ?? null;
  } else if (input.targetType === "COMMENT") {
    const comment = await prisma.comment.findUnique({
      where: { id: input.targetId },
      select: { businessId: true },
    });
    businessId = comment?.businessId ?? null;
  }

  return prisma.report.create({
    data: {
      targetType: input.targetType,
      targetId: input.targetId,
      businessId,
      reporterId: reporterId ?? null,
      reason: input.reason,
      detail: input.detail || null,
      status: "OPEN",
    },
  });
}
