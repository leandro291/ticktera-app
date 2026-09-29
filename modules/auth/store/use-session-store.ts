import { create } from "zustand";

export interface SessionUser {
  name: string;
  email: string;
}

interface SessionState {
  user: SessionUser | null;
  signIn: (user: SessionUser) => void;
  signOut: () => void;
}

// Mock session kept in memory: there is no backend yet.
export const useSessionStore = create<SessionState>()((set) => ({
  user: null,
  signIn: (user) => set({ user }),
  signOut: () => set({ user: null }),
}));
