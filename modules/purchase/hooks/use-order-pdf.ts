"use client";

import { useState } from "react";
import { downloadOrderPdf } from "../lib/ticket-pdf";
import type { Order } from "../types/order";

/** "Descargar PDF": builds the tickets PDF on demand (jsPDF loads only on click). */
export function useOrderPdf(order: Order | null) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const download = async () => {
    if (!order || pending) return;
    setPending(true);
    setFailed(false);
    try {
      await downloadOrderPdf(order);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  return { download, pending, failed };
}
