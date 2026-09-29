import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistOptions } from "@/lib/persist";

export interface SessionUser {
  name: string;
  email: string;
}

interface SessionState {
  user: SessionUser | null;
  signIn: (user: SessionUser) => void;
  signOut: () => void;
}

// Mock session saved in localStorage: there is no backend yet.
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      signIn: (user) => set({ user }),
      signOut: () => set({ user: null }),
    }),
    persistOptions<SessionState>("session"),
  ),
);
