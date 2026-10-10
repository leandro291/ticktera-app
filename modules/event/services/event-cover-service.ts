import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { env } from "@/lib/env";
import { coverPathname, isBlobUrl, validateCover } from "../lib/cover-image";
import { logEventAudit } from "./event-audit";
import { EventError } from "./event-error";

type Actor = { id: string };

const EDITABLE = ["draft", "published"] as const;

function blobToken(): string {
  // D15: sin token solo la portada falla (503); el resto del CRUD funciona.
  if (!env.BLOB_READ_WRITE_TOKEN) throw new EventError("storage-unavailable");
  return env.BLOB_READ_WRITE_TOKEN;
}

/** D15: borra una portada de Blob sin bloquear. Las del seed (`/images/…`) nunca se tocan. */
export async function deleteCoverBlob(url: string | null): Promise<void> {
  if (!isBlobUrl(url) || !env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(url!, { token: env.BLOB_READ_WRITE_TOKEN });
  } catch (error) {
    // ponytail: puede quedar huérfana; barrido periódico si el costo de storage importa
    console.error("event cover: blob delete failed", error);
  }
}

/** Evento propio y editable; ajeno o inexistente → not-found, cancelled/suspended → not-editable (409). */
async function findOwnEditable(actor: Actor, id: string): Promise<{ coverImageUrl: string | null }> {
  const [event] = await db
    .select({ status: events.status, coverImageUrl: events.coverImageUrl })
    .from(events)
    .where(and(eq(events.id, id), eq(events.organizerId, actor.id)))
    .limit(1);
  if (!event) throw new EventError("not-found");
  if (event.status !== "draft" && event.status !== "published") throw new EventError("not-editable");
  return event;
}

/** Guarda la URL con la propiedad y el estado en el WHERE; false si el evento cambió o se borró mientras tanto. */
async function writeCoverUrl(actor: Actor, id: string, url: string | null): Promise<boolean> {
  const rows = await db
    .update(events)
    .set({ coverImageUrl: url })
    .where(and(eq(events.id, id), eq(events.organizerId, actor.id), inArray(events.status, [...EDITABLE])))
    .returning({ id: events.id });
  return rows.length > 0;
}

/** U4/D13–D15: valida, sube a Blob (nombre aleatorio, público), guarda solo la URL y borra la anterior. */
export async function setEventCover(actor: Actor, id: string, file: File): Promise<{ coverImageUrl: string }> {
  const token = blobToken();
  const check = validateCover(file, new Uint8Array(await file.slice(0, 12).arrayBuffer()));
  if (!check.ok) throw new EventError("invalid-image");
  const previous = await findOwnEditable(actor, id);

  let url: string;
  try {
    ({ url } = await put(coverPathname(id, check.ext, randomUUID()), file, {
      access: "public",
      addRandomSuffix: true,
      contentType: check.mime,
      token,
    }));
  } catch (error) {
    console.error("event cover: blob put failed", error);
    throw new EventError("storage-failed");
  }

  if (!(await writeCoverUrl(actor, id, url))) {
    await deleteCoverBlob(url);
    throw new EventError("not-found");
  }
  // ponytail: última escritura gana (D8); dos subidas simultáneas pueden dejar una huérfana.
  if (previous.coverImageUrl !== url) await deleteCoverBlob(previous.coverImageUrl);
  logEventAudit({ action: "cover-set", eventId: id, actorId: actor.id });
  return { coverImageUrl: url };
}

export async function removeEventCover(actor: Actor, id: string): Promise<void> {
  blobToken();
  const previous = await findOwnEditable(actor, id);
  if (!(await writeCoverUrl(actor, id, null))) throw new EventError("not-found");
  await deleteCoverBlob(previous.coverImageUrl);
  logEventAudit({ action: "cover-remove", eventId: id, actorId: actor.id });
}
