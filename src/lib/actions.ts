import { ZodError } from "zod";

export type ActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
  token?: string;
};

export const idleState: ActionState = { status: "idle" };

const FRIENDLY_ERRORS: Record<string, string> = {
  UNAUTHENTICATED: "Please sign in to continue.",
  FORBIDDEN: "You do not have permission to do that.",
  NOT_FOUND: "We could not find what you were looking for.",
  EMAIL_IN_USE: "An account with that email already exists.",
  ACCOUNT_INACTIVE: "This account is not active. Contact support.",
  RATE_LIMITED: "You are posting too quickly. Try again in a few minutes.",
  EDIT_WINDOW_CLOSED: "The edit window for this comment has closed.",
  CLAIM_PENDING: "You already have a pending claim for this listing.",
  ALREADY_DECIDED: "This item has already been reviewed.",
  INVALID_TOKEN: "This link is invalid or has expired.",
  REQUEST_CLOSED: "This request is no longer accepting quotes.",
  NO_RECIPIENTS: "Select at least one provider to receive the request.",
  UNSUPPORTED_MEDIA_TYPE: "Only JPG, PNG, WEBP, AVIF or GIF images are supported.",
  FILE_TOO_LARGE: "Images must be 5MB or smaller.",
};

export function formToObject(formData: FormData): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    const current = data[key];
    if (current === undefined) {
      data[key] = value;
    } else if (Array.isArray(current)) {
      current.push(value);
    } else {
      data[key] = [current, value];
    }
  }
  return data;
}

export function errorState(error: unknown): ActionState {
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "_form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      status: "error",
      message: "Please check the highlighted fields and try again.",
      fieldErrors,
    };
  }
  if (error instanceof Error) {
    return {
      status: "error",
      message: FRIENDLY_ERRORS[error.message] ?? "Something went wrong. Please try again.",
    };
  }
  return { status: "error", message: "Something went wrong. Please try again." };
}

export function successState(message: string, extra?: Partial<ActionState>): ActionState {
  return { status: "success", message, ...extra };
}
