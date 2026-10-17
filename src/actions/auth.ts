"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, destroySession } from "@/lib/auth";
import { errorState, formToObject, successState, type ActionState } from "@/lib/actions";
import {
  forgotPasswordSchema,
  loginSchema,
  profileUpdateSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation";
import {
  authenticate,
  deactivateAccount,
  registerUser,
  requestPasswordReset,
  resetPassword,
  updateOwnProfile,
} from "@/lib/services/auth-service";

function safeNext(value: unknown): string {
  const next = typeof value === "string" ? value : "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const next = safeNext(formData.get("next"));
  let input: { email: string; password: string };
  try {
    input = loginSchema.parse(formToObject(formData));
  } catch (error) {
    return errorState(error);
  }

  let user = null;
  try {
    user = await authenticate(input.email, input.password);
  } catch (error) {
    return errorState(error);
  }
  if (!user) return { status: "error", message: "Invalid email or password." };

  redirect(next);
}

export async function signUpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let input;
  try {
    input = registerSchema.parse(formToObject(formData));
  } catch (error) {
    return errorState(error);
  }

  let user;
  try {
    user = await registerUser(input);
  } catch (error) {
    return errorState(error);
  }

  if (user.role === "BUSINESS_OWNER") redirect("/dashboard/businesses/new");
  if (user.role === "LOGISTICS_PROVIDER") redirect("/dashboard/logistics");
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let input: { email: string };
  try {
    input = forgotPasswordSchema.parse(formToObject(formData));
  } catch (error) {
    return errorState(error);
  }

  const result = await requestPasswordReset(input.email);
  if (!result) {
    return successState(
      "If that email is registered, a reset link has been sent. Check your inbox.",
    );
  }

  const isDev = process.env.NODE_ENV !== "production";
  return successState(
    isDev
      ? "Reset link generated. In development the link is shown below."
      : "If that email is registered, a reset link has been sent. Check your inbox.",
    isDev ? { token: result.token } : undefined,
  );
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let input: { token: string; password: string };
  try {
    input = resetPasswordSchema.parse(formToObject(formData));
  } catch (error) {
    return errorState(error);
  }
  try {
    await resetPassword(input.token, input.password);
  } catch (error) {
    return errorState(error);
  }
  redirect("/login?reset=1");
}

export async function updateProfileAction(
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
    input = profileUpdateSchema.parse(formToObject(formData));
  } catch (error) {
    return errorState(error);
  }

  await updateOwnProfile(user.id, input);
  revalidatePath("/dashboard/profile");
  return successState("Profile updated.");
}

export async function deactivateAccountAction(): Promise<void> {
  const user = await requireUser();
  await deactivateAccount(user.id);
  redirect("/");
}
