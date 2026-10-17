"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function LikeButton({
  businessId,
  initialCount,
  initialLiked,
  isAuthenticated,
  path,
}: {
  businessId: string;
  initialCount: number;
  initialLiked: boolean;
  isAuthenticated: boolean;
  path: string;
}) {
  const router = useRouter();
  const [state, setState] = useState({ count: initialCount, liked: initialLiked });
  const [pending, startTransition] = useTransition();

  async function toggle() {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(path)}`);
      return;
    }

    const optimistic = {
      liked: !state.liked,
      count: state.count + (state.liked ? -1 : 1),
    };
    setState(optimistic);

    try {
      const response = await fetch(`/api/v1/businesses/${businessId}/likes`, {
        method: state.liked ? "DELETE" : "POST",
      });
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as { count: number; liked: boolean };
      setState({ count: data.count, liked: data.liked });
      startTransition(() => router.refresh());
    } catch {
      setState({ count: initialCount, liked: initialLiked });
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={state.liked}
      className={`btn-secondary btn-sm ${state.liked ? "border-brand-300 text-brand-700" : ""}`}
    >
      <span aria-hidden>{state.liked ? "❤" : "🤍"}</span>
      {state.count} {state.count === 1 ? "like" : "likes"}
    </button>
  );
}
