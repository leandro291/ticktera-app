import type { EventItemFor, EventListErrorCode, EventListScope } from "../types/event-list";

export class EventListError extends Error {
  constructor(
    public status: number,
    public code: EventListErrorCode,
  ) {
    super(`events request failed: ${status} ${code}`);
    this.name = "EventListError";
  }
}

export async function fetchEvents<S extends EventListScope>(
  scope: S,
  signal?: AbortSignal,
): Promise<EventItemFor<S>[]> {
  const res = await fetch(`/api/events?scope=${scope}`, { signal });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: EventListErrorCode } | null;
    throw new EventListError(res.status, body?.error ?? "internal");
  }
  const { items } = (await res.json()) as { items: EventItemFor<S>[] };
  return items;
}

/** 400/401/403 won't change on retry; anything else gets one retry (matches the provider's `retry: 1`). */
export function shouldRetryEvents(failureCount: number, error: unknown): boolean {
  if (error instanceof EventListError && [400, 401, 403].includes(error.status)) return false;
  return failureCount < 1;
}
