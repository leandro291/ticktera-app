"use client";

import { useEffect } from "react";
import { STORAGE_PREFIX } from "@/lib/persist";
import { useCartStore, useOrderStore } from "@/modules/purchase";

const STORES = [useCartStore, useOrderStore];

// D12: los borradores locales del organizador se abandonan (ahora viven en la BD). ponytail: quitar tras un release.
const LEGACY_KEYS = [`${STORAGE_PREFIX}organizer`];

/**
 * Loads every persisted store from localStorage after mount (so the server HTML and the first client render match)
 * and keeps open tabs in sync when another tab changes the data.
 */
export function PersistedStores() {
  useEffect(() => {
    try {
      for (const key of LEGACY_KEYS) localStorage.removeItem(key);
    } catch {
      // localStorage bloqueado: no hay nada que limpiar
    }
    for (const store of STORES) void store.persist.rehydrate();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith(STORAGE_PREFIX)) for (const store of STORES) void store.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
