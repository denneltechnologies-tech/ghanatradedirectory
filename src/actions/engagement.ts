"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { errorState, formToObject, successState, type ActionState } from "@/lib/actions";
import { commentSchema, reportSchema } from "@/lib/validation";
import {
  createComment,
  moderateComment,
  reportContent,
  softDeleteOwnComment,
  updateOwnComment,
} from "@/lib/services/engagement";
import { isStaff } from "@/lib/permissions";
import type { CommentStatus } from "@/generated/prisma/enums";

function revalidatePathFromForm(formData: FormData) {
  const path = String(formData.get("path") ?? "");
  if (path.startsWith("/")) revalidatePath(path);
}

export async function createCommentAction(
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
    input = commentSchema.parse(formToObject(formData));
  } catch (error) {
    return errorState(error);
  }

  try {
    await createComment({
      businessId: input.businessId,
      authorId: user.id,
      body: input.body,
      parentId: input.parentId,
    });
  } catch (error) {
    return errorState(error);
  }

  revalidatePathFromForm(formData);
  return successState("Comment posted.");
}

export async function updateCommentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    return errorState(error);
  }

  const commentId = String(formData.get("commentId") ?? "");
  const body = String(formData.get("body") ?? "");
  if (body.trim().length < 2 || body.length > 1000) {
    return { status: "error", message: "Comments must be 2-1000 characters." };
  }

  try {
    await updateOwnComment(commentId, user.id, body.trim());
  } catch (error) {
    return errorState(error);
  }

  revalidatePathFromForm(formData);
  return successState("Comment updated.");
}

export async function deleteCommentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const commentId = String(formData.get("commentId") ?? "");
  await softDeleteOwnComment(commentId, user.id);
  revalidatePathFromForm(formData);
}

export async function reportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return { status: "error", message: "Please sign in to report content." };
  }

  let input;
  try {
    input = reportSchema.parse(formToObject(formData));
  } catch (error) {
    return errorState(error);
  }

  await reportContent(input, user.id);
  return successState("Thanks. A moderator will review this report.");
}

export async function moderateCommentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!isStaff(user)) throw new Error("FORBIDDEN");

  const commentId = String(formData.get("commentId") ?? "");
  const status = String(formData.get("status") ?? "VISIBLE") as CommentStatus;
  const note = String(formData.get("note") ?? "") || undefined;

  await moderateComment({ commentId, actorId: user.id, status, note });
  revalidatePath("/admin/comments");
  revalidatePathFromForm(formData);
}
