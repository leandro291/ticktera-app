import { EVENT_LIMITS } from "./event-limits";

export type CoverMime = "image/jpeg" | "image/png" | "image/webp";
type CoverExt = "jpg" | "png" | "webp";

// Sin SVG (vector de XSS) ni GIF (D14).
const EXT: Record<CoverMime, CoverExt> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Tipo real por magic bytes (basta con los primeros 12 bytes). */
export function sniffImageType(head: Uint8Array): CoverMime | null {
  const at = (offset: number, bytes: number[]) => bytes.every((b, i) => head[offset + i] === b);
  if (at(0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50])) return "image/webp"; // RIFF….WEBP
  return null;
}

export type CoverCheck =
  | { ok: true; mime: CoverMime; ext: CoverExt }
  | { ok: false; reason: "empty" | "too-large" | "unsupported-type" | "mime-mismatch" };

/** MIME declarado permitido, tamaño 1 B–2 MiB y magic bytes que coinciden con el MIME. */
export function validateCover(file: { size: number; type: string }, head: Uint8Array): CoverCheck {
  if (file.size === 0) return { ok: false, reason: "empty" };
  if (file.size > EVENT_LIMITS.coverMaxBytes) return { ok: false, reason: "too-large" };
  if (!Object.hasOwn(EXT, file.type)) return { ok: false, reason: "unsupported-type" };
  const mime = sniffImageType(head);
  if (mime !== file.type) return { ok: false, reason: "mime-mismatch" };
  return { ok: true, mime, ext: EXT[mime] };
}

export function coverPathname(eventId: string, ext: CoverExt, uuid: string): string {
  return `events/${eventId}/${uuid}.${ext}`;
}

/** Solo URLs https de un store público de Vercel Blob (las portadas del seed `/images/…` nunca se borran). */
export function isBlobUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}
