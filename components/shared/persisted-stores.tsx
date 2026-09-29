"use client";

import { useEffect } from "react";
import { STORAGE_PREFIX } from "@/lib/persist";
import { useSessionStore } from "@/modules/auth";
import { useOrganizerStore } from "@/modules/organizer";
import { useCartStore, useOrderStore } from "@/modules/purchase";

const STORES = [useSessionStore, useCartStore, useOrderStore, useOrganizerStore];

/**
 * Loads every persisted store from localStorage after mount (so the server HTML and the first client render match)
 * and keeps open tabs in sync when another tab changes the data.
 */
export function PersistedStores() {
  useEffect(() => {
    for (const store of STORES) void store.persist.rehydrate();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith(STORAGE_PREFIX)) for (const store of STORES) void store.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
