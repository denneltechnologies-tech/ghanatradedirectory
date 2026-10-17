import type { NextRequest } from "next/server";
import { readMediaFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const media = await readMediaFile(key.join("/"));
  if (!media) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(media.buffer), {
    status: 200,
    headers: {
      "content-type": media.contentType,
      "content-length": String(media.buffer.byteLength),
      "cache-control": IMMUTABLE_CACHE,
      "content-security-policy": "default-src 'none'; sandbox",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function HEAD(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const media = await readMediaFile(key.join("/"));
  if (!media) return new Response(null, { status: 404 });

  return new Response(null, {
    status: 200,
    headers: {
      "content-type": media.contentType,
      "content-length": String(media.buffer.byteLength),
      "cache-control": IMMUTABLE_CACHE,
      "x-content-type-options": "nosniff",
    },
  });
}
