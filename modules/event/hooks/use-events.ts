"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { EventListError, fetchEvents, shouldRetryEvents } from "../services/event-list-client";
import type { EventItemFor, EventListScope } from "../types/event-list";

/** Private scopes key on the Clerk userId so a user switch in the same tab never reuses the previous cache (D12). */
export function useEvents<S extends EventListScope>(
  scope: S,
): UseQueryResult<EventItemFor<S>[], EventListError> {
  const { isLoaded, userId } = useAuth();
  const isPublic = scope === "published";
  return useQuery<EventItemFor<S>[], EventListError>({
    queryKey: ["events", scope, isPublic ? "public" : userId],
    queryFn: ({ signal }) => fetchEvents(scope, signal),
    enabled: isPublic || (isLoaded && !!userId),
    retry: shouldRetryEvents,
  });
}
