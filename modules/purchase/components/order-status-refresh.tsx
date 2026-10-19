"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircleIcon } from "lucide-react";

const INTERVAL_MS = 2000;
const MAX_REFRESHES = 15; // D13: cada 2 s hasta 30 s

/** D13: mientras la orden sigue `pending`, pide al servidor releerla de la BD; nunca decide el estado del pago. */
export function OrderStatusRefresh() {
  const router = useRouter();
  const [stopped, setStopped] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    let count = 0;
    const id = setInterval(() => {
      router.refresh();
      if (++count >= MAX_REFRESHES) {
        clearInterval(id);
        setStopped(true);
      }
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [router, round]);

  const retry = () => {
    setStopped(false);
    setRound((r) => r + 1);
  };

  return (
    <div role="status" className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
      {stopped ? (
        <>
          <h1 className="text-xl font-semibold">Tu pago sigue en proceso</h1>
          <p className="text-[15px] text-muted-foreground">
            Está tardando más de lo normal. Si ya pagaste, no vuelvas a pagar: actualiza en unos instantes. Si cancelaste el pago, puedes volver a intentarlo desde el evento.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={retry}
              className="flex h-12 items-center rounded-[14px] border-[1.5px] border-input bg-background px-6 text-[15px] font-medium hover:border-foreground"
            >
              Actualizar
            </button>
            <Link href="/events" className="flex h-12 items-center px-4 text-[15px] font-semibold text-primary hover:underline">
              Explorar eventos
            </Link>
          </div>
        </>
      ) : (
        <>
          <LoaderCircleIcon className="size-8 animate-spin text-primary" aria-hidden />
          <h1 className="text-xl font-semibold">Confirmando tu pago…</h1>
          <p className="text-[15px] text-muted-foreground">Esto toma unos segundos. No cierres esta página.</p>
        </>
      )}
    </div>
  );
}
