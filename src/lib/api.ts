import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import type { UserModel } from "@/generated/prisma/models";

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function created<T>(data: T): Response {
  return Response.json(data, { status: 201 });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export function fail(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  const body: ApiErrorBody = { error: { code, message, details } };
  return Response.json(body, { status });
}

export function pagination(url: URL, defaultPerPage = 12, maxPerPage = 48) {
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const perPageRaw = Number.parseInt(
    url.searchParams.get("perPage") ?? String(defaultPerPage),
    10,
  );
  const perPage = Math.min(maxPerPage, Math.max(1, perPageRaw || defaultPerPage));
  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

export async function parseJson<T>(request: NextRequest): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiException(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
}

export class ApiException extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiUser(): Promise<UserModel | null> {
  return getCurrentUser();
}

export async function requireApiUser(): Promise<UserModel> {
  const user = await getCurrentUser();
  if (!user) throw new ApiException(401, "UNAUTHENTICATED", "Sign in to continue.");
  return user;
}

export async function requireApiStaff(): Promise<UserModel> {
  const user = await requireApiUser();
  if (!isStaff(user)) {
    throw new ApiException(403, "FORBIDDEN", "Staff access required.");
  }
  return user;
}

export function handleApiError(error: unknown): Response {
  if (error instanceof ApiException) {
    return fail(error.status, error.code, error.message, error.details);
  }
  if (error instanceof ZodError) {
    return fail(422, "VALIDATION_ERROR", "The submitted data is invalid.", error.issues);
  }
  if (error instanceof Error) {
    if (error.message === "UNAUTHENTICATED") {
      return fail(401, "UNAUTHENTICATED", "Sign in to continue.");
    }
    if (error.message === "FORBIDDEN") {
      return fail(403, "FORBIDDEN", "You do not have permission to do that.");
    }
    if (error.message === "NOT_FOUND") {
      return fail(404, "NOT_FOUND", "The requested resource was not found.");
    }
  }
  console.error("[api] unhandled error", error);
  return fail(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}

export function withApi<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>,
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
