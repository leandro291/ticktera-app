import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistOptions } from "@/lib/persist";
import { ORGANIZER_EVENTS } from "../data/organizer-events";
import type { OrganizerEvent } from "../types/organizer-event";

interface OrganizerState {
  /** The organizer's events, newest first (saved in localStorage; starts with the mock data). */
  events: OrganizerEvent[];
  /** Inserts a new event on top or replaces the one with the same id. */
  saveEvent: (event: OrganizerEvent) => void;
}

export const useOrganizerStore = create<OrganizerState>()(
  persist(
    (set) => ({
      events: ORGANIZER_EVENTS,
      saveEvent: (event) =>
        set((state) =>
          state.events.some((e) => e.id === event.id)
            ? { events: state.events.map((e) => (e.id === event.id ? event : e)) }
            : { events: [event, ...state.events] },
        ),
    }),
    persistOptions<OrganizerState>("organizer"),
  ),
);
