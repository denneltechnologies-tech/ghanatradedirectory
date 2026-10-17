import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { env } from "@/lib/env";

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
};

const CONTENT_TYPES_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function storageRoot(): string {
  return resolve(/*turbopackIgnore: true*/ process.cwd(), env.storageDir);
}

export type SavedMedia = {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
};

export async function saveImage(file: File): Promise<SavedMedia> {
  const extension = ALLOWED_IMAGE_TYPES[file.type];
  if (!extension) {
    throw new Error("UNSUPPORTED_MEDIA_TYPE");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const now = new Date();
  const folder = join(
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
  );
  const fileName = `${randomBytes(16).toString("hex")}${extension}`;
  const relativeKey = `${folder}/${fileName}`;
  const absoluteDir = join(/*turbopackIgnore: true*/ storageRoot(), folder);

  await mkdir(absoluteDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(/*turbopackIgnore: true*/ storageRoot(), relativeKey), buffer);

  return {
    storageKey: relativeKey.split(sep).join("/"),
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

export async function readMediaFile(
  key: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const safeKey = normalize(key).replace(/^(\.\.[/\\])+/, "");
  const root = storageRoot();
  const absolute = resolve(/*turbopackIgnore: true*/ root, safeKey);

  if (!absolute.startsWith(root + sep) && absolute !== root) return null;

  try {
    const buffer = await readFile(absolute);
    const contentType =
      CONTENT_TYPES_BY_EXT[extname(absolute).toLowerCase()] ?? "application/octet-stream";
    return { buffer, contentType };
  } catch {
    return null;
  }
}

export function mediaUrl(storageKey: string | null | undefined): string | null {
  if (!storageKey) return null;
  return `/api/v1/media/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}
