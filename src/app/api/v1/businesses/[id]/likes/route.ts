import type { NextRequest } from "next/server";
import { ok, requireApiUser, withApi } from "@/lib/api";
import { getLikeState, toggleLike } from "@/lib/services/engagement";
import { trackEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export const POST = withApi(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireApiUser();
    const { id } = await params;

    const current = await getLikeState(id, user.id);
    if (current.liked) return ok(current);

    const state = await toggleLike(id, user.id);
    await trackEvent({ type: "LIKE", businessId: id, userId: user.id });
    return ok(state);
  },
);

export const DELETE = withApi(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireApiUser();
    const { id } = await params;

    const current = await getLikeState(id, user.id);
    if (!current.liked) return ok(current);

    const state = await toggleLike(id, user.id);
    return ok(state);
  },
);
