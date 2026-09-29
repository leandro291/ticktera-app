"use client";

import { useSyncExternalStore } from "react";

interface PersistApi {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (fn: () => void) => () => void;
  };
}

/** True once a persisted store read its saved state from localStorage (always false on the server). */
export function useStoreHydrated(store: PersistApi): boolean {
  return useSyncExternalStore(
    (onChange) => store.persist.onFinishHydration(onChange),
    () => store.persist.hasHydrated(),
    () => false,
  );
}
