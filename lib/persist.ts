import { createJSONStorage, type PersistOptions, type StateStorage } from "zustand/middleware";

/**
 * localStorage that never throws: private mode, blocked site data or a full quota just leave the store in memory.
 */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // Quota exceeded or storage blocked: keep working in memory.
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

export const STORAGE_PREFIX = "ticketera:";

/**
 * Shared `persist` options. Hydration is skipped at creation so server and first client render match;
 * `<PersistedStores />` rehydrates every store after mount.
 */
export function persistOptions<S, P = S>(name: string, extra: Omit<PersistOptions<S, P>, "name" | "storage" | "skipHydration"> = {}): PersistOptions<S, P> {
  return {
    name: `${STORAGE_PREFIX}${name}`,
    storage: createJSONStorage(() => safeLocalStorage),
    skipHydration: true,
    version: 1,
    ...extra,
  };
}
